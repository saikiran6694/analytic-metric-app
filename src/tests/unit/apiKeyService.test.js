import { ApiKeyService } from "../../services/apiKey.service.js";
import pool from "../../config/database.config.js";

describe("ApiKeyService", () => {
  /**
   * Tests for registering an application and generating an API key
   */
  describe("registerApp", () => {
    it("should register a new app and generate an API key", async () => {
      const result = await ApiKeyService.registerApp("Test App", "https://testapp.com", "user-123");

      expect(result).toHaveProperty("app_id");
      expect(result).toHaveProperty("app_name", "Test App");
      expect(result).toHaveProperty("app_url", "https://testapp.com");
      expect(result).toHaveProperty("api_key");
      expect(result.api_key).toMatch(/sbx_/);
      expect(result).toHaveProperty("created_at");
    });

    it("should store hashed API key in database", async () => {
      const result = await ApiKeyService.registerApp("Test App", "https://testapp.com", "user-123");

      const dbResult = await pool.query("SELECT key_hash, key_prefix FROM api_keys WHERE app_id = $1", [result.app_id]);

      expect(dbResult.rows[0].key_hash).not.toBe(result.api_key);
      expect(dbResult.rows[0].key_hash).toHaveLength(64);
      expect(result.api_key.startsWith("sbx_")).toBe(true);
    });
  });

  /**
   * Tests for getting API key details by AppId
   */
  describe("getApiKeyByAppId", () => {
    it("should retrieve API key details", async () => {
      const registered = await ApiKeyService.registerApp("Test App", "https://testapp.com", "user-123");

      const result = await ApiKeyService.getApiKeyByAppId(registered.app_id);

      expect(result).toHaveProperty("app_id", registered.app_id);
      expect(result).toHaveProperty("app_name", "Test App");
      expect(result).toHaveProperty("key_prefix");
      expect(result.key_prefix).toContain("***");
      expect(result).toHaveProperty("is_active", true);
    });

    it("should throw error for non-existent app", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      await expect(ApiKeyService.getApiKeyByAppId(fakeId)).rejects.toThrow("No active API key found");
    });

    it("should not return full API key", async () => {
      const registered = await ApiKeyService.registerApp("Test App", "https://testapp.com", "user-123");

      const result = await ApiKeyService.getApiKeyByAppId(registered.app_id);

      expect(result.key_prefix).not.toBe(registered.api_key);
      expect(result.key_prefix.length).toBe(registered.api_key.length);
    });
  });

  /**
   * Tests for revoking an API key
   */
  describe("revokeApiKey", () => {
    it("should revoke an active API key", async () => {
      const dummyRegistered = await ApiKeyService.registerApp("Dummy App", "https://dummyapp.com", "user-dummy");
      const result = await ApiKeyService.revokeApiKey(dummyRegistered.api_key);

      expect(result).toHaveProperty("message", "API key successfully revoked");
    });

    it("should mark key as inactive in database", async () => {
      const dummyRegistered = await ApiKeyService.registerApp("Dummy App", "https://dummyapp.com", "user-dummy");

      await ApiKeyService.revokeApiKey(dummyRegistered.api_key);

      const dbResult = await pool.query(`SELECT is_active FROM api_keys WHERE app_id = $1`, [dummyRegistered.app_id]);

      expect(dbResult.rows[0].is_active).toBe(false);
    });

    it("should throw error when revoking non-existent key", async () => {
      const fakeKey = "sbx_nonexistentkey123456789";

      await expect(ApiKeyService.revokeApiKey(fakeKey)).rejects.toThrow("not found or already revoked");
    });

    it("should throw error when revoking already revoked key", async () => {
      const registered = await ApiKeyService.registerApp("Test App", "https://testapp.com", "user-123");

      await ApiKeyService.revokeApiKey(registered.api_key);

      await expect(ApiKeyService.revokeApiKey(registered.api_key)).rejects.toThrow("not found or already revoked");
    });
  });

  /**
   * Test for validating an API key
   */
  describe("validateApiKey", () => {
    it("should validate a correct api key", async () => {
      const dummyRegistered = await ApiKeyService.registerApp("Dummy App", "https://dummyapp.com", "user-dummy");

      const result = await ApiKeyService.validateApiKey(dummyRegistered.api_key);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty("app_id", dummyRegistered.app_id);
      expect(result).toHaveProperty("app_name", "Dummy App");
      expect(result).toHaveProperty("user_id", "user-dummy");
    });

    it("should return null for invalid api key", async () => {
      const fakeApiKey = "sbx_invalidkey123456789";

      const result = await ApiKeyService.validateApiKey(fakeApiKey);

      expect(result).toBeNull();
    });

    it("should update last_used_at on successful validation", async () => {
      const dummyRegistered = await ApiKeyService.registerApp("Dummy App", "https://dummyapp.com", "user-dummy");

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await ApiKeyService.validateApiKey(dummyRegistered.api_key);

      // Give async update time to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const dbResult = await pool.query("SELECT last_used_at FROM api_keys WHERE app_id = $1", [dummyRegistered.app_id]);

      expect(dbResult.rows[0].last_used_at).not.toBeNull();
    });
  });

  /**
   * Test for regenerating an API Key
   */
  describe("regenerateApiKey", () => {
    it("should generate a new API key and revoke the old one", async () => {
      const userId = "user-123";

      const registered = await ApiKeyService.registerApp("Test App", "https://testapp.com", userId);

      const oldKey = registered.api_key;

      const result = await ApiKeyService.regenerateApiKey(registered.app_id, userId);

      expect(result).toHaveProperty("api_key");
      expect(result.api_key).not.toBe(oldKey);
      expect(result.api_key).toMatch(/sbx_/);

      // Verify old key is revoked
      const oldKeyValidation = await ApiKeyService.validateApiKey(oldKey);
      expect(oldKeyValidation).toBeNull();

      // Verify new key is valid
      const newKeyValidation = await ApiKeyService.validateApiKey(result.api_key);
      expect(newKeyValidation).not.toBeNull();
    });

    it("should throw error for non-existent app", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      await expect(ApiKeyService.regenerateApiKey(fakeId, "user-123")).rejects.toThrow("not found or unauthorized");
    });

    it("should throw error for unauthorized user", async () => {
      const registered = await ApiKeyService.registerApp("Test App", "https://testapp.com", "user-123");

      await expect(ApiKeyService.regenerateApiKey(registered.app_id, "different_user")).rejects.toThrow("not found or unauthorized");
    });
  });
});
