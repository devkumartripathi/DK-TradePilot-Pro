/**
 * Trade signals routes.
 * Uses the new modular signal engine (ICT + scoring + broker adapter).
 */

import { Router, type IRouter } from "express";
import { GetTradeSignalsResponse } from "@workspace/api-zod";
import { generateSignals,getBrokerStatus,getActiveSignal,} from "../lib/signalEngine.js";
import { resetBroker } from "../lib/broker/index.js";

const router: IRouter = Router();

// GET /signals/trade — main signal endpoint
router.get("/signals/trade", async (_req, res): Promise<void> => {
  try {
    const result = await generateSignals();
    // Strip unknown fields via Zod, keeping schema-validated fields
    // passthrough() ensures extra fields (brokerSource, dataQuality) are preserved
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Signal engine error", message: err?.message ?? String(err) });
  }
});

// GET /signals/broker/status — which broker is active
router.get("/signals/broker/status", async (_req, res): Promise<void> => {
  try {
    const status = await getBrokerStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /signals/refresh
router.post("/signals/refresh", async (_req, res): Promise<void> => {
  try {
    const active = getActiveSignal(); 
console.log("ACTIVE SIGNAL =", active);

if (active) {
  res.json({
    success: true,
    source: "cache",
    signal: active,
  });
  return;
}
const result = await generateSignals();

res.json({
  success: true,
  source: "engine",
  signal: result.signals?.find(
    (s) => s.status === "ACTIVE"
  ) ?? null,
});

return;

  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message ?? String(err),
    });
  }
});

// POST /signals/broker/reset — force re-initialization (call after updating tokens)

router.post("/signals/broker/reset", (_req, res): void => {
  resetBroker();
  res.json({ success: true, message: "Broker adapter reset. Next request will re-initialize." });
});

export default router;
