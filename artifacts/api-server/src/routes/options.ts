import { Router, type IRouter } from "express";
import {
  GetOptionChainResponse,
  GetOptionsMetricsResponse,
} from "@workspace/api-zod";
import { generateOptionChain, generateOptionsMetrics, getNiftyLtp } from "../lib/marketData";

const router: IRouter = Router();

router.get("/options/chain", async (_req, res): Promise<void> => {
  const spotPrice = getNiftyLtp();
  const chain = generateOptionChain(spotPrice);
  res.json(GetOptionChainResponse.parse(chain));
});

router.get("/options/metrics", async (_req, res): Promise<void> => {
  const spotPrice = getNiftyLtp();
  const metrics = generateOptionsMetrics(spotPrice);
  res.json(GetOptionsMetricsResponse.parse(metrics));
});

export default router;
