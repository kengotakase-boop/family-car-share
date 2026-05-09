import { Router } from "express";
import { z } from "zod";

const router = Router();

// メール送信リクエストのスキーマ
const sendEmailSchema = z.object({
  to: z.array(z.string().email()),
  subject: z.string(),
  text: z.string(),
});

// メール送信エンドポイント
router.post("/send", async (req, res) => {
  try {
    const { to, subject, text } = sendEmailSchema.parse(req.body);

    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      console.log("[Email] SendGrid APIキーが設定されていません");
      console.log(`[Email] 件名: ${subject}`);
      console.log(`[Email] 本文: ${text}`);
      console.log(`[Email] 送信先: ${to.join(", ")}`);
      
      return res.json({
        success: false,
        message: "SendGrid APIキーが設定されていません。環境変数 SENDGRID_API_KEY を設定してください。",
        preview: { to, subject, text },
      });
    }

    // SendGrid APIを使ってメール送信
    const sgMail = await import("@sendgrid/mail");
    sgMail.default.setApiKey(apiKey);

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || "kengotakase@gmail.com",
      subject,
      text,
    };

    await sgMail.default.send(msg);

    console.log(`[Email] メール送信成功: ${to.join(", ")}`);

    return res.json({
      success: true,
      message: "メールを送信しました",
    });
  } catch (error) {
    console.error("[Email] メール送信エラー:", error);
    return res.status(500).json({
      success: false,
      message: "メール送信に失敗しました",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
