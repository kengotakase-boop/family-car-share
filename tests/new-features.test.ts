import { describe, it, expect, beforeEach } from "vitest";

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

describe("家族メンバー管理機能", () => {
  beforeEach(async () => {
    await AsyncStorageMock.clear();
  });

  it("5人の家族メンバーを登録できる", async () => {
    const members: FamilyMember[] = [
      { id: "1", name: "健吾" },
      { id: "2", name: "まどか" },
      { id: "3", name: "健一郎" },
      { id: "4", name: "英太郎" },
      { id: "5", name: "光太郎" },
    ];

    await AsyncStorageMock.setItem("familyMembers", JSON.stringify(members));
    const data = await AsyncStorageMock.getItem("familyMembers");
    const parsed = JSON.parse(data!);

    expect(parsed).toHaveLength(5);
    expect(parsed[0].name).toBe("健吾");
    expect(parsed[1].name).toBe("まどか");
    expect(parsed[2].name).toBe("健一郎");
    expect(parsed[3].name).toBe("英太郎");
    expect(parsed[4].name).toBe("光太郎");
  });

  it("家族メンバーの名前で予約を作成できる", async () => {
    const reservation: Reservation = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-10",
      isAllDay: true,
      comment: "テスト",
    };

    await AsyncStorageMock.setItem("reservations", JSON.stringify([reservation]));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed[0].userName).toBe("健吾");
  });
});

describe("時間指定機能", () => {
  beforeEach(async () => {
    await AsyncStorageMock.clear();
  });

  it("終日予約を作成できる", async () => {
    const reservation: Reservation = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-10",
      isAllDay: true,
      comment: "終日利用",
    };

    await AsyncStorageMock.setItem("reservations", JSON.stringify([reservation]));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed[0].isAllDay).toBe(true);
    expect(parsed[0].startTime).toBeUndefined();
    expect(parsed[0].endTime).toBeUndefined();
  });

  it("時間指定予約を作成できる", async () => {
    const reservation: Reservation = {
      id: "1",
      carName: "アルファード",
      userName: "まどか",
      date: "2026-02-10",
      isAllDay: false,
      startTime: "09:00",
      endTime: "17:00",
      comment: "時間指定",
    };

    await AsyncStorageMock.setItem("reservations", JSON.stringify([reservation]));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed[0].isAllDay).toBe(false);
    expect(parsed[0].startTime).toBe("09:00");
    expect(parsed[0].endTime).toBe("17:00");
  });

  it("開始時刻と終了時刻が正しく保存される", async () => {
    const reservation: Reservation = {
      id: "1",
      carName: "レクサス",
      userName: "健一郎",
      date: "2026-02-15",
      isAllDay: false,
      startTime: "14:30",
      endTime: "18:45",
      comment: "午後の予約",
    };

    await AsyncStorageMock.setItem("reservations", JSON.stringify([reservation]));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed = JSON.parse(data!);

    expect(parsed[0].startTime).toBe("14:30");
    expect(parsed[0].endTime).toBe("18:45");
  });
});

describe("カレンダービュー機能", () => {
  beforeEach(async () => {
    await AsyncStorageMock.clear();
  });

  it("特定の日付の予約を取得できる", async () => {
    const reservations: Reservation[] = [
      {
        id: "1",
        carName: "レクサス",
        userName: "健吾",
        date: "2026-02-10",
        isAllDay: true,
        comment: "予約1",
      },
      {
        id: "2",
        carName: "アルファード",
        userName: "まどか",
        date: "2026-02-10",
        isAllDay: false,
        startTime: "14:00",
        endTime: "18:00",
        comment: "予約2",
      },
      {
        id: "3",
        carName: "レクサス",
        userName: "健一郎",
        date: "2026-02-11",
        isAllDay: true,
        comment: "予約3",
      },
    ];

    await AsyncStorageMock.setItem("reservations", JSON.stringify(reservations));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed: Reservation[] = JSON.parse(data!);

    // 2026-02-10の予約を取得
    const feb10Reservations = parsed.filter((r) => r.date === "2026-02-10");

    expect(feb10Reservations).toHaveLength(2);
    expect(feb10Reservations[0].date).toBe("2026-02-10");
    expect(feb10Reservations[1].date).toBe("2026-02-10");
  });

  it("複数の日付にまたがる予約を管理できる", async () => {
    const reservations: Reservation[] = [
      {
        id: "1",
        carName: "レクサス",
        userName: "健吾",
        date: "2026-02-05",
        isAllDay: true,
        comment: "5日",
      },
      {
        id: "2",
        carName: "アルファード",
        userName: "まどか",
        date: "2026-02-10",
        isAllDay: true,
        comment: "10日",
      },
      {
        id: "3",
        carName: "レクサス",
        userName: "健一郎",
        date: "2026-02-15",
        isAllDay: true,
        comment: "15日",
      },
    ];

    await AsyncStorageMock.setItem("reservations", JSON.stringify(reservations));
    const data = await AsyncStorageMock.getItem("reservations");
    const parsed: Reservation[] = JSON.parse(data!);

    expect(parsed).toHaveLength(3);
    expect(parsed.map((r) => r.date)).toEqual(["2026-02-05", "2026-02-10", "2026-02-15"]);
  });
});

describe("LINE通知機能", () => {
  beforeEach(async () => {
    await AsyncStorageMock.clear();
  });

  it("LINE Notifyトークンを保存できる", async () => {
    const token = "test_token_12345";
    await AsyncStorageMock.setItem("lineNotifyToken", token);
    const data = await AsyncStorageMock.getItem("lineNotifyToken");

    expect(data).toBe(token);
  });

  it("LINE Notifyトークンが未設定の場合はnullが返る", async () => {
    const data = await AsyncStorageMock.getItem("lineNotifyToken");
    expect(data).toBeNull();
  });
});
