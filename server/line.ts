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

async function pushLineText(text: string) {
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

    if (!response.ok) {
      console.warn(`[LINE] Failed to send notification (${response.status} ${response.statusText})`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LINE] Error sending notification: ${message}`);
  }
}

export async function sendReservationLineNotification(
  event: ReservationLineEvent,
  payload: ReservationLinePayload,
) {
  await pushLineText(buildReservationLineText(event, payload));
}
