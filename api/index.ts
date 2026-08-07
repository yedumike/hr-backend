import "reflect-metadata"; // must stay first, same rule as app.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { AppDataSource } from "../src/data-source";
import authRoutes from "../src/routes/auth.routes";
import departmentRoutes from "../src/routes/department.routes";
import employeeRoutes from "../src/routes/employee.routes";
import dashboardRoutes from "../src/routes/dashboard.routes";
import auditRoutes from "../src/routes/audit.routes";
import educationRoutes from "../src/routes/education.routes";
import certificationRoutes from "../src/routes/certification.routes";
import dependentRoutes from "../src/routes/dependent.routes";
import emergencyContactRoutes from "../src/routes/emergency-contact.routes";
import documentRoutes from "../src/routes/document.routes";

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

// Native Express parsers work perfectly now without serverless-http breaking the stream
app.use(express.json());
app.use(cookieParser());

// Database connection middleware runs on every Vercel invocation
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
      console.log("Database connected natively");
    } catch (err) {
      console.error("Failed to connect to database:", err);
      return res.status(500).json({ error: "Database initialization error" });
    }
  }
  next();
});

app.use("/auth", authRoutes);
app.use("/departments", departmentRoutes);
app.use("/employees", employeeRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/audit-logs", auditRoutes);
app.use("/employees", employeeRoutes);
app.use("/education", educationRoutes); // both routers share the /employees base
app.use("/certifications", certificationRoutes);
app.use("/dependents", dependentRoutes);
app.use("/emergency-contacts", emergencyContactRoutes);
app.use("/documents", documentRoutes);

// Export the native Express app instance directly. Vercel routes traffic to it seamlessly.
export default app;
