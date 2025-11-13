import request from "supertest";
import pool from "../../config/database.config.js";
import app from "../../index.js";
import { ApiKeyService } from "../../services/apiKey.service.js";
import { HTTPSTATUS } from "../../config/http.config.js";

describe("Analytics API Endpoint", () => {
  let apiKey;
  let appId;

  beforeAll(async () => {
    const registered = await ApiKeyService.registerApp("Analytics Test App", "https://analytics-test.com", "analytics_test_user");

    apiKey = registered.api_key;
    appId = registered.app_id;
  });

  afterEach(async () => {
    await pool.query("DELETE FROM events WHERE app_id = $1", [appId]);
    await pool.query("DELETE FROM event_summaries WHERE app_id = $1", [appId]);
  });

  describe("POST /api/analytics/collect", () => {
    it("should collect a single event successfully", async () => {
      const response = await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "test_event",
          url: "https://test.com/page",
          device: "mobile",
          metadata: {
            test: "data",
          },
        })
        .expect(HTTPSTATUS.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("event_id");
      expect(response.body.data.event_type).toBe("test_event");
    });

    it("should require API key", async () => {
      const response = await request(app)
        .post("/api/analytics/collect")
        .send({
          event: "test_event",
        })
        .expect(HTTPSTATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("API key is required");
    });

    it("should reject invalid API key", async () => {
      const response = await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", "sbx_invalid_key_123")
        .send({
          event: "test_event",
        })
        .expect(HTTPSTATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Invalid or expired");
    });

    it("should validate event name format", async () => {
      const response = await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "invalid event name!",
        })
        .expect(HTTPSTATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("should validate URL format", async () => {
      const response = await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "test_event",
          url: "not-a-valid-url",
        })
        .expect(HTTPSTATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it("should validate device type", async () => {
      const response = await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "test_event",
          device: "invalid_device",
        })
        .expect(HTTPSTATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it("should accept event with all optional fields", async () => {
      const response = await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "complex_event",
          url: "https://test.com/page",
          referrer: "https://google.com",
          device: "desktop",
          ipAddress: "192.168.1.1",
          timestamp: "2024-02-20T12:00:00Z",
          metadata: {
            browser: "Chrome",
            version: "120.0",
          },
          session_id: "sess_123",
          user_id: "user_456",
        })
        .expect(HTTPSTATUS.CREATED);

      expect(response.body.success).toBe(true);
    });

    it("should store event in database", async () => {
      await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "db_test_event",
          url: "https://test.com",
        })
        .expect(HTTPSTATUS.CREATED);

      const result = await pool.query("SELECT * FROM events WHERE app_id = $1 AND event_type = $2", [appId, "db_test_event"]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].event_type).toBe("db_test_event");
      expect(result.rows[0].url).toBe("https://test.com");
    });

    it("should handle metadata as JSONB", async () => {
      const metadata = {
        key1: "value1",
        key2: { nested: "object" },
        key3: [1, 2, 3],
      };

      await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "metadata_test",
          metadata,
        })
        .expect(201);

      const result = await pool.query("SELECT metadata FROM events WHERE app_id = $1 AND event_type = $2", [appId, "metadata_test"]);

      expect(result.rows[0].metadata).toEqual(metadata);
    });

    it("should use current timestamp if not provided", async () => {
      const beforeTime = new Date();

      await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "timestamp_test",
        })
        .expect(HTTPSTATUS.CREATED);

      const afterTime = new Date();

      const result = await pool.query("SELECT timestamp FROM events WHERE app_id = $1 AND event_type = $2", [appId, "timestamp_test"]);

      const eventTime = new Date(result.rows[0].timestamp);
      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should accept custom timestamp", async () => {
      const customTime = "2024-01-15T10:30:00Z";

      await request(app)
        .post("/api/analytics/collect")
        .set("x-api-key", apiKey)
        .send({
          event: "custom_timestamp",
          timestamp: customTime,
        })
        .expect(201);

      const result = await pool.query("SELECT timestamp FROM events WHERE app_id = $1 AND event_type = $2", [appId, "custom_timestamp"]);

      expect(new Date(result.rows[0].timestamp).toISOString()).toBe(customTime);
    });
  });

  describe("GET /api/analytics/event-summary", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/analytics/collect/batch")
        .set("x-api-key", apiKey)
        .send({
          events: [
            { event: "click", device: "mobile", user_id: "user1" },
            { event: "click", device: "mobile", user_id: "user2" },
            { event: "click", device: "desktop", user_id: "user1" },
            { event: "view", device: "mobile", user_id: "user3" },
          ],
        });

      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it("should return event summary", async () => {
      const response = await request(app)
        .get("/api/analytics/event-summary")
        .query({ event: "click" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event_type).toBe("click");
      expect(parseInt(response.body.data.count)).toBe(3);
      expect(parseInt(response.body.data.unique_users)).toBe(2);
    });

    it("should require event parameter", async () => {
      const response = await request(app).get("/api/analytics/event-summary").set("x-api-key", apiKey).expect(HTTPSTATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it("should filter by date range", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);

      const response = await request(app)
        .get("/api/analytics/event-summary")
        .query({
          event: "click",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.OK);

      expect(response.body.success).toBe(true);
    });

    it("should return 404 for non-existent event", async () => {
      const response = await request(app)
        .get("/api/analytics/event-summary")
        .query({ event: "nonexistent_event" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.NOT_FOUND);

      expect(response.body.success).toBe(false);
    });

    it("should include device breakdown", async () => {
      const response = await request(app)
        .get("/api/analytics/event-summary")
        .query({ event: "click" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.OK);

      expect(response.body.data.device_data).toBeDefined();
      expect(response.body.data.device_data.mobile).toBeDefined();
      expect(response.body.data.device_data.desktop).toBeDefined();
    });
  });

  describe("GET /api/analytics/user-stats", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/analytics/collect/batch")
        .set("x-api-key", apiKey)
        .send({
          events: [
            {
              event: "login",
              device: "mobile",
              user_id: "test_user_123",
              ipAddress: "192.168.1.1",
            },
            {
              event: "click",
              device: "mobile",
              user_id: "test_user_123",
              url: "https://test.com/page1",
            },
            {
              event: "view",
              device: "desktop",
              user_id: "test_user_123",
              ipAddress: "192.168.1.2",
            },
          ],
        });

      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    it("should return user statistics", async () => {
      const response = await request(app)
        .get("/api/analytics/user-stats")
        .query({ userId: "test_user_123" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe("test_user_123");
      expect(parseInt(response.body.data.total_events)).toBe(3);
    });

    it("should require userId parameter", async () => {
      const response = await request(app).get("/api/analytics/user-stats").set("x-api-key", apiKey).expect(HTTPSTATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it("should return device breakdown", async () => {
      const response = await request(app)
        .get("/api/analytics/user-stats")
        .query({ userId: "test_user_123" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.OK);

      expect(response.body.data.device_details).toBeDefined();
      expect(response.body.data.device_details.mobile).toBeDefined();
      expect(response.body.data.device_details.desktop).toBeDefined();
    });

    it("should return recent events", async () => {
      const response = await request(app)
        .get("/api/analytics/user-stats")
        .query({ userId: "test_user_123" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.OK);

      expect(response.body.data.recent_events).toBeDefined();
      expect(Array.isArray(response.body.data.recent_events)).toBe(true);
      expect(response.body.data.recent_events.length).toBeGreaterThan(0);
    });

    it("should return IP addresses", async () => {
      const response = await request(app)
        .get("/api/analytics/user-stats")
        .query({ userId: "test_user_123" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.OK);

      expect(response.body.data.ip_addresses).toBeDefined();
      expect(Array.isArray(response.body.data.ip_addresses)).toBe(true);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app)
        .get("/api/analytics/user-stats")
        .query({ userId: "nonexistent_user" })
        .set("x-api-key", apiKey)
        .expect(HTTPSTATUS.NOT_FOUND);

      expect(response.body.success).toBe(false);
    });
  });
});
