import { Router } from "express";

const router = Router();

interface LineWebhookEvent {
  source?: {
    groupId?: unknown;
  };
}

router.post("/webhook", (req, res) => {
  const events = Array.isArray(req.body?.events) ? (req.body.events as LineWebhookEvent[]) : [];
  const groupIds = new Set<string>();

  for (const event of events) {
    const groupId = event.source?.groupId;
    if (typeof groupId === "string" && groupId.length > 0) {
      groupIds.add(groupId);
    }
  }

  if (groupIds.size === 0) {
    console.warn("[LINE] Webhook received without groupId");
  } else {
    for (const groupId of groupIds) {
      console.log(`LINE webhook groupId detected: ${groupId}`);
    }
  }

  return res.status(200).json({ ok: true });
});

export default router;
