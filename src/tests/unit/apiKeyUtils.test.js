import { ApiKeyUtils } from "../../utils/apikey-utils";

describe("ApiKeyUtils", () => {
  /**
   * Tests for generateApiKey method
   */
  describe("generateApiKey", () => {
    it("should generate an API Key with the valid format", () => {
      const apiKey = ApiKeyUtils.generateApiKey();

      expect(apiKey).toMatch(/^sbx_[A-Za-z0-9]{48}$/);
      expect(apiKey.length).toBe(52);
    });

    it("should generate unique API keys", () => {
      const apiKey1 = ApiKeyUtils.generateApiKey();
      const apiKey2 = ApiKeyUtils.generateApiKey();

      expect(apiKey1).not.toBe(apiKey2);
    });

    it("should generate 100 unique API keys", () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(ApiKeyUtils.generateApiKey());
      }
      expect(keys.size).toBe(100);
    });
  });

  /**
   * Tests for hashApiKey method
   */
  describe("hashApiKey", () => {
    it("should return a valid SHA-256 hex string", () => {
      const apiKey = "sbx_testapikey123456789012345678901234567890";
      const hash = ApiKeyUtils.hashApiKey(apiKey);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should hash API keys consistently", () => {
      const key = "sbx_testkey123456789";
      const hash1 = ApiKeyUtils.hashApiKey(key);
      const hash2 = ApiKeyUtils.hashApiKey(key);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("should produce different hashes for different keys", () => {
      const key1 = "sbx_key1";
      const key2 = "sbx_key2";

      const hash1 = ApiKeyUtils.hashApiKey(key1);
      const hash2 = ApiKeyUtils.hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });
  });

  /**
   * * Tests for extractApiKeyPrefix method
   */
  describe("extractApiKeyPrefix", () => {
    it("should extract correct prefix", () => {
      const key = "sbx_ABC1234567890";
      const prefix = ApiKeyUtils.extractApiKeyPrefix(key);

      expect(prefix).toBe("sbx_ABC12345678");
      expect(prefix.length).toBe(15);
    });

    it("should handle short keys", () => {
      const key = "sbx_AB";
      const prefix = ApiKeyUtils.extractApiKeyPrefix(key);

      expect(prefix).toBe("sbx_AB");
    });
  });

  /**
   * * Tests for maskApiKey method
   */
  describe("maskApiKey", () => {
    it("should mask API key correctly", () => {
      const key = "sbx_ABC1234567890XYZ";
      const masked = ApiKeyUtils.maskApiKey(key);

      expect(masked).toMatch(/^sbx_ABC12345678\*+$/);
      expect(masked).toContain("***");
      expect(masked.length).toBe(key.length);
    });

    it("should not expose full key", () => {
      const key = "sbx_SECRETKEY123456789";
      const masked = ApiKeyUtils.maskApiKey(key);

      const prefix = ApiKeyUtils.extractApiKeyPrefix(key);

      expect(masked.startsWith(prefix)).toBe(true);
      expect(masked.endsWith("***")).toBe(true);
      expect(masked).not.toContain("456789");
      expect(masked.length).toBe(key.length);
    });
  });
});
