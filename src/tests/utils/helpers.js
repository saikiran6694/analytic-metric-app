export const testHelpers = {
  /**
   * Create a test app with API key
   */
  async createTestApp(name = "Test App", userId = "test_user") {
    return await ApiKeyService.registerApp(name, `https://${name.toLowerCase().replace(/\s/g, "-")}.com`, userId);
  },

  /**
   * Create multiple test apps
   */
  async createMultipleApps(count = 5) {
    const apps = [];
    for (let i = 0; i < count; i++) {
      apps.push(await this.createTestApp(`Test App ${i}`, `user_${i}`));
    }
    return apps;
  },

  /**
   * Wait for async operations
   */
  async wait(ms = 100) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
