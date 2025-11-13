import { validationResult, body } from "express-validator";
import { HTTPSTATUS } from "../config/http.config.js";

export const validateRegister = [
  body("app_name")
    .trim()
    .notEmpty()
    .withMessage("App name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("App name must be between 3 and 100 characters"),

  body("app_url")
    .trim()
    .notEmpty()
    .withMessage("App URL is required")
    .isURL({ require_protocol: true })
    .withMessage("Must be a valid URL with protocol (http:// or https://)"),

  body("user_id").trim().notEmpty().withMessage("User ID is required"),

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

export const validatGetAPIKey = [
  body("app_id").trim().notEmpty().withMessage("App ID is required").isUUID().withMessage("App ID must be a valid UUID"),

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

export const validateRevoke = [
  body("api_key").trim().notEmpty().withMessage("API key is required").matches(/^sbx_/).withMessage("Invalid API key format"),

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
