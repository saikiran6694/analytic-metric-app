import { validationResult, body } from "express-validator";
import { HTTPSTATUS } from "../config/http.config.js";

export const validateEvent = [
  body("event")
    .trim()
    .notEmpty()
    .withMessage("Event type is required")
    .isLength({ max: 100 })
    .withMessage("Event type must not exceed 100 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Event type can only contain letters, numbers, underscores, and hyphens"),

  body("url").optional().trim().isURL({ require_protocol: true }).withMessage("URL must be valid with protocol"),

  body("referrer").optional().trim().isURL({ require_protocol: true }).withMessage("Referrer must be valid URL"),

  body("device")
    .optional()
    .trim()
    .isIn(["mobile", "desktop", "tablet", "other"])
    .withMessage("Device must be one of: mobile, desktop, tablet, other"),

  body("timestamp").optional().isISO8601().withMessage("Timestamp must be valid ISO 8601 format"),

  body("metadata").optional().isObject().withMessage("Metadata must be a valid JSON object"),

  body("ipAddress").optional().trim().isIP().withMessage("IP address must be valid"),

  body("session_id").optional().trim().isLength({ max: 100 }).withMessage("Session ID must be less than 100 characters"),

  body("user_id").optional().trim().isLength({ max: 100 }).withMessage("User ID must be less than 100 characters"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];
