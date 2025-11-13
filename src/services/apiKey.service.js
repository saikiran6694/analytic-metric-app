import pool from "../config/database.config.js";
import { ApiKeyUtils } from "../utils/apikey-utils.js";

export class ApiKeyService {
  /**
   * Register a new application and generate an API Key
   * @param {string} appName - Name of the application
   * @param {string} appUrl - URL of the application
   * @param {string} userId - ID of the user registering the application
   * @returns {Promise<Object>} The registered application details along with the API key
   */
  static async registerApp(appName, appUrl, userId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Normalize URL to prevent duplicates like `https://testapp.com/`
      const normalizedUrl = appUrl.trim().toLowerCase();

      // Check for existing app for the same user
      const existingApp = await client.query("SELECT id FROM apps WHERE user_id = $1 AND LOWER(app_url) = $2", [userId, normalizedUrl]);

      if (existingApp.rows.length > 0) {
        throw new Error("App with this URL already registered for this user");
      }

      // Insert new app
      const appResult = await client.query(
        `INSERT INTO apps (app_name, app_url, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, app_name, app_url, created_at`,
        [appName, normalizedUrl, userId]
      );

      const app = appResult.rows[0];

      // Generate API key
      const apiKey = ApiKeyUtils.generateApiKey();
      const keyHash = ApiKeyUtils.hashApiKey(apiKey);
      const keyPrefix = ApiKeyUtils.maskApiKey(apiKey);

      // Store hashed API key
      await client.query(
        `INSERT INTO api_keys (app_id, key_hash, key_prefix, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 year')`,
        [app.id, keyHash, keyPrefix]
      );

      await client.query("COMMIT");

      return {
        app_id: app.id,
        app_name: app.app_name,
        app_url: app.app_url,
        api_key: apiKey, // Only shown once
        created_at: app.created_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve API key for a given appId
   * @param {string} appId - ID of the application
   * @returns {Promise<Object>} The API key details
   */
  static async getApiKeyByAppId(appId) {
    const result = await pool.query(
      `SELECT 
        ak.key_prefix,
        ak.is_active,
        ak.created_at,
        ak.expires_at,
        ak.last_used_at,
        a.app_name,
        a.app_url
       FROM api_keys ak
       JOIN apps a ON ak.app_id = a.id
       WHERE ak.app_id = $1 AND ak.is_active = true
       ORDER BY ak.created_at DESC
       LIMIT 1`,
      [appId]
    );

    if (result.rows.length === 0) {
      throw new Error("No active API key found for this app");
    }

    const key = result.rows[0];

    return {
      app_id: appId,
      app_name: key.app_name,
      app_url: key.app_url,
      key_prefix: ApiKeyUtils.maskApiKey(key.key_prefix),
      is_active: key.is_active,
      created_at: key.created_at,
      expires_at: key.expires_at,
      last_used_at: key.last_used_at,
      note: "For security reasons, the full API key is only shown once during registration",
    };
  }

  /**
   * Revoke an API key
   * @param {string} appKey - The API key to revoke
   * @returns {Promise<void>}
   */
  static async revokeApiKey(apiKey) {
    const keyHash = ApiKeyUtils.hashApiKey(apiKey);

    const result = await pool.query(
      `UPDATE api_keys 
       SET is_active = false, revoked_at = NOW() 
       WHERE key_hash = $1 AND is_active = true
       RETURNING app_id, key_prefix`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      throw new Error("API key not found or already revoked");
    }

    return {
      app_id: result.rows[0].app_id,
      key_prefix: result.rows[0].key_prefix + "***************************",
      revoked_at: new Date(),
      message: "API key successfully revoked",
    };
  }

  /**
   * Validate the api key for authentication
   * @param {string} apiKey - The API key to validate
   * @return {Promise<Object|null>} The associated app details if valid, otherwise null
   */
  static async validateApiKey(apiKey) {
    const keyHash = ApiKeyUtils.hashApiKey(apiKey);

    const result = await pool.query(
      `SELECT 
        ak.id,
        ak.app_id,
        ak.expires_at,
        a.app_name,
        a.app_url,
        a.user_id
       FROM api_keys ak
       JOIN apps a ON ak.app_id = a.id
       WHERE ak.key_hash = $1 
         AND ak.is_active = true 
         AND ak.expires_at > NOW()`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update last_used_at (async, non-blocking)
    pool
      .query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [result.rows[0].id])
      .catch((err) => console.error("Error updating last_used_at:", err));

    return result.rows[0];
  }

  /**
   * Regenerate a new API key for an existing application
   * @param {string} appId - ID of the application
   * @param {string} userId - ID of the user requesting regeneration
   * @returns {Promise<Object>} The new API key details
   */
  static async regenerateApiKey(appId, userId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Verify the app belongs to the user
      const appResult = await client.query(`SELECT id FROM apps WHERE id = $1 and user_id = $2`, [appId, userId]);

      if (appResult.rows.length === 0) {
        throw new Error("App not found or unauthorized");
      }

      // Deactivate existing API keys
      await client.query(`UPDATE api_keys SET is_active = false, revoked_at = NOW() WHERE app_id = $1 AND is_active = true`, [appId]);

      // Generate new API key
      const apiKey = ApiKeyUtils.generateApiKey();
      const keyHash = ApiKeyUtils.hashApiKey(apiKey);
      const keyPrefix = ApiKeyUtils.maskApiKey(apiKey);

      // Store new hashed API key
      await client.query(
        `INSERT INTO api_keys (app_id, key_hash, key_prefix, expires_at) 
         VALUES ($1, $2, $3, NOW() + INTERVAL '1 year')`,
        [appId, keyHash, keyPrefix]
      );

      await client.query("COMMIT");

      return {
        app_id: appId,
        api_key: apiKey,
        created_at: new Date(),
        message: "New API key generated. Previous keys have been revoked.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
