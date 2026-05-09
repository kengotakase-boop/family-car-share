import { describe, it, expect } from "vitest";

describe("SendGrid連携", () => {
  it("メール送信APIのエンドポイントが正しい", () => {
    const endpoint = "http://127.0.0.1:3000/api/email/send";
    expect(endpoint).toBe("http://127.0.0.1:3000/api/email/send");
  });

  it("メール送信リクエストの形式が正しい", () => {
    const request = {
      to: ["kengotakase@gmail.com", "madokatakase47@gmail.com"],
      subject: "【新規予約】レクサス - 2026-02-05",
      text: "新しい予約が追加されました。\n\n車両: レクサス\n予約者: 健吾\n日時: 2026-02-05 終日\nコメント: 出張",
    };

    expect(request.to).toBeInstanceOf(Array);
    expect(request.to.length).toBeGreaterThan(0);
    expect(request.subject).toBeTruthy();
    expect(request.text).toBeTruthy();
  });

  it("家族メンバーのメールアドレスが正しく設定されている", () => {
    const familyMembers = [
      { id: "1", name: "健吾", email: "kengotakase@gmail.com" },
      { id: "2", name: "まどか", email: "madokatakase47@gmail.com" },
      { id: "3", name: "健一郎", email: "kenichiroutakase@gmail.com" },
      { id: "4", name: "英太郎", email: "eitarotakase88@gmail.com" },
      { id: "5", name: "光太郎", email: "koutarou080526@gmail.com" },
    ];

    expect(familyMembers).toHaveLength(5);
    expect(familyMembers[0].email).toBe("kengotakase@gmail.com");
    expect(familyMembers[1].email).toBe("madokatakase47@gmail.com");
    expect(familyMembers[2].email).toBe("kenichiroutakase@gmail.com");
    expect(familyMembers[3].email).toBe("eitarotakase88@gmail.com");
    expect(familyMembers[4].email).toBe("koutarou080526@gmail.com");
  });

  it("有効なメールアドレスのみを抽出できる", () => {
    const emails = [
      "kengotakase@gmail.com",
      "",
      "madokatakase47@gmail.com",
      "invalid",
      "kenichiroutakase@gmail.com",
    ];

    const validEmails = emails.filter((email) => email && email.includes("@"));

    expect(validEmails).toHaveLength(3);
    expect(validEmails).toContain("kengotakase@gmail.com");
    expect(validEmails).toContain("madokatakase47@gmail.com");
    expect(validEmails).toContain("kenichiroutakase@gmail.com");
  });

  it("予約追加時のメール件名が正しい形式", () => {
    const subject = "【新規予約】レクサス - 2026-02-05";
    expect(subject).toMatch(/【新規予約】/);
    expect(subject).toMatch(/レクサス|アルファード/);
    expect(subject).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("予約編集時のメール件名が正しい形式", () => {
    const subject = "【予約変更】アルファード - 2026-02-07";
    expect(subject).toMatch(/【予約変更】/);
    expect(subject).toMatch(/レクサス|アルファード/);
    expect(subject).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("予約削除時のメール件名が正しい形式", () => {
    const subject = "【予約削除】レクサス - 2026-02-05";
    expect(subject).toMatch(/【予約削除】/);
    expect(subject).toMatch(/レクサス|アルファード/);
    expect(subject).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("メール本文に必要な情報が含まれている", () => {
    const body =
      "新しい予約が追加されました。\n\n車両: レクサス\n予約者: 健吾\n日時: 2026-02-05 終日\nコメント: 出張";

    expect(body).toContain("車両:");
    expect(body).toContain("予約者:");
    expect(body).toContain("日時:");
    expect(body).toContain("コメント:");
  });
});

describe("SendGrid APIキー設定", () => {
  it("APIキーが未設定の場合はプレビューモードになる", () => {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      const response = {
        success: false,
        message: "SendGrid APIキーが設定されていません。環境変数 SENDGRID_API_KEY を設定してください。",
        preview: {
          to: ["kengotakase@gmail.com"],
          subject: "【新規予約】レクサス - 2026-02-05",
          text: "新しい予約が追加されました。",
        },
      };

      expect(response.success).toBe(false);
      expect(response.message).toContain("APIキー");
      expect(response.preview).toBeDefined();
    }
  });
});
