import crypto from "crypto";
import { customAlphabet } from "nanoid";

// Generate cryptographically secure API key
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 48);

export class ApiKeyUtils {
  /**
   * Generates a new API key.
   * Format: sbx_<48-character-random-string>
   * @return {string} The generated API key
   */
  static generateApiKey() {
    const api_key = `sbx_${nanoid()}`;
    return api_key;
  }

  /**
   * Hash the given API key using SHA-256 for secure storage.
   * @param {string} apiKey - The API key to hash
   * @return {string} The SHA-256 hashed representation of the api key
   */
  static hashApiKey(apiKey) {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
  }

  /**
   * Extract the prefix from the given API key. (first 12 characters)
   * @param {string} apiKey - The API key to extract the prefix from
   * @return {string} The prefix of the API key
   */
  static extractApiKeyPrefix(apiKey) {
    return apiKey.substring(0, 15);
  }

  /**
   * Mask API key for display (show only prefix)
   * @param {string} apiKey - The API key to mask
   * @return {string} The masked API key
   */
  static maskApiKey(apiKey) {
    const prefix = this.extractApiKeyPrefix(apiKey);
    const maskLength = apiKey.length - prefix.length;
    return `${prefix}${"*".repeat(maskLength)}`;
  }
}
