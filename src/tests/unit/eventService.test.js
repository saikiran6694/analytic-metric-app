import { ApiKeyService } from "../../services/apiKey.service.js";
import { EventService } from "../../services/event.service.js";
import pool from "../../config/database.config.js";

describe("EventService", () => {
  let appId;

  beforeAll(async () => {
    const registered = await ApiKeyService.registerApp("Service Test App", "https://service-test.com", "service_user");
    appId = registered.app_id;
  });

  beforeEach(async () => {
    await EventService.collectEvent(appId, {
      event: "page_view",
      user_id: "u1",
      timestamp: new Date("2025-02-19T10:00:00Z"),
    });

    await EventService.collectEvent(appId, {
      event: "page_view",
      user_id: "u2",
      timestamp: new Date("2025-02-19T11:00:00Z"),
    });

    await EventService.collectEvent(appId, {
      event: "click_button",
      user_id: "u1",
      timestamp: new Date("2025-02-20T10:00:00Z"),
    });
  });

  afterEach(async () => {
    await pool.query("DELETE FROM events WHERE app_id = $1", [appId]);
    await pool.query("DELETE FROM event_summaries WHERE app_id = $1", [appId]);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("collectEvent", () => {
    it("should collect event with all fields", async () => {
      const eventData = {
        event: "test_event",
        url: "https://test.com",
        referrer: "https://google.com",
        device: "mobile",
        ipAddress: "192.168.1.1",
        timestamp: "2025-02-20T12:00:00Z",
        metadata: { key: "value" },
        session_id: "sess_123",
        user_id: "user_456",
      };

      const result = await EventService.collectEvent(appId, eventData);

      expect(result).toHaveProperty("id");
      expect(result.event_type).toBe("test_event");
      expect(result.app_id).toBe(appId);
    });

    it("should handle minimal event data", async () => {
      const result = await EventService.collectEvent(appId, {
        event: "minimal_event",
      });

      expect(result).toHaveProperty("id");
      expect(result.event_type).toBe("minimal_event");
    });
  });

  describe("updateEventSummary", () => {
    it("should update event summary correctly", async () => {
      // Insert events
      await EventService.collectEvent(appId, {
        event: "summary_event",
        user_id: "user_1",
        device: "desktop",
        timestamp: "2025-02-20T12:00:00Z",
      });

      await EventService.collectEvent(appId, {
        event: "summary_event",
        user_id: "user_2",
        device: "mobile",
        timestamp: "2025-02-20T13:00:00Z",
      });

      await EventService.updateEventSummary(appId, "summary_event", "2025-02-20T00:00:00Z");

      const summary = await pool.query("SELECT * FROM event_summaries WHERE app_id = $1 AND event_type = $2", [appId, "summary_event"]);

      expect(summary.rows.length).toBe(1);
      expect(summary.rows[0].total_count).toBe(2);
      expect(summary.rows[0].unique_users).toBe(2);
      expect(summary.rows[0].device_data).toHaveProperty("desktop");
      expect(summary.rows[0].device_data).toHaveProperty("mobile");
    });
  });

  describe("getEventSummary", () => {
    beforeEach(async () => {
      await EventService.collectEvent(appId, {
        event: "view_event",
        user_id: "user_123",
        device: "mobile",
        timestamp: "2025-02-20T10:00:00Z",
      });

      await EventService.collectEvent(appId, {
        event: "view_event",
        user_id: "user_456",
        device: "desktop",
        timestamp: "2025-02-20T11:00:00Z",
      });
    });

    it("should return event summary within a date range", async () => {
      const result = await EventService.getEventSummary(appId, "view_event", "2025-02-19", "2025-02-21");

      expect(result.event_type).toBe("view_event");
      expect(Number(result.count)).toBeGreaterThanOrEqual(2);
      expect(Number(result.unique_users)).toBe(2);
      expect(result.device_data).toHaveProperty("mobile");
    });

    it("should return null if no events found", async () => {
      const result = await EventService.getEventSummary(appId, "nonexistent_event");
      expect(result).toBeNull();
    });
  });

  describe("getUserStats", () => {
    beforeEach(async () => {
      await EventService.collectEvent(appId, {
        event: "login",
        user_id: "u1",
        device: "mobile",
        ipAddress: "10.0.0.1",
        timestamp: "2025-02-20T10:00:00Z",
      });
      await EventService.collectEvent(appId, {
        event: "logout",
        user_id: "u1",
        device: "desktop",
        ipAddress: "10.0.0.2",
        timestamp: "2025-02-20T11:00:00Z",
      });
    });

    it("should return stats for a user", async () => {
      const result = await EventService.getUserStats(appId, "u1");

      expect(result.user_id).toBe("u1");
      expect(Number(result.total_events)).toBe(2);
      expect(result.device_details).toHaveProperty("mobile");
      expect(result.device_details).toHaveProperty("desktop");
      expect(result.recent_events.length).toBeGreaterThan(0);
      expect(result.ip_addresses.length).toBe(2);
    });

    it("should return null if user has no events", async () => {
      const result = await EventService.getUserStats(appId, "no_user");
      expect(result).toBeNull();
    });
  });

  describe("getRecentEvents", () => {
    beforeEach(async () => {
      await EventService.collectEvent(appId, {
        event: "click",
        user_id: "user_a",
        device: "desktop",
      });
    });

    it("should return recent events", async () => {
      const events = await EventService.getRecentEvents(appId, 5);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("event_type");
      expect(events[0].app_id).toBeUndefined(); // since query only selects few fields
    });
  });

  describe("getEventCountsByType", () => {
    beforeEach(async () => {
      await EventService.collectEvent(appId, {
        event: "page_view",
        user_id: "user_1",
        timestamp: "2025-02-20T10:00:00Z",
      });
      await EventService.collectEvent(appId, {
        event: "click",
        user_id: "user_2",
        timestamp: "2025-02-20T11:00:00Z",
      });
    });

    it("should return event counts grouped by type", async () => {
      const result = await EventService.getEventCountsByType(appId, "2025-02-19", "2025-02-21");

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toHaveProperty("event_type");
      expect(result[0]).toHaveProperty("count");
      expect(result[0]).toHaveProperty("unique_users");
    });
  });
});
