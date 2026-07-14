/**
 * Telegram alert configuration and dispatch.
 * Prepared for live NSE data integration — when a real signal fires,
 * sendTelegramAlert() is called automatically from the signals route.
 *
 * NSE Live Data Integration note:
 *   Replace generateTradeSignals() with a real NSE feed adapter (e.g. Breeze API,
 *   Shoonya, Zerodha Kite) and wire the same Telegram dispatch.
 */

import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

// In-memory config — swap for DB/env persistence in production
let telegramConfig: TelegramConfig = {
  botToken: "",
  chatId: "",
  enabled: false,
};

export function getTelegramConfig(): TelegramConfig {
  return { ...telegramConfig };
}

export async function sendTelegramAlert(message: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) {
    return { ok: false, error: "Telegram not configured or disabled" };
  }
  try {
    const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description ?? "Unknown Telegram error" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export function formatSignalAlert(signal: {
  optionSignalType: string; instrument: string; strikePrice: number | null;
  optionType: string; expiry: string | null;
  entry: number; stopLoss: number; target1: number; target2: number;
  riskReward: number; confidenceScore: number; smcSetup: string; optionLtp: number | null;
}): string {
  const emoji = {
    CALL_BUY: "🟢 CALL BUY", PUT_BUY: "🔴 PUT BUY",
    CALL_SELL: "🟡 CALL SELL", PUT_SELL: "🔵 PUT SELL",
  }[signal.optionSignalType] ?? signal.optionSignalType;

  return [
    `<b>🎯 NIFTY AI SIGNAL — ${emoji}</b>`,
    ``,
    `<b>Instrument:</b> ${signal.instrument} ${signal.strikePrice ?? ""}${signal.optionType} ${signal.expiry ?? ""}`,
    `<b>Option LTP:</b> ₹${signal.optionLtp?.toFixed(2) ?? "—"}`,
    ``,
    `<b>📌 Entry:</b>  ₹${signal.entry.toFixed(2)}`,
    `<b>🛑 Stop Loss:</b> ₹${signal.stopLoss.toFixed(2)}`,
    `<b>🎯 Target 1:</b> ₹${signal.target1.toFixed(2)}`,
    `<b>🎯 Target 2:</b> ₹${signal.target2.toFixed(2)}`,
    `<b>⚖️  Risk:Reward:</b> 1:${signal.riskReward.toFixed(1)}`,
    ``,
    `<b>🤖 Confidence:</b> ${signal.confidenceScore.toFixed(1)}%`,
    `<b>📊 Setup:</b> ${signal.smcSetup}`,
    ``,
    `<i>⚠️ For educational purposes only. Not financial advice.</i>`,
  ].join("\n");
}

// GET /signals/telegram/status
router.get("/signals/telegram/status", (_req, res) => {
  const cfg = getTelegramConfig();
  res.json({
    enabled: cfg.enabled,
    configured: !!(cfg.botToken && cfg.chatId),
    chatId: cfg.chatId ? `***${cfg.chatId.slice(-4)}` : "",
  });
});

// POST /signals/telegram/config
router.post("/signals/telegram/config", (req, res): void => {
  const { botToken, chatId, enabled } = req.body as Partial<TelegramConfig>;
  if (botToken !== undefined) telegramConfig.botToken = botToken;
  if (chatId !== undefined) telegramConfig.chatId = chatId;
  if (enabled !== undefined) telegramConfig.enabled = enabled;
  res.json({ success: true, enabled: telegramConfig.enabled, configured: !!(telegramConfig.botToken && telegramConfig.chatId) });
});

// POST /signals/telegram/test
router.post("/signals/telegram/test", async (_req, res): Promise<void> => {
  const result = await sendTelegramAlert(
    "<b>✅ Nifty AI Auto Signals — Test Alert</b>\n\nYour Telegram integration is working correctly.\n\n<i>Live signals will appear here when confidence ≥ 90%.</i>"
  );
  res.json(result);
});

export default router;
