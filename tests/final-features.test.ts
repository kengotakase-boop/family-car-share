import { describe, it, expect } from "vitest";

// 統計計算ロジックのテスト
describe("統計計算", () => {
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

  const sampleReservations: Reservation[] = [
    { id: "1", carName: "レクサス", userName: "健吾", date: "2026-03-01", isAllDay: true },
    { id: "2", carName: "アルファード", userName: "まどか", date: "2026-03-02", isAllDay: false, startTime: "09:00", endTime: "17:00" },
    { id: "3", carName: "レクサス", userName: "健吾", date: "2026-03-05", isAllDay: true },
    { id: "4", carName: "レクサス", userName: "健一郎", date: "2026-03-10", isAllDay: true },
    { id: "5", carName: "アルファード", userName: "英太郎", date: "2026-03-15", isAllDay: false, startTime: "10:00", endTime: "18:00" },
  ];

  it("メンバー別予約数を正しく集計できる", () => {
    const stats: Record<string, number> = {};
    sampleReservations.forEach((r) => {
      stats[r.userName] = (stats[r.userName] || 0) + 1;
    });
    expect(stats["健吾"]).toBe(2);
    expect(stats["まどか"]).toBe(1);
    expect(stats["健一郎"]).toBe(1);
    expect(stats["英太郎"]).toBe(1);
  });

  it("車両別予約数を正しく集計できる", () => {
    const stats: Record<string, number> = {};
    sampleReservations.forEach((r) => {
      stats[r.carName] = (stats[r.carName] || 0) + 1;
    });
    expect(stats["レクサス"]).toBe(3);
    expect(stats["アルファード"]).toBe(2);
  });

  it("合計予約数が正しい", () => {
    expect(sampleReservations.length).toBe(5);
  });
});

// 競合チェックのテスト
describe("予約競合チェック", () => {
  type Reservation = {
    id: string;
    carName: string;
    date: string;
    isAllDay: boolean;
    startTime?: string;
    endTime?: string;
  };

  const checkConflict = (
    reservations: Reservation[],
    newReservation: Omit<Reservation, "id">,
    editingId?: string
  ): boolean => {
    const sameCarReservations = reservations.filter(
      (r) => r.carName === newReservation.carName && r.id !== editingId
    );

    for (const existing of sameCarReservations) {
      if (existing.date !== newReservation.date) continue;

      if (newReservation.isAllDay || existing.isAllDay) {
        return true;
      }

      const newStart = newReservation.startTime || "00:00";
      const newEnd = newReservation.endTime || "23:59";
      const existStart = existing.startTime || "00:00";
      const existEnd = existing.endTime || "23:59";

      if (newStart < existEnd && newEnd > existStart) {
        return true;
      }
    }
    return false;
  };

  const existingReservations: Reservation[] = [
    { id: "1", carName: "レクサス", date: "2026-03-10", isAllDay: true },
    { id: "2", carName: "アルファード", date: "2026-03-10", isAllDay: false, startTime: "09:00", endTime: "12:00" },
  ];

  it("終日予約と同日の予約は競合する", () => {
    const conflict = checkConflict(existingReservations, {
      carName: "レクサス",
      date: "2026-03-10",
      isAllDay: false,
      startTime: "14:00",
      endTime: "17:00",
    });
    expect(conflict).toBe(true);
  });

  it("異なる日付は競合しない", () => {
    const conflict = checkConflict(existingReservations, {
      carName: "レクサス",
      date: "2026-03-11",
      isAllDay: true,
    });
    expect(conflict).toBe(false);
  });

  it("異なる車両は競合しない", () => {
    const conflict = checkConflict(existingReservations, {
      carName: "アルファード",
      date: "2026-03-10",
      isAllDay: false,
      startTime: "14:00",
      endTime: "17:00",
    });
    expect(conflict).toBe(false);
  });

  it("時間が重複しない場合は競合しない", () => {
    const conflict = checkConflict(existingReservations, {
      carName: "アルファード",
      date: "2026-03-10",
      isAllDay: false,
      startTime: "13:00",
      endTime: "17:00",
    });
    expect(conflict).toBe(false);
  });

  it("時間が重複する場合は競合する", () => {
    const conflict = checkConflict(existingReservations, {
      carName: "アルファード",
      date: "2026-03-10",
      isAllDay: false,
      startTime: "11:00",
      endTime: "15:00",
    });
    expect(conflict).toBe(true);
  });
});

// 家族メンバーのデフォルト設定テスト
describe("家族メンバーのデフォルト設定", () => {
  const DEFAULT_MEMBERS = [
    { id: "1", name: "健吾", email: "kengotakase@gmail.com" },
    { id: "2", name: "まどか", email: "madokatakase47@gmail.com" },
    { id: "3", name: "健一郎", email: "kenichiroutakase@gmail.com" },
    { id: "4", name: "英太郎", email: "eitarotakase88@gmail.com" },
    { id: "5", name: "光太郎", email: "koutarou080526@gmail.com" },
  ];

  it("家族メンバーが5人である", () => {
    expect(DEFAULT_MEMBERS.length).toBe(5);
  });

  it("全員のメールアドレスが有効な形式である", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    DEFAULT_MEMBERS.forEach((member) => {
      expect(emailRegex.test(member.email)).toBe(true);
    });
  });

  it("健吾のメールアドレスが正しい", () => {
    const kengo = DEFAULT_MEMBERS.find((m) => m.name === "健吾");
    expect(kengo?.email).toBe("kengotakase@gmail.com");
  });
});
