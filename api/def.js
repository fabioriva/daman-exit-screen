import { loadEnvFile } from "node:process";
import { readConfig } from "./config.js";

// Resolve from this module so development and PM2 use the same root .env.
try {
  loadEnvFile(new URL("../.env", import.meta.url));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

export const { HTTP, PLC, DATA_READ } = readConfig(process.env);
