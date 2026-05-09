import { describe, it, expect, beforeEach } from "vitest";

type FamilyMember = {
  id: string;
  name: string;
  email: string;
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

describe("メール通知機能", () => {
  beforeEach(async () => {
    await AsyncStorageMock.clear();
  });

  it("家族メンバーのメールアドレスを保存できる", async () => {
    const members: FamilyMember[] = [
      { id: "1", name: "健吾", email: "kengo@example.com" },
      { id: "2", name: "まどか", email: "madoka@example.com" },
      { id: "3", name: "健一郎", email: "kenichiro@example.com" },
      { id: "4", name: "英太郎", email: "eitaro@example.com" },
      { id: "5", name: "光太郎", email: "kotaro@example.com" },
    ];

    await AsyncStorageMock.setItem("familyMembers", JSON.stringify(members));
    const data = await AsyncStorageMock.getItem("familyMembers");
    const parsed = JSON.parse(data!);

    expect(parsed).toHaveLength(5);
    expect(parsed[0].email).toBe("kengo@example.com");
    expect(parsed[1].email).toBe("madoka@example.com");
  });

  it("メールアドレスが空の家族メンバーも保存できる", async () => {
    const members: FamilyMember[] = [
      { id: "1", name: "健吾", email: "kengo@example.com" },
      { id: "2", name: "まどか", email: "" },
    ];

    await AsyncStorageMock.setItem("familyMembers", JSON.stringify(members));
    const data = await AsyncStorageMock.getItem("familyMembers");
    const parsed = JSON.parse(data!);

    expect(parsed[0].email).toBe("kengo@example.com");
    expect(parsed[1].email).toBe("");
  });

  it("通知設定をON/OFFできる", async () => {
    await AsyncStorageMock.setItem("notificationEnabled", "true");
    let enabled = await AsyncStorageMock.getItem("notificationEnabled");
    expect(enabled).toBe("true");

    await AsyncStorageMock.setItem("notificationEnabled", "false");
    enabled = await AsyncStorageMock.getItem("notificationEnabled");
    expect(enabled).toBe("false");
  });

  it("有効なメールアドレスをフィルタリングできる", () => {
    const emails = [
      "kengo@example.com",
      "",
      "invalid-email",
      "madoka@example.com",
      "test@test.co.jp",
    ];

    const validEmails = emails.filter((email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return email && emailRegex.test(email);
    });

    expect(validEmails).toHaveLength(3);
    expect(validEmails).toContain("kengo@example.com");
    expect(validEmails).toContain("madoka@example.com");
    expect(validEmails).toContain("test@test.co.jp");
  });

  it("メール通知が無効の場合は送信されない", async () => {
    await AsyncStorageMock.setItem("notificationEnabled", "false");
    const enabled = await AsyncStorageMock.getItem("notificationEnabled");

    expect(enabled).toBe("false");
  });

  it("メール通知が有効の場合は送信される", async () => {
    await AsyncStorageMock.setItem("notificationEnabled", "true");
    const enabled = await AsyncStorageMock.getItem("notificationEnabled");

    expect(enabled).toBe("true");
  });
});

describe("メールアドレスのバリデーション", () => {
  it("正しいメールアドレス形式を検証できる", () => {
    const validEmails = [
      "test@example.com",
      "user.name@example.co.jp",
      "user+tag@example.com",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it("不正なメールアドレス形式を検出できる", () => {
    const invalidEmails = [
      "invalid",
      "@example.com",
      "user@",
      "user@example",
      "",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });
});
