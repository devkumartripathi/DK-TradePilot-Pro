import { Router, type IRouter } from "express";

console.log("OPTIONS ROUTER LOADED");

import {
  GetOptionsMetricsResponse,
} from "@workspace/api-zod";

import {
  generateLiveOptionChain,
  generateOptionsMetrics,
  getNiftyLtp,
} from "../lib/marketData";

import { analyzeOptionChain } from "../services/optionChainAnalyzer";
import { getOptionChain } from "../services/marketData";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/options/chain", async (_req, res): Promise<void> => {
  const chain = await generateLiveOptionChain();
  res.json(chain);
});

router.get("/options/metrics", async (_req, res): Promise<void> => {
  const spotPrice = getNiftyLtp();

  console.log("STEP 1");

  const optionChain = await getOptionChain("NSE:NIFTY50-INDEX");

  console.log("STEP 2");
  console.log("Option Chain Loaded");
  console.log(optionChain);
  console.log("EXPIRY DATA =", optionChain.data.expiryData);


  const optionAnalysis = analyzeOptionChain(optionChain);

  logger.info(
    {
      pcr: optionAnalysis.pcr,
      totalCallOI: optionAnalysis.totalCallOI,
      totalPutOI: optionAnalysis.totalPutOI,
    },
    "PCR CHECK",
  );

  console.log(optionAnalysis);
const expiries = optionChain.data.expiryData.map(
  (e: any) => e.date
);

const metrics = await generateOptionsMetrics(
  spotPrice,
  expiries
);

// Live Metrics
metrics.pcr = optionAnalysis.pcr;
metrics.totalCallOI = optionAnalysis.totalCallOI;
metrics.totalPutOI = optionAnalysis.totalPutOI;
metrics.maxPain = optionAnalysis.maxPain;
res.json(GetOptionsMetricsResponse.parse(metrics));
});

export default router;