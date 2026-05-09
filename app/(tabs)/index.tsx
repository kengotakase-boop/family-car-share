import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Reservation = {
  id: string;
  carName: string;
  userName: string;
  date: string;
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
  comment: string;
};

type FamilyMember = {
  id: string;
  name: string;
  email: string;
};

const FAMILY_MEMBERS_KEY = "familyMembers";
const NOTIFICATION_ENABLED_KEY = "notificationEnabled";

// メール通知を送信(サーバー経由)
const sendEmailNotification = async (
  subject: string,
  body: string,
  recipients: string[]
) => {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    if (enabled !== "true") {
      console.log("メール通知が無効です");
      return;
    }

    const validRecipients = recipients.filter((email) => email && email.includes("@"));
    if (validRecipients.length === 0) {
      console.log("有効なメールアドレスがありません");
      return;
    }

    // サーバーにメール送信をリクエスト
    // APIサーバーのURLを動的に構築
    // 例: 8081-xxxx.sg1.manus.computer → 3000-xxxx.sg1.manus.computer
    let apiBase: string;
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      // ポート番号付きのホスト名を3000に変換（例: 8081-xxx → 3000-xxx）
      const apiHostname = hostname.replace(/^\d+-/, "3000-");
      apiBase = `${window.location.protocol}//${apiHostname}/api/email/send`;
    } else {
      apiBase = "http://127.0.0.1:3000/api/email/send";
    }
    const response = await fetch(apiBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: validRecipients,
        subject,
        text: body,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`[メール] 送信成功: ${validRecipients.join(", ")}`);
    } else {
      console.warn(`[メール] ${result.message}`);
      if (result.preview) {
        console.log(`[メール] 件名: ${result.preview.subject}`);
        console.log(`[メール] 本文: ${result.preview.text}`);
        console.log(`[メール] 送信先: ${result.preview.to.join(", ")}`);
      }
    }
  } catch (error) {
    console.warn("メール通知エラー:", error);
  }
};

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // フォーム入力
  const [carName, setCarName] = useState("レクサス");
  const [userName, setUserName] = useState("");
  const [date, setDate] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [comment, setComment] = useState("");

  // 予約データと家族メンバーを読み込み
  useEffect(() => {
    loadFamilyMembers();
    loadReservations();
    loadNotificationSettings();
  }, []);

  // 予約リマインダーをチェック
  useEffect(() => {
    if (reservations.length === 0) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const tomorrowReservations = reservations.filter((r) => r.date === tomorrowStr);

    if (tomorrowReservations.length > 0) {
      const messages = tomorrowReservations.map((r) => {
        const timeInfo = r.isAllDay ? "終日" : `${r.startTime}-${r.endTime}`;
        return `・${r.carName} - ${r.userName} (${timeInfo})`;
      });

      Alert.alert(
        "🔔 明日の予約があります",
        `明日 ${tomorrowStr} の予約:\n\n${messages.join("\n")}`,
        [{ text: "OK" }]
      );
    }
  }, [reservations]);

  const loadNotificationSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
      setNotificationEnabled(enabled !== "false");
    } catch (error) {
      console.error("通知設定の読み込みエラー:", error);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, notificationEnabled.toString());
      Alert.alert("成功", "通知設定を保存しました");
    } catch (error) {
      console.error("通知設定の保存エラー:", error);
      Alert.alert("エラー", "設定の保存に失敗しました");
    }
  };

  const loadFamilyMembers = async () => {
    try {
      const data = await AsyncStorage.getItem(FAMILY_MEMBERS_KEY);
      const correctMembers: FamilyMember[] = [
        { id: "1", name: "健吾", email: "kengotakase@gmail.com" },
        { id: "2", name: "まどか", email: "madokatakase47@gmail.com" },
        { id: "3", name: "健一郎", email: "kenichiroutakase@gmail.com" },
        { id: "4", name: "英太郎", email: "eitarotakase88@gmail.com" },
        { id: "5", name: "光太郎", email: "koutarou080526@gmail.com" },
      ];

      if (data) {
        const existingMembers = JSON.parse(data);
        // 古いデータ（お父さん、お母さんなど）を検出
        const hasOldData = existingMembers.some(
          (m: FamilyMember) => m.name === "お父さん" || m.name === "お母さん" || existingMembers.length !== 5
        );

        if (hasOldData) {
          // 古いデータを新しいデータで置き換え
          console.log("古い家族メンバーデータを更新します");
          await AsyncStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(correctMembers));
          setFamilyMembers(correctMembers);
        } else {
          setFamilyMembers(existingMembers);
        }
      } else {
        // 初期メンバーを作成
        await AsyncStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(correctMembers));
        setFamilyMembers(correctMembers);
      }
    } catch (error) {
      console.error("家族メンバーの読み込みエラー:", error);
    }
  };

  const saveFamilyMembers = async (members: FamilyMember[]) => {
    try {
      await AsyncStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(members));
      setFamilyMembers(members);
      Alert.alert("成功", "メールアドレスを保存しました");
      setSettingsModalVisible(false);
    } catch (error) {
      console.error("家族メンバーの保存エラー:", error);
      Alert.alert("エラー", "保存に失敗しました");
    }
  };

  const loadReservations = async () => {
    try {
      const data = await AsyncStorage.getItem("reservations");
      if (data) {
        const existingReservations: Reservation[] = JSON.parse(data);
        
        // 既存の予約データを修正（startTime/endTimeが未設定の場合）
        const fixedReservations = existingReservations.map((res) => {
          if (!res.isAllDay && (!res.startTime || !res.endTime)) {
            return {
              ...res,
              startTime: "09:00",
              endTime: "17:00",
            };
          }
          return res;
        });
        
        // 修正したデータを保存
        if (JSON.stringify(existingReservations) !== JSON.stringify(fixedReservations)) {
          console.log("予約データを修正しました");
          await AsyncStorage.setItem("reservations", JSON.stringify(fixedReservations));
        }
        
        setReservations(fixedReservations);
      } else {
        // 初期データを作成
        const initialData: Reservation[] = [
          {
            id: "1",
            carName: "レクサス",
            userName: "健吾",
            date: "2026-02-05",
            isAllDay: true,
            comment: "出張",
          },
          {
            id: "2",
            carName: "アルファード",
            userName: "まどか",
            date: "2026-02-07",
            isAllDay: false,
            startTime: "14:00",
            endTime: "18:00",
            comment: "買い物",
          },
        ];
        await AsyncStorage.setItem("reservations", JSON.stringify(initialData));
        setReservations(initialData);
      }
    } catch (error) {
      console.error("予約データの読み込みエラー:", error);
    }
  };

  const openAddModal = () => {
    setEditingReservation(null);
    setCarName("レクサス");
    setUserName(familyMembers.length > 0 ? familyMembers[0].name : "");
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    setDate(dateStr);
    setIsAllDay(true);
    setStartTime("09:00");
    setEndTime("17:00");
    setComment("");
    setModalVisible(true);
  };

  const openEditModal = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setCarName(reservation.carName);
    setUserName(reservation.userName);
    setDate(reservation.date);
    setIsAllDay(reservation.isAllDay);
    setStartTime(reservation.startTime || "09:00");
    setEndTime(reservation.endTime || "17:00");
    setComment(reservation.comment);
    setModalVisible(true);
  };

  const saveReservation = async () => {
    if (!userName.trim()) {
      Alert.alert("エラー", "名前を選択してください");
      return;
    }
    if (!date.trim()) {
      Alert.alert("エラー", "日付を入力してください");
      return;
    }
    if (!isAllDay && (!startTime || !endTime)) {
      Alert.alert("エラー", "開始時刻と終了時刻を入力してください");
      return;
    }

    // 予約の競合チェック
    const conflictingReservation = reservations.find((r) => {
      // 編集中の予約はスキップ
      if (editingReservation && r.id === editingReservation.id) {
        return false;
      }
      // 同じ車両、同じ日付
      if (r.carName === carName && r.date === date) {
        // 終日の場合は競合
        if (isAllDay || r.isAllDay) {
          return true;
        }
        // 時間指定の場合は時間が重なっているかチェック
        const newStart = startTime || "00:00";
        const newEnd = endTime || "23:59";
        const existingStart = r.startTime || "00:00";
        const existingEnd = r.endTime || "23:59";
        
        // 時間の重なりをチェック
        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          return true;
        }
      }
      return false;
    });

    if (conflictingReservation) {
      const timeInfo = conflictingReservation.isAllDay
        ? "終日"
        : `${conflictingReservation.startTime}-${conflictingReservation.endTime}`;
      Alert.alert(
        "予約の競合",
        `この時間帯はすでに予約されています。\n\n車両: ${conflictingReservation.carName}\n予約者: ${conflictingReservation.userName}\n日時: ${conflictingReservation.date} ${timeInfo}`
      );
      return;
    }

    let updated: Reservation[];
    let emailSubject = "";
    let emailBody = "";

    const timeInfo = isAllDay ? "終日" : `${startTime}-${endTime}`;

    if (editingReservation) {
      // 編集
      updated = reservations.map((r) =>
        r.id === editingReservation.id
          ? {
              ...r,
              carName,
              userName,
              date,
              isAllDay,
              startTime: isAllDay ? undefined : startTime,
              endTime: isAllDay ? undefined : endTime,
              comment,
            }
          : r
      );
      emailSubject = `【予約変更】${carName} - ${date}`;
      emailBody = `予約が変更されました。\n\n車両: ${carName}\n予約者: ${userName}\n日時: ${date} ${timeInfo}\nコメント: ${comment}`;
    } else {
      // 新規追加
      const newReservation: Reservation = {
        id: Date.now().toString(),
        carName,
        userName,
        date,
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        comment,
      };
      updated = [...reservations, newReservation];
      emailSubject = `【新規予約】${carName} - ${date}`;
      emailBody = `新しい予約が追加されました。\n\n車両: ${carName}\n予約者: ${userName}\n日時: ${date} ${timeInfo}\nコメント: ${comment}`;
    }

    setReservations(updated);
    await AsyncStorage.setItem("reservations", JSON.stringify(updated));
    setModalVisible(false);

    Alert.alert("成功", editingReservation ? "予約を更新しました" : "予約を登録しました");

    // メール通知は予約保存の成否から切り離す
    const emails = familyMembers.map((m) => m.email).filter((e) => e);
    void sendEmailNotification(emailSubject, emailBody, emails).catch((error) => {
      console.warn("メール通知に失敗しましたが、予約保存は完了しています:", error);
    });
  };

  const deleteReservation = async (id: string) => {
    const reservation = reservations.find((r) => r.id === id);
    if (!reservation) return;

    Alert.alert("確認", "この予約を削除しますか?", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          const updated = reservations.filter((r) => r.id !== id);
          setReservations(updated);
          await AsyncStorage.setItem("reservations", JSON.stringify(updated));

          // メール通知を送信
          const timeInfo = reservation.isAllDay
            ? "終日"
            : `${reservation.startTime}-${reservation.endTime}`;
          const emailSubject = `【予約削除】${reservation.carName} - ${reservation.date}`;
          const emailBody = `予約が削除されました。\n\n車両: ${reservation.carName}\n予約者: ${reservation.userName}\n日時: ${reservation.date} ${timeInfo}\nコメント: ${reservation.comment}`;
          const emails = familyMembers.map((m) => m.email).filter((e) => e);
          await sendEmailNotification(emailSubject, emailBody, emails);
        },
      },
    ]);
  };

  const formatTimeDisplay = (reservation: Reservation) => {
    if (reservation.isAllDay) {
      return "終日";
    }
    return `${reservation.startTime} - ${reservation.endTime}`;
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // カレンダー用のデータ生成
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: Array<Array<{ date: number; isCurrentMonth: boolean }>> = [];
    let week: Array<{ date: number; isCurrentMonth: boolean }> = [];

    // 前月の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      week.push({ date: 0, isCurrentMonth: false });
    }

    // 当月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      week.push({ date: i, isCurrentMonth: true });
      if (week.length === 7) {
        days.push(week);
        week = [];
      }
    }

    // 最後の週を埋める
    while (week.length > 0 && week.length < 7) {
      week.push({ date: 0, isCurrentMonth: false });
    }
    if (week.length > 0) {
      days.push(week);
    }

    return days;
  };

  const getReservationsForDate = (dateStr: string) => {
    return reservations.filter((r) => r.date === dateStr);
  };

  const monthName = currentDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  const calendarDays = generateCalendarDays();
  const today = new Date().getDate();

  return (
    <ScreenContainer className="flex-1">
      <ScrollView className="flex-1 p-4">
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground">{monthName}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="bg-surface px-3 py-2 rounded-full border border-border"
              onPress={() => setSettingsModalVisible(true)}
            >
              <Text className="text-foreground text-sm">⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-primary px-4 py-2 rounded-full"
              onPress={openAddModal}
            >
              <Text className="text-background font-semibold">+ 予約追加</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 表示切り替えボタン */}
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={() => setViewMode("list")}
            className={`flex-1 py-2 rounded-lg border ${
              viewMode === "list" ? "bg-primary border-primary" : "bg-surface border-border"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                viewMode === "list" ? "text-background" : "text-foreground"
              }`}
            >
              リスト表示
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("calendar")}
            className={`flex-1 py-2 rounded-lg border ${
              viewMode === "calendar" ? "bg-primary border-primary" : "bg-surface border-border"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                viewMode === "calendar" ? "text-background" : "text-foreground"
              }`}
            >
              カレンダー表示
            </Text>
          </TouchableOpacity>
        </View>

        {/* カレンダー表示 */}
        {viewMode === "calendar" && (
          <View className="mb-6">
            {/* 月切り替え */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={() => changeMonth(-1)}
                className="bg-surface px-4 py-2 rounded-lg border border-border"
              >
                <Text className="text-foreground font-semibold">← 前月</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => changeMonth(1)}
                className="bg-surface px-4 py-2 rounded-lg border border-border"
              >
                <Text className="text-foreground font-semibold">次月 →</Text>
              </TouchableOpacity>
            </View>

            {/* 曜日ヘッダー */}
            <View className="flex-row mb-2">
              {weekDays.map((day, index) => (
                <View key={index} className="flex-1 items-center">
                  <Text
                    className={`font-semibold ${
                      index === 0 ? "text-error" : index === 6 ? "text-primary" : "text-muted"
                    }`}
                  >
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* カレンダーグリッド */}
            <View>
              {calendarDays.map((week, weekIndex) => (
                <View key={weekIndex} className="flex-row">
                  {week.map((day, dayIndex) => {
                    const dateStr = day.isCurrentMonth
                      ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`
                      : "";
                    const dayReservations = dateStr ? getReservationsForDate(dateStr) : [];
                    const hasReservation = dayReservations.length > 0;

                    return (
                      <View
                        key={dayIndex}
                        className="border border-border"
                        style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
                      >
                        {day.isCurrentMonth && (
                          <View className="flex-1 p-1">
                            <Text
                              className={`text-xs ${
                                dayIndex === 0
                                  ? "text-error"
                                  : dayIndex === 6
                                    ? "text-primary"
                                    : "text-foreground"
                              }`}
                            >
                              {day.date}
                            </Text>
                        {hasReservation && (
                          <View className="mt-1">
                            {dayReservations.slice(0, 2).map((res) => (
                              <View
                                key={res.id}
                                className={`px-1 py-0.5 rounded mb-0.5 ${
                                  res.carName === "レクサス" ? "bg-primary" : "bg-success"
                                }`}
                              >
                                <Text className="text-background text-xs" numberOfLines={1}>
                                  {res.userName}
                                </Text>
                              </View>
                            ))}
                            {dayReservations.length > 2 && (
                              <Text className="text-muted text-xs">+{dayReservations.length - 2}</Text>
                            )}
                          </View>
                        )}
                      </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* リスト表示 */}
        {viewMode === "list" && (
          <View className="gap-4">
            {reservations.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-muted text-center">予約がありません</Text>
                <Text className="text-muted text-center mt-2">
                  右上の「+ 予約追加」ボタンから予約を作成できます
                </Text>
              </View>
            ) : (
              reservations.map((reservation) => (
                <View
                  key={reservation.id}
                  style={styles.reservationCard}
                >
                  <View style={styles.reservationHeader}>
                    <Text style={styles.carNameText}>
                      {reservation.carName}
                    </Text>
                    <Pressable
                      onPress={() => deleteReservation(reservation.id)}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                      ]}
                    >
                      <Text style={styles.deleteButtonText}>削除</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => openEditModal(reservation)}
                    style={({ pressed }) => [
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text className="text-muted mb-1">
                      {reservation.userName} • {reservation.date}
                    </Text>
                    <Text className="text-muted mb-1">{formatTimeDisplay(reservation)}</Text>
                    {reservation.comment && (
                      <Text className="text-foreground mt-2">{reservation.comment}</Text>
                    )}
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* 説明 */}
        <View className="mt-8 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-foreground font-semibold mb-2">使い方</Text>
          <Text className="text-muted text-sm">
            • 予約をタップして編集{"\n"}
            • 「+ 予約追加」で新しい予約を作成{"\n"}
            • 「削除」ボタンで予約を削除{"\n"}
            • ⚙️ボタンでメール通知を設定{"\n"}
            • カレンダー表示で月間予約状況を確認
          </Text>
        </View>
      </ScrollView>

      {/* 予約追加・編集モーダル */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            className="bg-background rounded-t-3xl p-6"
            style={{
              minHeight: Platform.OS === "web" ? 600 : "auto",
              maxHeight: Platform.OS === "web" ? "85%" : "90%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-2xl font-bold text-foreground mb-6">
                {editingReservation ? "予約を編集" : "予約を追加"}
              </Text>

              {/* 車両選択 */}
              <Text className="text-foreground font-semibold mb-2">車両</Text>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => setCarName("レクサス")}
                  className={`flex-1 py-3 rounded-lg border ${
                    carName === "レクサス"
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      carName === "レクサス" ? "text-background" : "text-foreground"
                    }`}
                  >
                    レクサス
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCarName("アルファード")}
                  className={`flex-1 py-3 rounded-lg border ${
                    carName === "アルファード"
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      carName === "アルファード" ? "text-background" : "text-foreground"
                    }`}
                  >
                    アルファード
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 家族メンバー選択 */}
              <Text className="text-foreground font-semibold mb-2">名前</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {familyMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    onPress={() => setUserName(member.name)}
                    className={`px-4 py-2 rounded-lg border ${
                      userName === member.name
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        userName === member.name ? "text-background" : "text-foreground"
                      }`}
                    >
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 日付選択 */}
              <Text className="text-foreground font-semibold mb-2">日付</Text>
              <TouchableOpacity
                onPress={() => setDatePickerVisible(true)}
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-4"
              >
                <Text className="text-foreground">
                  {date || "日付を選択"}
                </Text>
              </TouchableOpacity>

              {/* 終日/時間指定切り替え */}
              <Text className="text-foreground font-semibold mb-2">時間</Text>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => setIsAllDay(true)}
                  className={`flex-1 py-3 rounded-lg border ${
                    isAllDay ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      isAllDay ? "text-background" : "text-foreground"
                    }`}
                  >
                    終日
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsAllDay(false)}
                  className={`flex-1 py-3 rounded-lg border ${
                    !isAllDay ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      !isAllDay ? "text-background" : "text-foreground"
                    }`}
                  >
                    時間指定
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 時間指定入力 */}
              {!isAllDay && (
                <View className="mb-4">
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold mb-2">開始時刻</Text>
                      <TextInput
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="09:00"
                        placeholderTextColor="#9BA1A6"
                        className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold mb-2">終了時刻</Text>
                      <TextInput
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholder="17:00"
                        placeholderTextColor="#9BA1A6"
                        className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* コメント入力 */}
              <Text className="text-foreground font-semibold mb-2">コメント</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="例: 出張、買い物など"
                placeholderTextColor="#9BA1A6"
                multiline
                numberOfLines={3}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground mb-6"
                style={{ textAlignVertical: "top" }}
              />

              {/* ボタン */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="flex-1 py-3 rounded-lg bg-surface border border-border"
                >
                  <Text className="text-center font-semibold text-foreground">
                    キャンセル
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveReservation}
                  className="flex-1 py-3 rounded-lg bg-primary"
                >
                  <Text className="text-center font-semibold text-background">保存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 日付選択モーダル */}
      <Modal
        visible={datePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            className="bg-background rounded-t-3xl p-6"
            style={{
              minHeight: Platform.OS === "web" ? 500 : "auto",
              maxHeight: Platform.OS === "web" ? "80%" : "85%",
            }}
          >
            <Text className="text-2xl font-bold text-foreground mb-6">日付を選択</Text>

            {/* 月選択 */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={() => changeMonth(-1)}
                className="bg-surface px-4 py-2 rounded-lg border border-border"
              >
                <Text className="text-foreground font-semibold">← 前月</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-foreground">{monthName}</Text>
              <TouchableOpacity
                onPress={() => changeMonth(1)}
                className="bg-surface px-4 py-2 rounded-lg border border-border"
              >
                <Text className="text-foreground font-semibold">次月 →</Text>
              </TouchableOpacity>
            </View>

            {/* 曜日ヘッダー */}
            <View className="flex-row mb-2">
              {weekDays.map((day, index) => (
                <View key={index} className="flex-1 items-center">
                  <Text
                    className={`font-semibold ${
                      index === 0 ? "text-error" : index === 6 ? "text-primary" : "text-muted"
                    }`}
                  >
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* カレンダーグリッド */}
            <View className="mb-6">
              {calendarDays.map((week, weekIndex) => (
                <View key={weekIndex} className="flex-row">
                  {week.map((day, dayIndex) => {
                    const isToday = day.isCurrentMonth && day.date === today;
                    const dateStr = day.isCurrentMonth
                      ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`
                      : "";

                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        onPress={() => {
                          if (day.isCurrentMonth) {
                            setDate(dateStr);
                            setDatePickerVisible(false);
                          }
                        }}
                        disabled={!day.isCurrentMonth}
                        className={`flex-1 aspect-square items-center justify-center m-0.5 rounded-lg ${
                          !day.isCurrentMonth
                            ? "bg-transparent"
                            : isToday
                            ? "bg-primary"
                            : "bg-surface border border-border"
                        }`}
                      >
                        {day.isCurrentMonth && (
                          <Text
                            className={`text-sm font-semibold ${
                              isToday ? "text-background" : "text-foreground"
                            }`}
                          >
                            {day.date}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* 閉じるボタン */}
            <TouchableOpacity
              onPress={() => setDatePickerVisible(false)}
              className="bg-border py-3 rounded-full"
            >
              <Text className="text-center text-foreground font-semibold">キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* メール通知設定モーダル */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            className="bg-background rounded-t-3xl p-6"
            style={{
              minHeight: Platform.OS === "web" ? 500 : "auto",
              maxHeight: Platform.OS === "web" ? "80%" : "85%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-2xl font-bold text-foreground mb-6">メール通知設定</Text>

              {/* 通知ON/OFF */}
              <View className="flex-row items-center justify-between mb-6 p-4 bg-surface rounded-lg">
                <Text className="text-foreground font-semibold">メール通知</Text>
                <TouchableOpacity
                  onPress={() => setNotificationEnabled(!notificationEnabled)}
                  className={`px-4 py-2 rounded-lg ${
                    notificationEnabled ? "bg-primary" : "bg-border"
                  }`}
                >
                  <Text className="text-background font-semibold">
                    {notificationEnabled ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 家族メンバーのメールアドレス */}
              <Text className="text-foreground font-semibold mb-3">
                家族メンバーのメールアドレス
              </Text>
              {familyMembers.map((member, index) => (
                <View key={member.id} className="mb-4">
                  <Text className="text-muted mb-1">{member.name}</Text>
                  <TextInput
                    value={member.email}
                    onChangeText={(text: string) => {
                      const updated = [...familyMembers];
                      updated[index].email = text;
                      setFamilyMembers(updated);
                    }}
                    placeholder="example@email.com"
                    placeholderTextColor="#9BA1A6"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  />
                </View>
              ))}

              <View className="bg-surface rounded-lg p-4 mb-6">
                <Text className="text-foreground font-semibold mb-2">メール通知について</Text>
                <Text className="text-muted text-sm">
                  • 予約の追加・編集・削除時に登録されたメールアドレスに通知が届きます{"\n"}
                  • メールアドレスが未登録の場合は通知されません{"\n"}
                  • 通知をOFFにすると全てのメール通知が停止します
                </Text>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setSettingsModalVisible(false)}
                  className="flex-1 py-3 rounded-lg bg-surface border border-border"
                >
                  <Text className="text-center font-semibold text-foreground">
                    キャンセル
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await saveFamilyMembers(familyMembers);
                    await saveNotificationSettings();
                  }}
                  className="flex-1 py-3 rounded-lg bg-primary"
                >
                  <Text className="text-center font-semibold text-background">保存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  reservationCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  carNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
