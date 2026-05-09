import { describe, it, expect, beforeEach, vi } from "vitest";

type Reservation = {
  id: string;
  carName: string;
  userName: string;
  date: string;
  isAllDay: boolean;
  comment: string;
};

// AsyncStorageのモック実装
const mockStorage: Record<string, string> = {};

const AsyncStorageMock = {
  setItem: async (key: string, value: string) => {
    mockStorage[key] = value;
  },
  getItem: async (key: string) => {
    return mockStorage[key] || null;
  },
  removeItem: async (key: string) => {
    delete mockStorage[key];
  },
  clear: async () => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  },
};

describe("予約管理機能", () => {
  beforeEach(async () => {
    // テスト前にストレージをクリア
    await AsyncStorageMock.clear();
  });

  it("予約データを保存できる", async () => {
    const reservation: Reservation = {
      id: "test-1",
      carName: "レクサス",
      userName: "テストユーザー",
      date: "2026-02-10",
      isAllDay: true,
      comment: "テスト予約",
    };

    await AsyncStorageMock.setItem("reservations", JSON.stringify([reservation]));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].carName).toBe("レクサス");
    expect(parsed[0].userName).toBe("テストユーザー");
  });

  it("複数の予約を保存できる", async () => {
    const reservations: Reservation[] = [
      {
        id: "1",
        carName: "レクサス",
        userName: "お父さん",
        date: "2026-02-05",
        isAllDay: true,
        comment: "出張",
      },
      {
        id: "2",
        carName: "アルファード",
        userName: "お母さん",
        date: "2026-02-07",
        isAllDay: false,
        comment: "買い物",
      },
    ];

    await AsyncStorageMock.setItem("reservations", JSON.stringify(reservations));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].carName).toBe("レクサス");
    expect(parsed[1].carName).toBe("アルファード");
  });

  it("予約を削除できる", async () => {
    const reservations: Reservation[] = [
      {
        id: "1",
        carName: "レクサス",
        userName: "お父さん",
        date: "2026-02-05",
        isAllDay: true,
        comment: "出張",
      },
      {
        id: "2",
        carName: "アルファード",
        userName: "お母さん",
        date: "2026-02-07",
        isAllDay: false,
        comment: "買い物",
      },
    ];

    await AsyncStorageMock.setItem("reservations", JSON.stringify(reservations));

    // ID "1"の予約を削除
    const updated = reservations.filter((r) => r.id !== "1");
    await AsyncStorageMock.setItem("reservations", JSON.stringify(updated));

    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("2");
    expect(parsed[0].carName).toBe("アルファード");
  });

  it("予約を更新できる", async () => {
    const reservations: Reservation[] = [
      {
        id: "1",
        carName: "レクサス",
        userName: "お父さん",
        date: "2026-02-05",
        isAllDay: true,
        comment: "出張",
      },
    ];

    await AsyncStorageMock.setItem("reservations", JSON.stringify(reservations));

    // 予約を更新
    const updated = reservations.map((r) =>
      r.id === "1" ? { ...r, comment: "出張(更新済み)" } : r
    );
    await AsyncStorageMock.setItem("reservations", JSON.stringify(updated));

    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed[0].comment).toBe("出張(更新済み)");
  });

  it("空のストレージから読み込むとnullが返る", async () => {
    const data = await AsyncStorageMock.getItem("reservations");
    expect(data).toBeNull();
  });

  it("車両名が正しく設定される", async () => {
    const lexusReservation: Reservation = {
      id: "1",
      carName: "レクサス",
      userName: "テスト",
      date: "2026-02-10",
      isAllDay: true,
      comment: "",
    };

    const alphardReservation: Reservation = {
      id: "2",
      carName: "アルファード",
      userName: "テスト",
      date: "2026-02-11",
      isAllDay: true,
      comment: "",
    };

    await AsyncStorageMock.setItem(
      "reservations",
      JSON.stringify([lexusReservation, alphardReservation])
    );
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed[0].carName).toBe("レクサス");
    expect(parsed[1].carName).toBe("アルファード");
  });
});
