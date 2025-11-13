import { Pool } from "pg";
import { env } from "./env.config.js";

const pool = new Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT) || 5432,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: Number(env.DB_MAX_POOL_SIZE) || 10,
  idleTimeoutMillis: Number(env.DB_MAX_IDLE_TIME) || 30000,
  connectionTimeoutMillis: Number(env.DB_CONNECTION_TIMEOUT) || 15000,
});

pool.on("connect", () => console.log("✅ Connected to PostgreSQL via Neon"));
pool.on("error", (err) => console.error("❌ Unexpected database error:", err));

export default pool;
