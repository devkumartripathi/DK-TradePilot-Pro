import { Router, type IRouter } from "express";
import {
  GetNiftyDataResponse,
  GetCandlesResponse,
  GetCandlesQueryParams,
  GetVwapResponse,
} from "@workspace/api-zod";
import {
  generateNiftyData,
  generateCandles,
  generateVwap,
} from "../lib/marketData";

const router: IRouter = Router();

router.get("/market/nifty", async (_req, res): Promise<void> => {
  const data = await generateNiftyData();
  res.json(GetNiftyDataResponse.parse(data));
});

router.get("/market/candles", async (req, res): Promise<void> => {
  const parsed = GetCandlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { timeframe, limit } = parsed.data;
  const candles = generateCandles(timeframe ?? "5m", limit ?? 100);
  res.json(GetCandlesResponse.parse(candles));
});

router.get("/market/vwap", async (_req, res): Promise<void> => {
  const data = generateVwap();
  res.json(GetVwapResponse.parse(data));
});

export default router;
