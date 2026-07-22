import serverless from "serverless-http";
import app from "../src/app";
import { AppDataSource } from "../src/data-source";

// Vercel functions are stateless and can be reused across invocations ("warm starts"),
// so we track whether the DB connection is already open to avoid reconnecting on every request
let isInitialized = false;

const handler = serverless(app);

export default async (req: any, res: any) => {
  if (!isInitialized) {
    await AppDataSource.initialize();
    isInitialized = true;
  }
  return handler(req, res);
};
