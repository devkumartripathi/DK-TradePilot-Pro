import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketRouter from "./market";
import smcRouter from "./smc";
import optionsRouter from "./options";
import signalsRouter from "./signals";
import telegramRouter from "./telegram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketRouter);
router.use(smcRouter);
router.use(optionsRouter);
router.use(signalsRouter);
router.use(telegramRouter);

export default router;
