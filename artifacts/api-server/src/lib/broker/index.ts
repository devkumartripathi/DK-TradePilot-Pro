/**
 * Broker factory.
 * Returns the Kite adapter when KITE_API_KEY + KITE_ACCESS_TOKEN are set and
 * the API responds. Falls back to the Simulator otherwise.
 *
 * Set BROKER=simulator to force simulator mode regardless of credentials.
 */

import type { BrokerAdapter } from "./adapter.js";
import { KiteAdapter }       from "./kiteAdapter.js";
import { SimulatorAdapter }  from "./simulatorAdapter.js";
import { logger }            from "../logger.js";

let _adapter: BrokerAdapter | null = null;

export async function getBroker(): Promise<BrokerAdapter> {
  if (_adapter) return _adapter;

  // Force simulator via env
  if (process.env.BROKER === "simulator") {
    logger.info("Broker: forced simulator mode via BROKER env var");
    _adapter = new SimulatorAdapter();
    return _adapter;
  }

  // Try Kite if credentials are present
  if (process.env.KITE_API_KEY && process.env.KITE_ACCESS_TOKEN) {
    const kite = new KiteAdapter();
    const available = await kite.isAvailable().catch(() => false);
    if (available) {
      logger.info("Broker: Zerodha Kite Connect — live data active");
      _adapter = kite;
      return _adapter;
    }
    logger.warn("Broker: Kite credentials present but API check failed — falling back to simulator");
  }

  logger.info("Broker: using simulator (set KITE_API_KEY + KITE_ACCESS_TOKEN to enable live data)");
  _adapter = new SimulatorAdapter();
  return _adapter;
}

/** Reset cached adapter (used when credentials change at runtime). */
export function resetBroker(): void {
  _adapter = null;
}

export type { BrokerAdapter };
