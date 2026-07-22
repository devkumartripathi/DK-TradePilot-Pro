import { Router } from "express";
import axios from "axios";
import crypto from "crypto";

import { fyers } from "../lib/fyersClient";
import { setAccessToken, getAccessToken } from "../lib/tokenStore";

import {
  getHistoryData,
  getOptionChain,
} from "../services/marketData";

import {
  buildIndicators,
  Candle,
} from "../services/indicators/indicatorEngine";

import { getTrend } from "../services/trendEngine";
import { analyzeOptionChain } from "../services/optionChainAnalyzer";
import { analyzeOI } from "../services/oiAnalyzer";

const router = Router();

/* =======================================================
   FYERS LOGIN
======================================================= */

router.get("/fyers/login", (_req, res) => {
  const appId = process.env.FYERS_APP_ID!;
  const redirectUri = encodeURIComponent(
    process.env.FYERS_REDIRECT_URI!
  );

  const loginUrl =
    `https://api-t1.fyers.in/api/v3/generate-authcode` +
    `?client_id=${appId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&state=DKTradePilot`;

  res.redirect(loginUrl);
});

/* =======================================================
   FYERS CALLBACK
======================================================= */

router.get("/fyers/callback", async (req, res) => {
  try {
    const authCode = req.query.auth_code as string;

    if (!authCode) {
      return res.status(400).json({
        error: "auth_code not found",
      });
    }

    const appId = process.env.FYERS_APP_ID!;
    const secret = process.env.FYERS_SECRET_KEY!;

    const appIdHash = crypto
      .createHash("sha256")
      .update(`${appId}:${secret}`)
      .digest("hex");

    const response = await axios.post(
      "https://api.fyers.in/api/v2/validate-authcode",
      {
        grant_type: "authorization_code",
        appIdHash,
        code: authCode,
      }
    );

    const accessToken = response.data.access_token;

    setAccessToken(accessToken);

    fyers.setAccessToken(accessToken);

    res.json({
      success: true,
      accessToken,
    });
  } catch (err: any) {
    console.error(err.response?.data || err);

    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
});

/* =======================================================
   PROFILE
======================================================= */

router.get("/fyers/profile", async (_req, res) => {
  try {
    const token = getAccessToken();

    if (!token) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    fyers.setAccessToken(token);

    const profile = await fyers.get_profile();

    res.json(profile);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});
/* =======================================================
   QUOTES
======================================================= */

router.get("/fyers/quotes", async (_req, res) => {
  try {
    const token = getAccessToken();

    if (!token) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    fyers.setAccessToken(token);

    const quotes = await fyers.getQuotes([
      "NSE:NIFTY50-INDEX",
    ]);
    
console.log(JSON.stringify(quotes, null, 2));

    res.json(quotes);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/* =======================================================
   HISTORY
======================================================= */

router.get("/fyers/history", async (req, res) => {
  try {
    const token = getAccessToken();

    if (!token) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const symbol =
      (req.query.symbol as string) ??
      "NSE:NIFTY50-INDEX";

    const resolution =
      (req.query.resolution as string) ?? "5";

    const days = Number(req.query.days ?? "5");

    const to = new Date();
    const from = new Date();

    from.setDate(to.getDate() - days);

    const history = await getHistoryData(
      token,
      symbol,
      resolution,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    );

    res.json(history);
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/* =======================================================
   ANALYSIS
======================================================= */

router.get("/fyers/analysis", async (_req, res) => {
  try {
    const token = getAccessToken();

    if (!token) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const to = new Date();
    const from = new Date();

    from.setDate(to.getDate() - 5);

    const history = await getHistoryData(
      token,
      "NSE:NIFTY50-INDEX",
      "5",
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    );

    const candles: Candle[] = history.candles.map((c: any[]) => ({
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));

    const indicators = buildIndicators(candles);

    const optionChain = await getOptionChain("NSE:NIFTY50-INDEX");

    const optionAnalysis = analyzeOptionChain(optionChain);

    const oiAnalysis = analyzeOI(optionChain);

    const trend = getTrend(
      candles[candles.length - 1].close,
      indicators.ema8[indicators.ema8.length - 1],
      indicators.ema20[indicators.ema20.length - 1],
      indicators.ema50[indicators.ema50.length - 1],
      indicators.ema100[indicators.ema100.length - 1],
      indicators.rsi14[indicators.rsi14.length - 1]
    );

    res.json({
      symbol: "NSE:NIFTY50-INDEX",

      price: candles[candles.length - 1].close,

      trend,

      ema8: indicators.ema8[indicators.ema8.length - 1],
      ema20: indicators.ema20[indicators.ema20.length - 1],
      ema50: indicators.ema50[indicators.ema50.length - 1],
      ema100: indicators.ema100[indicators.ema100.length - 1],

      atr14: indicators.atr14[indicators.atr14.length - 1],
      rsi14: indicators.rsi14[indicators.rsi14.length - 1],

      optionChain,
      optionAnalysis,
      oiAnalysis,
    });
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;