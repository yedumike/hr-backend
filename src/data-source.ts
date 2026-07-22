import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
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
  entities: ["src/entities/*.ts"],
  migrations: ["src/migrations/*.ts"],
});