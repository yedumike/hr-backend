import "reflect-metadata"; // must stay the very first import
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import authRoutes from "./routes/auth.routes";
import departmentRoutes from "./routes/department.routes";
import employeeRoutes from "./routes/employee.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import auditRoutes from "./routes/audit.routes";
import educationRoutes from "./routes/education.routes";
import certificationRoutes from "./routes/certification.routes";
import dependentRoutes from "./routes/dependent.routes";
import emergencyContactRoutes from "./routes/emergency-contact.routes";
import documentRoutes from "./routes/document.routes";
import searchRoutes from "./routes/search.routes";
import roleRoutes from "./routes/role.routes";
import permissionRoutes from "./routes/permission.routes";

dotenv.config();

const app = express();
//
// same pattern as before: fail loudly at startup if this env var is missing,
// rather than silently letting CORS misbehave later
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not set in .env");
}

// app.use(
//   cors({
//     origin: FRONTEND_URL, // only requests from this exact origin are allowed
//     credentials: true, // required so the browser sends/receives cookies cross-site
//   }),
// );

app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
  }),
);

app.use(express.json()); // parses incoming JSON bodies into req.body
app.use(cookieParser()); // parses cookies from incoming requests into req.cookies

app.use("/auth", authRoutes); // all routes in auth.routes.ts are now prefixed with /auth
// e.g. POST /auth/login, GET /auth/me
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
app.use("/search", searchRoutes);
app.use("/roles", roleRoutes);
app.use("/permissions", permissionRoutes);

// connect to the database first, and only start listening for requests
// once that succeeds — avoids the server accepting traffic before it can query anything
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(3000, () => console.log("Server running on port 3000"));
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });

export default app;
