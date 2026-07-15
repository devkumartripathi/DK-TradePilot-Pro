/**
 * BrokerAdapter interface.
 * Any live broker (Zerodha Kite, Shoonya, Breeze) or the Simulator
 * implements this single interface. The rest of the engine is broker-agnostic.
 *
 * ZERODHA KITE: Implemented in kiteAdapter.ts
 * SIMULATOR:    Implemented in simulatorAdapter.ts
 */

import type { BrokerMarketData } from "./types.js";

export interface BrokerAdapter {
  /** Human-readable name for logging / UI */
  readonly name: string;

  /** "kite" | "simulator" — used in signal metadata */
  readonly source: "kite" | "simulator";

  /**
   * Returns true if the adapter is properly configured and can fetch live data.
   * Always true for simulator.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Fetch all data needed to run the signal engine in one call.
   * Adapters should batch-fetch internally for efficiency.
   */
  getMarketData(): Promise<BrokerMarketData>;
}
