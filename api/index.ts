import "reflect-metadata"; // must stay first, same rule as app.ts
import serverless from "serverless-http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { AppDataSource } from "../src/data-source";
import authRoutes from "../src/routes/auth.routes";
import departmentRoutes from "../src/routes/department.routes";
import employeeRoutes from "../src/routes/employee.routes";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not set in environment variables");
}

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/departments", departmentRoutes);
app.use("/employees", employeeRoutes);

// Serverless functions are stateless between invocations, so we can't rely
// on "initialize once at startup" the way app.ts does for local dev.
// Instead, we track whether the DB connection is already open, and only
// initialize it if it isn't — this avoids errors from trying to open
// the same connection twice across multiple function calls.
let isInitialized = false;

async function ensureDbConnection() {
  if (!isInitialized) {
    await AppDataSource.initialize();
    isInitialized = true;
  }
}

// wrap the whole thing so every request first confirms the DB is connected,
// then hands off to serverless-http to translate the request/response
// into the format Vercel's function runtime expects
const handler = serverless(app);

export default async function (req: any, res: any) {
  await ensureDbConnection();
  return handler(req, res);
}
