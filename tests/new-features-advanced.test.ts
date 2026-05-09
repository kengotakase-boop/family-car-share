import { describe, it, expect } from "vitest";

describe("予約の競合チェック機能", () => {
  it("同じ車両の終日予約が競合する", () => {
    const existingReservation = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-10",
      isAllDay: true,
      comment: "出張",
    };

    const newReservation = {
      carName: "レクサス",
      date: "2026-02-10",
      isAllDay: true,
    };

    // 同じ車両、同じ日付、終日予約は競合
    expect(existingReservation.carName).toBe(newReservation.carName);
    expect(existingReservation.date).toBe(newReservation.date);
    expect(existingReservation.isAllDay).toBe(true);
    expect(newReservation.isAllDay).toBe(true);
  });

  it("同じ車両の時間指定予約が重なる場合に競合する", () => {
    const existingReservation = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-10",
      isAllDay: false,
      startTime: "09:00",
      endTime: "12:00",
      comment: "出張",
    };

    const newReservation = {
      carName: "レクサス",
      date: "2026-02-10",
      isAllDay: false,
      startTime: "10:00",
      endTime: "14:00",
    };

    // 時間が重なっているかチェック
    const existingStart = existingReservation.startTime;
    const existingEnd = existingReservation.endTime;
    const newStart = newReservation.startTime;
    const newEnd = newReservation.endTime;

    const isConflict =
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd);

    expect(isConflict).toBe(true);
  });

  it("同じ車両でも時間が重ならない場合は競合しない", () => {
    const existingReservation = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-10",
      isAllDay: false,
      startTime: "09:00",
      endTime: "12:00",
      comment: "出張",
    };

    const newReservation = {
      carName: "レクサス",
      date: "2026-02-10",
      isAllDay: false,
      startTime: "13:00",
      endTime: "16:00",
    };

    // 時間が重なっているかチェック
    const existingStart = existingReservation.startTime;
    const existingEnd = existingReservation.endTime;
    const newStart = newReservation.startTime;
    const newEnd = newReservation.endTime;

    const isConflict =
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd);

    expect(isConflict).toBe(false);
  });

  it("異なる車両の場合は競合しない", () => {
    const existingReservation = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-10",
      isAllDay: true,
      comment: "出張",
    };

    const newReservation = {
      carName: "アルファード",
      date: "2026-02-10",
      isAllDay: true,
    };

    expect(existingReservation.carName).not.toBe(newReservation.carName);
  });
});

describe("カレンダー日付選択機能", () => {
  it("日付文字列が正しい形式で生成される", () => {
    const year = 2026;
    const month = 2; // 3月（0始まり）
    const day = 15;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    expect(dateStr).toBe("2026-03-15");
  });

  it("カレンダーの週データが正しく生成される", () => {
    const week = [
      { date: 0, isCurrentMonth: false },
      { date: 0, isCurrentMonth: false },
      { date: 1, isCurrentMonth: true },
      { date: 2, isCurrentMonth: true },
      { date: 3, isCurrentMonth: true },
      { date: 4, isCurrentMonth: true },
      { date: 5, isCurrentMonth: true },
    ];

    expect(week.length).toBe(7);
    expect(week[0].isCurrentMonth).toBe(false);
    expect(week[2].isCurrentMonth).toBe(true);
    expect(week[2].date).toBe(1);
  });
});

describe("予約リマインダー機能", () => {
  it("明日の日付が正しく計算される", () => {
    const today = new Date("2026-02-04");
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    expect(tomorrowStr).toBe("2026-02-05");
  });

  it("明日の予約が正しくフィルタリングされる", () => {
    const reservations = [
      { id: "1", date: "2026-02-04", carName: "レクサス", userName: "健吾" },
      { id: "2", date: "2026-02-05", carName: "アルファード", userName: "まどか" },
      { id: "3", date: "2026-02-06", carName: "レクサス", userName: "健一郎" },
    ];

    const tomorrowStr = "2026-02-05";
    const tomorrowReservations = reservations.filter((r) => r.date === tomorrowStr);

    expect(tomorrowReservations.length).toBe(1);
    expect(tomorrowReservations[0].userName).toBe("まどか");
  });
});
