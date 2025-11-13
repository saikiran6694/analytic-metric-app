import rateLimit from "express-rate-limit";

export const apiKeyManagementRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many api key management requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit for event submissions (e.g., clicks, referrer info, visits etc)
export const eventRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute per IP
  message: {
    success: false,
    message: "Too many event submissions, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit for analytics endpoints (event-summary / user-stats)
export const analyticsRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Max 20 requests every 5 minutes
  message: {
    success: false,
    message: "Too many analytics requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
