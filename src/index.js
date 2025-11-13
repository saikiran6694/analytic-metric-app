import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { corsConfig } from "./config/cors.config.js";
import { env } from "./config/env.config.js";
import authRoutes from "./routes/auth.route.js";
import analyticsRoutes from "./routes/analytics.route.js";

const app = express();
const PORT = env.PORT;

app.use(helmet());
app.use(express.json());
app.use(corsConfig());

app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Analytics API server running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV || "development"}`);
});

export default app;
