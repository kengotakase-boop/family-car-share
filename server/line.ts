type ReservationLineEvent = "created" | "deleted";

interface ReservationLinePayload {
  carName: string;
  userName: string;
  date: string;
  time: string;
  comment: string;
}

function isLineNotifyEnabled() {
  return process.env.LINE_NOTIFY_ENABLED === "true";
}

function buildReservationLineText(event: ReservationLineEvent, payload: ReservationLinePayload) {
  const title = event === "created" ? "予約追加" : "予約削除";
  const comment = payload.comment.trim() || "-";

  return [
    `【${title}】`,
    `車両: ${payload.carName}`,
    `予約者: ${payload.userName}`,
    `日時: ${payload.date} ${payload.time}`,
    `メモ: ${comment}`,
  ].join("\n");
}

function summarizeLineResponseBody(body: string) {
  if (!body.trim()) {
    return "[empty]";
  }

  try {
    const parsed = JSON.parse(body) as { message?: unknown; details?: unknown };
    const summary = {
      message: typeof parsed.message === "string" ? parsed.message : undefined,
      details: parsed.details,
    };

    return JSON.stringify(summary);
  } catch {
    return body;
  }
}

function redactSensitiveLogValue(value: string) {
  return value
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[REDACTED_TOKEN]")
    .replace(/\b[CU][0-9a-f]{32,}\b/gi, "[REDACTED_ID]")
    .slice(0, 500);
}

async function pushLineText(event: ReservationLineEvent, text: string) {
  if (!isLineNotifyEnabled()) {
    return;
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_NOTIFY_TARGET_ID;
  if (!token || !targetId) {
    console.warn("[LINE] Notification is enabled but LINE env vars are not fully configured");
    return;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{ type: "text", text }],
      }),
    });

    console.info(`[LINE] Push API response: ${event} status=${response.status} ok=${response.ok}`);

    if (!response.ok) {
      const responseBody = await response.text();
      const responseSummary = redactSensitiveLogValue(summarizeLineResponseBody(responseBody));
      console.warn(`[LINE] Push API error response body: ${event} ${responseSummary}`);
      console.warn(`[LINE] Failed to send notification (${response.status} ${response.statusText})`);
      return;
    }

    console.info(`[LINE] Notification sent successfully: ${event}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LINE] Error sending notification: ${message}`);
  }
}

export async function sendReservationLineNotification(
  event: ReservationLineEvent,
  payload: ReservationLinePayload,
) {
  console.info(`[LINE] Sending reservation notification: ${event}`);
  await pushLineText(event, buildReservationLineText(event, payload));
}
