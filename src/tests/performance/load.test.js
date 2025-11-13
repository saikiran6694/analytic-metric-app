import { ApiKeyService } from "../../services/apiKey.service";

describe("Performance Tests", () => {
  it("should handle concurrent registrations", async () => {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 50; i++) {
      promises.push(ApiKeyService.registerApp(`Perf Test App ${i}`, `https://perf-test-${i}.com`, `perf_user_${i}`));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results).toHaveLength(50);
    expect(results.every((r) => r.api_key)).toBe(true);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  }, 10000);

  it("should handle concurrent validations", async () => {
    const registered = await ApiKeyService.registerApp("Validation Test", "https://validation-test.com", "val_user");

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 100; i++) {
      promises.push(ApiKeyService.validateApiKey(registered.api_key));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results).toHaveLength(100);
    expect(results.every((r) => r !== null)).toBe(true);
    expect(duration).toBeLessThan(2000); // Should be fast with indexing
  }, 10000);
});
