import { Router, type IRouter } from "express";
import { GetSmcAnalysisResponse } from "@workspace/api-zod";
import { generateSmcAnalysis } from "../lib/marketData";

const router: IRouter = Router();

router.get("/smc/analysis", async (_req, res): Promise<void> => {
  const analysis = generateSmcAnalysis();
  res.json(GetSmcAnalysisResponse.parse(analysis));
});

export default router;
