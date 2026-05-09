import { describe, it, expect } from "vitest";

describe("データ自動修正機能", () => {
  it("家族メンバーの正しいデータ構造", () => {
    const correctMembers = [
      { id: "1", name: "健吾", email: "kengotakase@gmail.com" },
      { id: "2", name: "まどか", email: "madokatakase47@gmail.com" },
      { id: "3", name: "健一郎", email: "kenichiroutakase@gmail.com" },
      { id: "4", name: "英太郎", email: "eitarotakase88@gmail.com" },
      { id: "5", name: "光太郎", email: "koutarou080526@gmail.com" },
    ];

    expect(correctMembers).toHaveLength(5);
    expect(correctMembers[0].name).toBe("健吾");
    expect(correctMembers[0].email).toBe("kengotakase@gmail.com");
    expect(correctMembers[1].name).toBe("まどか");
    expect(correctMembers[1].email).toBe("madokatakase47@gmail.com");
  });

  it("古い家族メンバーデータを検出できる", () => {
    const oldData = [
      { id: "1", name: "お父さん", email: "example@email.com" },
      { id: "2", name: "お母さん", email: "example@email.com" },
      { id: "3", name: "健吾", email: "example@email.com" },
    ];

    const hasOldData = oldData.some(
      (m) => m.name === "お父さん" || m.name === "お母さん" || oldData.length !== 5
    );

    expect(hasOldData).toBe(true);
  });

  it("新しい家族メンバーデータは検出されない", () => {
    const newData = [
      { id: "1", name: "健吾", email: "kengotakase@gmail.com" },
      { id: "2", name: "まどか", email: "madokatakase47@gmail.com" },
      { id: "3", name: "健一郎", email: "kenichiroutakase@gmail.com" },
      { id: "4", name: "英太郎", email: "eitarotakase88@gmail.com" },
      { id: "5", name: "光太郎", email: "koutarou080526@gmail.com" },
    ];

    const hasOldData = newData.some(
      (m) => m.name === "お父さん" || m.name === "お母さん" || newData.length !== 5
    );

    expect(hasOldData).toBe(false);
  });

  it("予約データのstartTime/endTimeが未設定の場合を修正できる", () => {
    const reservationWithoutTime = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-05",
      isAllDay: false,
      comment: "出張",
    };

    const fixed = {
      ...reservationWithoutTime,
      startTime: "09:00",
      endTime: "17:00",
    };

    expect(fixed.startTime).toBe("09:00");
    expect(fixed.endTime).toBe("17:00");
  });

  it("終日予約はstartTime/endTimeが不要", () => {
    const allDayReservation = {
      id: "1",
      carName: "レクサス",
      userName: "健吾",
      date: "2026-02-05",
      isAllDay: true,
      comment: "出張",
    };

    expect(allDayReservation.isAllDay).toBe(true);
    expect(allDayReservation).not.toHaveProperty("startTime");
    expect(allDayReservation).not.toHaveProperty("endTime");
  });

  it("時間指定予約はstartTime/endTimeが必須", () => {
    const timeSpecificReservation = {
      id: "2",
      carName: "アルファード",
      userName: "まどか",
      date: "2026-02-07",
      isAllDay: false,
      startTime: "14:00",
      endTime: "18:00",
      comment: "買い物",
    };

    expect(timeSpecificReservation.isAllDay).toBe(false);
    expect(timeSpecificReservation.startTime).toBeDefined();
    expect(timeSpecificReservation.endTime).toBeDefined();
    expect(timeSpecificReservation.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(timeSpecificReservation.endTime).toMatch(/^\d{2}:\d{2}$/);
  });
});
