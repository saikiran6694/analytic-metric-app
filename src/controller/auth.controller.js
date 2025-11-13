import { HTTPSTATUS } from "../config/http.config.js";
import { ApiKeyService } from "../services/apiKey.service.js";

/**
 * @route   POST /api/auth/register
 * @desc    Register new app and generate API key
 * @access  Public (should be protected by OAuth in production)
 */
export const registerAppController = async (req, res) => {
  try {
    const { app_name, app_url, user_id } = req.body;

    const result = await ApiKeyService.registerApp(app_name, app_url, user_id);

    res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "App registered successfully. Save your API key - it will not be shown again!",
      data: result,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.message.includes("already registered")) {
      return res.status(HTTPSTATUS.CONFLICT).json({
        success: false,
        error: error.message,
      });
    }

    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to register app",
    });
  }
};

/**
 * @route   POST /api/auth/revoke
 * @desc    Revoke an existing API key
 * @access  Protected
 */
export const revokeApiKeyController = async (req, res) => {
  try {
    const { api_key } = req.body;

    const result = await ApiKeyService.revokeApiKey(api_key);

    res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "API key revoked successfully",
      data: result,
    });
  } catch (error) {
    console.error("Revoke error:", error);

    if (error.message.includes("not found") || error.message.includes("already revoked")) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        success: false,
        error: error.message,
      });
    }

    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to revoke API key",
    });
  }
};

/**
 * @route   POST /api/auth/api-key
 * @descr   Get API key details for a given app ID
 * @access  Protected (user must own the app)
 */
export const getApiKeyController = async (req, res) => {
  try {
    const { app_id } = req.body;

    const result = await ApiKeyService.getApiKeyByAppId(app_id);

    res.json({
      success: true,
      message: "API key details retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get API key error:", error);

    console.log("error : ", error.message);

    if (error.message.includes("No active API key found for this app")) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        success: false,
        error: error.message,
      });
    }

    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to retrieve API key",
    });
  }
};

/**
 * @router POST /api/auth/regenerate
 * @desc Regenerate API key for an existing app
 * @access Protected (user must own the app)
 */
export const regenerateApiKeyController = async (req, res) => {
  try {
    const { app_id, user_id } = req.body;

    if (!app_id || !user_id) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        error: "App ID and User ID are required",
      });
    }

    const result = await ApiKeyService.regenerateApiKey(app_id, user_id);

    res.json({
      success: true,
      message: "API key regenerated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Regenerate error:", error);

    if (error.message.includes("not found") || error.message.includes("unauthorized")) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        success: false,
        error: error.message,
      });
    }

    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to regenerate API key",
    });
  }
};
