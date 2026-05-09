import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Car = {
  id: string;
  name: string;
  color?: string;
  plateNumber?: string;
  note?: string;
};

const CARS_KEY = "cars";

const DEFAULT_CARS: Car[] = [
  { id: "1", name: "レクサス", color: "ブラック", plateNumber: "", note: "" },
  { id: "2", name: "アルファード", color: "ホワイト", plateNumber: "", note: "" },
];

export default function CarsScreen() {
  const [cars, setCars] = useState<Car[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      const data = await AsyncStorage.getItem(CARS_KEY);
      if (data) {
        setCars(JSON.parse(data));
      } else {
        await AsyncStorage.setItem(CARS_KEY, JSON.stringify(DEFAULT_CARS));
        setCars(DEFAULT_CARS);
      }
    } catch (error) {
      console.error("車両データの読み込みエラー:", error);
      setCars(DEFAULT_CARS);
    }
  };

  const saveCars = async (updatedCars: Car[]) => {
    try {
      await AsyncStorage.setItem(CARS_KEY, JSON.stringify(updatedCars));
      setCars(updatedCars);
    } catch (error) {
      console.error("車両データの保存エラー:", error);
    }
  };

  const openAddModal = () => {
    setEditingCar(null);
    setName("");
    setColor("");
    setPlateNumber("");
    setNote("");
    setModalVisible(true);
  };

  const openEditModal = (car: Car) => {
    setEditingCar(car);
    setName(car.name);
    setColor(car.color || "");
    setPlateNumber(car.plateNumber || "");
    setNote(car.note || "");
    setModalVisible(true);
  };

  const saveCar = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "車両名を入力してください");
      return;
    }

    const updatedCar: Car = {
      id: editingCar ? editingCar.id : Date.now().toString(),
      name: name.trim(),
      color: color.trim(),
      plateNumber: plateNumber.trim(),
      note: note.trim(),
    };

    let updatedCars: Car[];
    if (editingCar) {
      updatedCars = cars.map((c) => (c.id === editingCar.id ? updatedCar : c));
    } else {
      updatedCars = [...cars, updatedCar];
    }

    await saveCars(updatedCars);
    setModalVisible(false);
    Alert.alert("成功", editingCar ? "車両情報を更新しました" : "車両を追加しました");
  };

  const deleteCar = (carId: string) => {
    Alert.alert("確認", "この車両を削除しますか?", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          const updatedCars = cars.filter((c) => c.id !== carId);
          await saveCars(updatedCars);
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 p-4">
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-foreground">車両管理</Text>
          <TouchableOpacity
            onPress={openAddModal}
            className="bg-primary px-4 py-2 rounded-full"
          >
            <Text className="text-background font-semibold">+ 車両追加</Text>
          </TouchableOpacity>
        </View>

        {/* 車両リスト */}
        {cars.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-muted text-center mb-4">車両が登録されていません</Text>
            <TouchableOpacity
              onPress={openAddModal}
              className="bg-primary px-6 py-3 rounded-full"
            >
              <Text className="text-background font-semibold">車両を追加</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {cars.map((car) => (
              <TouchableOpacity
                key={car.id}
                onPress={() => openEditModal(car)}
                className="bg-surface p-4 rounded-xl border border-border"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-lg font-bold text-foreground">{car.name}</Text>
                  <TouchableOpacity
                    onPress={(e: any) => {
                      e.stopPropagation();
                      deleteCar(car.id);
                    }}
                    className="bg-error px-3 py-1 rounded"
                  >
                    <Text className="text-background text-sm">削除</Text>
                  </TouchableOpacity>
                </View>
                {car.color ? (
                  <Text className="text-sm text-muted">色: {car.color}</Text>
                ) : null}
                {car.plateNumber ? (
                  <Text className="text-sm text-muted">ナンバー: {car.plateNumber}</Text>
                ) : null}
                {car.note ? (
                  <Text className="text-sm text-muted mt-1">{car.note}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 説明 */}
        <View className="mt-8 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-foreground font-semibold mb-2">使い方</Text>
          <Text className="text-muted text-sm">
            • 車両をタップして情報を編集{"\n"}
            • 「+ 車両追加」で新しい車両を登録{"\n"}
            • 「削除」ボタンで車両を削除{"\n"}
            • 登録した車両名は予約画面で選択できます
          </Text>
        </View>
      </ScrollView>

      {/* 車両追加・編集モーダル */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View className="bg-background rounded-t-3xl p-6" style={{ maxHeight: "80%" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-2xl font-bold text-foreground mb-6">
                {editingCar ? "車両を編集" : "車両を追加"}
              </Text>

              <Text className="text-foreground font-semibold mb-2">車両名 *</Text>
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground mb-4"
                placeholder="例: レクサス、アルファード"
                placeholderTextColor="#9BA1A6"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />

              <Text className="text-foreground font-semibold mb-2">色</Text>
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground mb-4"
                placeholder="例: ブラック、ホワイト"
                placeholderTextColor="#9BA1A6"
                value={color}
                onChangeText={setColor}
                returnKeyType="next"
              />

              <Text className="text-foreground font-semibold mb-2">ナンバープレート</Text>
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground mb-4"
                placeholder="例: 大阪 300 あ 1234"
                placeholderTextColor="#9BA1A6"
                value={plateNumber}
                onChangeText={setPlateNumber}
                returnKeyType="next"
              />

              <Text className="text-foreground font-semibold mb-2">メモ</Text>
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground mb-6"
                placeholder="例: 車検は3月まで"
                placeholderTextColor="#9BA1A6"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="flex-1 py-4 rounded-xl border border-border bg-surface"
                >
                  <Text className="text-center text-foreground font-semibold">キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveCar}
                  className="flex-1 py-4 rounded-xl bg-primary"
                >
                  <Text className="text-center text-background font-semibold">保存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
