import { Router, type IRouter } from "express";
import { GetTradeSignalsResponse } from "@workspace/api-zod";
import { generateTradeSignals, getNiftyLtp } from "../lib/marketData";

const router: IRouter = Router();

router.get("/signals/trade", async (_req, res): Promise<void> => {
  const spotPrice = getNiftyLtp();
  const signals = generateTradeSignals(spotPrice);
  res.json(GetTradeSignalsResponse.parse(signals));
});

export default router;
