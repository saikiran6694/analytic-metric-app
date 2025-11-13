import { getEnv } from "../utils/get-env.js";

const envConfig = () => ({
  PORT: getEnv("PORT", 8000),
  NODE_ENV: getEnv("NODE_ENV", "development"),

  DB_HOST: getEnv("DB_HOST"),
  DB_PORT: getEnv("DB_PORT"),
  DB_NAME: getEnv("DB_NAME"),
  DB_USER: getEnv("DB_USER"),
  DB_PASSWORD: getEnv("DB_PASSWORD"),
  DB_SSL: getEnv("DB_SSL", "false") === "true",
  DB_MAX_POOL_SIZE: getEnv("DB_MAX_POOL_SIZE", 30),
  DB_MAX_IDLE_TIME: getEnv("DB_MAX_IDLE_TIME", 30000),
  DB_CONNECTION_TIMEOUT: getEnv("DB_CONNECTION_TIMEOUT", 2000),

  RENDER_PRODUCTION_URL: getEnv("RENDER_EXTERNAL_URL"),

  ALLOWED_ORIGINS: getEnv("ALLOWED_ORIGINS", ""),
});

export const env = envConfig();
