export type Instrument = "NIFTY" | "BANKNIFTY" | "SENSEX";

export const CONFIG_VERSION = 1;

export interface InstrumentConfig {
  id: string;
  instrument: Instrument;

  exchange: "NSE" | "BSE";

  lotSize: number;
  strikeStep: number;
  tickSize: number;

  autoSync: boolean;
  enabled: boolean;

  lastSync?: string;

  source?: "AUTO" | "FYERS" | "CACHE" | "MANUAL";
}

export const DEFAULT_INSTRUMENTS: InstrumentConfig[] = [
  {
 
    id: "NIFTY",
instrument: "NIFTY",
exchange: "NSE",
spotSymbol: "NSE:NIFTY50-INDEX",
optionPrefix: "NIFTY",

    id: "NIFTY",
    instrument: "NIFTY",
    exchange: "NSE",
    lotSize: 65,
    strikeStep: 50,
    tickSize: 0.05,
    autoSync: true,
    enabled: true,
    source: "AUTO",
  },
  {
   id: "BANKNIFTY",
instrument: "BANKNIFTY",
exchange: "NSE",
spotSymbol: "NSE:NIFTYBANK-INDEX",
optionPrefix: "BANKNIFTY",
   
    id: "BANKNIFTY",
    instrument: "BANKNIFTY",
    exchange: "NSE",
    lotSize: 25,
    strikeStep: 100,
    tickSize: 0.05,
    autoSync: true,
    enabled: true,
    source: "AUTO",
  },
  {
   id: "SENSEX",
instrument: "SENSEX",
exchange: "BSE",
spotSymbol: "BSE:SENSEX-INDEX",
optionPrefix: "SENSEX",

    id: "SENSEX",
    instrument: "SENSEX",
    exchange: "BSE",
    lotSize: 20,
    strikeStep: 100,
    tickSize: 0.05,
    autoSync: true,
    enabled: true,
    source: "AUTO",
  },
];
export function getInstrumentConfig(instrument: Instrument): InstrumentConfig {
  const config = DEFAULT_INSTRUMENTS.find(
    (item) => item.instrument === instrument
  );

  if (!config) {
    throw new Error(`Instrument configuration not found: ${instrument}`);
  }

  return config;
}