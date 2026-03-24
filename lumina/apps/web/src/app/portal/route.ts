import { Portal } from "@creem_io/nextjs";

export const GET = Portal({
  apiKey: process.env.CREEM_API_KEY!,
  testMode: process.env.NODE_ENV !== "production",
});
