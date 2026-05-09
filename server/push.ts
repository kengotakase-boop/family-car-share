import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

/**
 * Send push notifications to multiple devices
 * @param tokens Array of Expo push tokens
 * @param title Notification title
 * @param body Notification body
 */
export async function sendPushNotifications(tokens: string[], title: string, body: string) {
  // Filter out invalid tokens
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.log("[Push] No valid tokens to send notifications to");
    return;
  }

  // Create messages
  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data: { timestamp: Date.now() },
  }));

  // Send notifications in chunks
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("[Push] Error sending notification chunk:", error);
    }
  }

  console.log(`[Push] Sent ${tickets.length} notifications`);
  return tickets;
}
