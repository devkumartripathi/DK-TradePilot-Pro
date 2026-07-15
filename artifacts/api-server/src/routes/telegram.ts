/**
 * Telegram alert configuration and dispatch.
 *
 * On startup, reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from environment.
 * Users can also update config at runtime via the UI (POST /signals/telegram/config).
 *
 * Auto-dispatch is handled by signalEngine.ts when a signal fires.
 * This module exports the config accessors and sendTelegramAlert() for that.
 */

import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── Config ────────────────────────────────────────────────────────────────────

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

// Initialize from environment (set via Replit Secrets)
let telegramConfig: TelegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  chatId:   process.env.TELEGRAM_CHAT_ID   ?? "",
  enabled:  !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
};

export function getTelegramConfig(): TelegramConfig {
  return { ...telegramConfig };
}

// ── Alert sender ──────────────────────────────────────────────────────────────

export async function sendTelegramAlert(
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) {
    return { ok: false, error: "Telegram not configured or disabled" };
  }
  try {
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text: message, parse_mode: "HTML" }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.description ?? "Telegram error" };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Legacy format (kept for /test route) ─────────────────────────────────────

export function formatSignalAlert(signal: {
  optionSignalType: string; instrument: string; strikePrice: number | null;
  optionType: string; expiry: string | null;
  entry: number; stopLoss: number; target1: number; target2: number;
  riskReward: number; confidenceScore: number; smcSetup: string; optionLtp: number | null;
}): string {
  const emoji: Record<string, string> = {
    CALL_BUY: "🟢 CALL BUY", PUT_BUY: "🔴 PUT BUY",
    CALL_SELL: "🟡 CALL SELL", PUT_SELL: "🔵 PUT SELL",
  };
  return [
    `<b>🎯 NIFTY AI SIGNAL — ${emoji[signal.optionSignalType] ?? signal.optionSignalType}</b>`,
    ``,
    `<b>Instrument:</b> ${signal.instrument} ${signal.strikePrice ?? ""}${signal.optionType} ${signal.expiry ?? ""}`,
    `<b>Option LTP:</b> ₹${signal.optionLtp?.toFixed(2) ?? "—"}`,
    ``,
    `<b>📌 Entry:</b>    ₹${signal.entry.toFixed(2)}`,
    `<b>🛑 Stop Loss:</b> ₹${signal.stopLoss.toFixed(2)}`,
    `<b>🎯 Target 1:</b> ₹${signal.target1.toFixed(2)}`,
    `<b>🎯 Target 2:</b> ₹${signal.target2.toFixed(2)}`,
    `<b>⚖️  Risk:Reward:</b> 1:${signal.riskReward.toFixed(1)}`,
    ``,
    `<b>🤖 Confidence:</b> ${signal.confidenceScore.toFixed(1)}%`,
    `<b>📊 ICT Setup:</b> ${signal.smcSetup}`,
    ``,
    `<i>⚠️ Educational use only. Not financial advice.</i>`,
  ].join("\n");
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /signals/telegram/status
router.get("/signals/telegram/status", (_req, res) => {
  const cfg = getTelegramConfig();
  res.json({
    enabled: cfg.enabled,
    configured: !!(cfg.botToken && cfg.chatId),
    chatId: cfg.chatId ? `***${cfg.chatId.slice(-4)}` : "",
    source: cfg.botToken ? "configured" : "not_set",
  });
});

// POST /signals/telegram/config — runtime update (overrides env)
router.post("/signals/telegram/config", (req, res): void => {
  const { botToken, chatId, enabled } = req.body as Partial<TelegramConfig>;
  if (botToken !== undefined) telegramConfig.botToken = botToken;
  if (chatId   !== undefined) telegramConfig.chatId   = chatId;
  if (enabled  !== undefined) telegramConfig.enabled  = enabled;
  res.json({
    success: true,
    enabled: telegramConfig.enabled,
    configured: !!(telegramConfig.botToken && telegramConfig.chatId),
  });
});

// POST /signals/telegram/test
router.post("/signals/telegram/test", async (_req, res): Promise<void> => {
  const result = await sendTelegramAlert(
    "<b>✅ Nifty AI Auto Signals — Test Alert</b>\n\nYour Telegram integration is working correctly.\n\n<i>High-confidence signals (≥90%) will appear here automatically.</i>"
  );
  res.json(result);
});

export default router;
