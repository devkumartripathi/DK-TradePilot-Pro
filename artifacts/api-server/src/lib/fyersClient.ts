import { fyersModel } from "fyers-api-v3";

export const fyers = new fyersModel({
  path: "./logs",
  enableLogging: true,
});

fyers.setAppId(process.env.FYERS_APP_ID!);
fyers.setRedirectUrl(process.env.FYERS_REDIRECT_URI!);