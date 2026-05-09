import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

type Reservation = {
  id: string;
  carName: string;
  userName: string;
  date: string;
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
  comment?: string;
};

const RESERVATIONS_KEY = "reservations";

const MEMBER_COLORS: Record<string, string> = {
  健吾: "#0a7ea4",
  まどか: "#e91e8c",
  健一郎: "#22C55E",
  英太郎: "#F59E0B",
  光太郎: "#8B5CF6",
};

const CAR_COLORS: Record<string, string> = {
  レクサス: "#0a7ea4",
  アルファード: "#F59E0B",
};

export default function StatsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [])
  );

  const loadReservations = async () => {
    try {
      const data = await AsyncStorage.getItem(RESERVATIONS_KEY);
      if (data) {
        setReservations(JSON.parse(data));
      }
    } catch (error) {
      console.error("予約データの読み込みエラー:", error);
    }
  };

  // 家族メンバーごとの予約数を集計
  const memberStats = () => {
    const stats: Record<string, number> = {};
    reservations.forEach((r) => {
      stats[r.userName] = (stats[r.userName] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  // 車両ごとの予約数を集計
  const carStats = () => {
    const stats: Record<string, number> = {};
    reservations.forEach((r) => {
      stats[r.carName] = (stats[r.carName] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  // 月ごとの予約数を集計（直近6ヶ月）
  const monthlyStats = () => {
    const stats: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      stats[key] = 0;
    }
    reservations.forEach((r) => {
      const month = r.date.substring(0, 7).replace("-", "/");
      if (month in stats) {
        stats[month] = (stats[month] || 0) + 1;
      }
    });
    return Object.entries(stats);
  };

  const totalReservations = reservations.length;
  const memberData = memberStats();
  const carData = carStats();
  const monthData = monthlyStats();
  const maxMonthCount = Math.max(...monthData.map(([, count]) => count), 1);

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-4">
        {/* ヘッダー */}
        <Text className="text-2xl font-bold text-foreground mb-6">利用統計</Text>

        {totalReservations === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-muted text-center text-lg">まだ予約がありません</Text>
            <Text className="text-muted text-center text-sm mt-2">
              予約を追加すると統計が表示されます
            </Text>
          </View>
        ) : (
          <>
            {/* 合計 */}
            <View className="bg-primary rounded-xl p-5 mb-6">
              <Text className="text-background text-sm font-semibold mb-1">総予約数</Text>
              <Text className="text-background text-4xl font-bold">{totalReservations}</Text>
              <Text className="text-background/70 text-sm mt-1">件の予約が登録されています</Text>
            </View>

            {/* 月別グラフ */}
            <View className="bg-surface rounded-xl border border-border p-4 mb-6">
              <Text className="text-foreground font-bold text-lg mb-4">月別予約数（直近6ヶ月）</Text>
              <View className="gap-3">
                {monthData.map(([month, count]) => (
                  <View key={month} className="flex-row items-center gap-2">
                    <Text className="text-muted text-xs w-14">{month.substring(5)}月</Text>
                    <View className="flex-1 bg-border rounded-full h-6 overflow-hidden">
                      <View
                        className="bg-primary h-6 rounded-full justify-center"
                        style={{ width: `${(count / maxMonthCount) * 100}%`, minWidth: count > 0 ? 24 : 0 }}
                      >
                        {count > 0 && (
                          <Text className="text-background text-xs font-bold text-center">{count}</Text>
                        )}
                      </View>
                    </View>
                    {count === 0 && (
                      <Text className="text-muted text-xs w-4">0</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* メンバー別 */}
            <View className="bg-surface rounded-xl border border-border p-4 mb-6">
              <Text className="text-foreground font-bold text-lg mb-4">メンバー別利用回数</Text>
              <View className="gap-3">
                {memberData.map(([name, count]) => {
                  const color = MEMBER_COLORS[name] || "#687076";
                  const percentage = Math.round((count / totalReservations) * 100);
                  return (
                    <View key={name}>
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2">
                          <View
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <Text className="text-foreground font-semibold">{name}</Text>
                        </View>
                        <Text className="text-muted text-sm">{count}回 ({percentage}%)</Text>
                      </View>
                      <View className="bg-border rounded-full h-2 overflow-hidden">
                        <View
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 車両別 */}
            <View className="bg-surface rounded-xl border border-border p-4 mb-6">
              <Text className="text-foreground font-bold text-lg mb-4">車両別利用回数</Text>
              <View className="gap-3">
                {carData.map(([carName, count]) => {
                  const color = CAR_COLORS[carName] || "#687076";
                  const percentage = Math.round((count / totalReservations) * 100);
                  return (
                    <View key={carName}>
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2">
                          <View
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <Text className="text-foreground font-semibold">{carName}</Text>
                        </View>
                        <Text className="text-muted text-sm">{count}回 ({percentage}%)</Text>
                      </View>
                      <View className="bg-border rounded-full h-2 overflow-hidden">
                        <View
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
