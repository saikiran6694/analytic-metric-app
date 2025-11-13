import { HTTPSTATUS } from "../config/http.config.js";
import { ApiKeyService } from "../services/apiKey.service.js";

/**
 * middleware to authenticate requests using API key
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
export const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    //   Check for API key in headers
    if (!apiKey) {
      return res.status(HTTPSTATUS.UNAUTHORIZED).json({
        success: false,
        error: "API key is required. Please provide it in x-api-key header or Authorization Bearer token",
      });
    }

    //   Validate API key
    const keyData = await ApiKeyService.validateApiKey(apiKey);

    // Attach app info to request
    req.app_id = keyData.app_id;
    req.app_name = keyData.app_name;
    req.user_id = keyData.user_id;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Authentication failed",
    });
  }
};
