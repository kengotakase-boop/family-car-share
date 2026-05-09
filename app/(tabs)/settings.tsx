import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import AsyncStorage from "@react-native-async-storage/async-storage";

type FamilyMember = {
  id: string;
  name: string;
  email: string;
};

const FAMILY_MEMBERS_KEY = "familyMembers";
const NOTIFICATION_ENABLED_KEY = "notificationEnabled";

const DEFAULT_MEMBERS: FamilyMember[] = [
  { id: "1", name: "健吾", email: "kengotakase@gmail.com" },
  { id: "2", name: "まどか", email: "madokatakase47@gmail.com" },
  { id: "3", name: "健一郎", email: "kenichiroutakase@gmail.com" },
  { id: "4", name: "英太郎", email: "eitarotakase88@gmail.com" },
  { id: "5", name: "光太郎", email: "koutarou080526@gmail.com" },
];

export default function SettingsScreen() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(DEFAULT_MEMBERS);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [editedEmails, setEditedEmails] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const membersData = await AsyncStorage.getItem(FAMILY_MEMBERS_KEY);
      if (membersData) {
        const members = JSON.parse(membersData);
        // 古いデータ（お父さん、お母さんなど）を検出して修正
        const hasOldData = members.some(
          (m: FamilyMember) => m.name === "お父さん" || m.name === "お母さん" || members.length !== 5
        );
        if (hasOldData) {
          await AsyncStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(DEFAULT_MEMBERS));
          setFamilyMembers(DEFAULT_MEMBERS);
          const emailMap: Record<string, string> = {};
          DEFAULT_MEMBERS.forEach((m) => { emailMap[m.id] = m.email; });
          setEditedEmails(emailMap);
        } else {
          setFamilyMembers(members);
          const emailMap: Record<string, string> = {};
          members.forEach((m: FamilyMember) => { emailMap[m.id] = m.email; });
          setEditedEmails(emailMap);
        }
      } else {
        await AsyncStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(DEFAULT_MEMBERS));
        setFamilyMembers(DEFAULT_MEMBERS);
        const emailMap: Record<string, string> = {};
        DEFAULT_MEMBERS.forEach((m) => { emailMap[m.id] = m.email; });
        setEditedEmails(emailMap);
      }

      const notifData = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
      setNotificationEnabled(notifData !== "false");
    } catch (error) {
      console.error("設定の読み込みエラー:", error);
    }
  };

  const updateEmail = (memberId: string, email: string) => {
    setEditedEmails((prev) => ({ ...prev, [memberId]: email }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      const updatedMembers = familyMembers.map((m) => ({
        ...m,
        email: editedEmails[m.id] ?? m.email,
      }));
      await AsyncStorage.setItem(FAMILY_MEMBERS_KEY, JSON.stringify(updatedMembers));
      await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, notificationEnabled.toString());
      setFamilyMembers(updatedMembers);
      setHasChanges(false);
      Alert.alert("成功", "設定を保存しました");
    } catch (error) {
      console.error("設定の保存エラー:", error);
      Alert.alert("エラー", "保存に失敗しました");
    }
  };

  const toggleNotification = (value: boolean) => {
    setNotificationEnabled(value);
    setHasChanges(true);
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-4">
        {/* ヘッダー */}
        <Text className="text-2xl font-bold text-foreground mb-6">設定</Text>

        {/* メール通知 */}
        <View className="bg-surface rounded-xl border border-border p-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">メール通知</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground">予約変更時にメール通知</Text>
            <Switch
              value={notificationEnabled}
              onValueChange={toggleNotification}
              trackColor={{ false: "#E5E7EB", true: "#0a7ea4" }}
              thumbColor="#ffffff"
            />
          </View>
          <Text className="text-muted text-sm mt-2">
            ONにすると、予約の追加・編集・削除時に全員にメールが届きます
          </Text>
        </View>

        {/* 家族メンバーのメールアドレス */}
        <View className="bg-surface rounded-xl border border-border p-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">家族メンバーのメールアドレス</Text>
          <View className="gap-4">
            {familyMembers.map((member) => (
              <View key={member.id}>
                <Text className="text-foreground font-semibold mb-1">{member.name}</Text>
                <TextInput
                  className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                  placeholder="メールアドレス"
                  placeholderTextColor="#9BA1A6"
                  value={editedEmails[member.id] ?? member.email}
                  onChangeText={(text) => updateEmail(member.id, text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>
            ))}
          </View>
        </View>

        {/* 保存ボタン */}
        {hasChanges && (
          <TouchableOpacity
            onPress={saveSettings}
            className="bg-primary py-4 rounded-xl mb-4"
          >
            <Text className="text-center text-background font-semibold text-lg">設定を保存</Text>
          </TouchableOpacity>
        )}

        {/* アプリ情報 */}
        <View className="bg-surface rounded-xl border border-border p-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-3">アプリについて</Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-muted">アプリ名</Text>
              <Text className="text-foreground">家族カーシェア</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted">バージョン</Text>
              <Text className="text-foreground">1.0.0</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted">対応車両</Text>
              <Text className="text-foreground">レクサス・アルファード</Text>
            </View>
          </View>
        </View>

        {/* 注意事項 */}
        <View className="p-4 bg-warning/10 rounded-xl border border-warning/30 mb-6">
          <Text className="text-foreground font-semibold mb-2">メール送信について</Text>
          <Text className="text-muted text-sm">
            • メールはSendGrid経由で送信されます{"\n"}
            • 迷惑メールフォルダに入る場合があります{"\n"}
            • 送信元: noreply@family-car-share.com
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
