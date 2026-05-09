/**
 * メール送信機能
 * 
 * 予約の追加・編集・削除時に家族メンバーにメール通知を送信します
 */

export interface EmailNotification {
  to: string[];
  subject: string;
  body: string;
}

/**
 * メール通知を送信
 * @param emails 送信先メールアドレスのリスト
 * @param subject メールの件名
 * @param body メールの本文
 */
export async function sendEmailNotifications(
  emails: string[],
  subject: string,
  body: string
): Promise<void> {
  // 有効なメールアドレスのみフィルタリング
  const validEmails = emails.filter((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  });

  if (validEmails.length === 0) {
    console.log("[Email] No valid email addresses to send notifications to");
    return;
  }

  console.log(`[Email] Sending notification to ${validEmails.length} recipients`);
  console.log(`[Email] Subject: ${subject}`);
  console.log(`[Email] Body: ${body}`);
  console.log(`[Email] Recipients: ${validEmails.join(", ")}`);

  // 実際のメール送信は外部サービス(SendGrid, AWS SES等)を使用する必要があります
  // ここではログ出力のみ行います
  // TODO: 本番環境では実際のメール送信APIを実装してください
}

/**
 * 予約追加通知メールを送信
 */
export async function sendReservationCreatedEmail(
  emails: string[],
  carName: string,
  userName: string,
  date: string,
  time: string,
  comment: string
): Promise<void> {
  const subject = `【予約追加】${carName} - ${date}`;
  const body = `
新しい予約が追加されました。

車両: ${carName}
予約者: ${userName}
日時: ${date} ${time}
コメント: ${comment}

家族カーシェアアプリより
  `.trim();

  await sendEmailNotifications(emails, subject, body);
}

/**
 * 予約変更通知メールを送信
 */
export async function sendReservationUpdatedEmail(
  emails: string[],
  carName: string,
  userName: string,
  date: string,
  time: string,
  comment: string
): Promise<void> {
  const subject = `【予約変更】${carName} - ${date}`;
  const body = `
予約が変更されました。

車両: ${carName}
予約者: ${userName}
日時: ${date} ${time}
コメント: ${comment}

家族カーシェアアプリより
  `.trim();

  await sendEmailNotifications(emails, subject, body);
}

/**
 * 予約削除通知メールを送信
 */
export async function sendReservationDeletedEmail(
  emails: string[],
  carName: string,
  userName: string,
  date: string,
  time: string,
  comment: string
): Promise<void> {
  const subject = `【予約削除】${carName} - ${date}`;
  const body = `
予約が削除されました。

車両: ${carName}
予約者: ${userName}
日時: ${date} ${time}
コメント: ${comment}

家族カーシェアアプリより
  `.trim();

  await sendEmailNotifications(emails, subject, body);
}
