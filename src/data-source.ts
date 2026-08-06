import "reflect-metadata";
import "pg"; // forces Vercel's bundler to include the pg package in the serverless function — TypeORM loads it dynamically otherwise, which the bundler can't detect
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
// 1. Explicitly import the entity classes
import { User } from "./entities/User";
import { Department } from "./entities/Department";
import { Employee } from "./entities/Employee";
import { Role } from "./entities/Role";
import { AuditLog } from "./entities/AuditLog";
import { EducationRecord } from "./entities/EducationRecord";
import { Certification } from "./entities/Certification";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .env");
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl, // now typed as `string`, not `string | undefined`
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  logging: true,
  entities: [
    User,
    Department,
    Employee,
    Role,
    AuditLog,
    EducationRecord,
    Certification,
  ],
  // migrations: ["src/migrations/*.ts"],
  // migrations: [],
  migrations: process.env.VERCEL ? [] : ["src/migrations/*.ts"],
});
