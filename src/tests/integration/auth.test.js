import request from "supertest";
import app from "../../index.js";
import { HTTPSTATUS } from "../../config/http.config.js";

describe("Auth Endoint test", () => {
  /**
   * Register a new app and generate API Keys
   */
  describe("POST /api/auth/register", () => {
    it("should register a new app successfully", async () => {
      const response = await request(app).post("/api/auth/register").send({
        app_name: "Test App",
        app_url: "https://testapp.com",
        user_id: "user-123",
      });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("app_id");
      expect(response.body.data).toHaveProperty("app_url");
      expect(response.body.data).toHaveProperty("api_key");
      expect(response.body.data.api_key).toMatch(/^sbx_/);
      expect(response.body.message).toContain("Save your API key");
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          app_name: "Test",
        })
        .expect(HTTPSTATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("should prevent duplicate app registration", async () => {
      const appData = {
        app_name: "Test App",
        app_url: "https://duplicate-test.com",
        user_id: "user1",
      };

      await request(app).post("/api/auth/register").send(appData).expect(HTTPSTATUS.CREATED);

      const response = await request(app).post("/api/auth/register").send(appData).expect(HTTPSTATUS.CONFLICT);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("already registered");
    });
  });

  /**
   * GET Api keys details
   */
  describe("POST /api/auth/api-key", () => {
    it("should retrieve an api key details by using app_id", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        app_name: "Test app",
        app_url: "https://testapp.com",
        user_id: "user1",
      });

      const appId = registerRes.body.data.app_id;

      const response = await request(app).post("/api/auth/api-key").send({ app_id: appId }).expect(HTTPSTATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("app_id", appId);
      expect(response.body.data).toHaveProperty("key_prefix");
      expect(response.body.data.key_prefix).toContain("***");
      expect(response.body.data).toHaveProperty("is_active", true);
    });

    it("should return 404 for non-existent app", async () => {
      const response = await request(app)
        .post("/api/auth/api-key")
        .send({ app_id: "00000000-0000-0000-0000-000000000000" })
        .expect(HTTPSTATUS.NOT_FOUND);

      expect(response.body.success).toBe(false);
    });
  });

  /**
   * Revoke api key
   */
  describe("POST /api/auth/revoke", () => {
    it("should revoke an API key", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        app_name: "Test App",
        app_url: "https://test-revoke.com",
        user_id: "user1",
      });

      const apiKey = registerRes.body.data.api_key;

      const response = await request(app).post("/api/auth/revoke").send({ api_key: apiKey }).expect(HTTPSTATUS.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("revoked_at");
      expect(response.body.data.message).toContain("successfully revoked");
    });

    it("should validate API key format", async () => {
      const response = await request(app).post("/api/auth/revoke").send({ api_key: "invalid_format" }).expect(HTTPSTATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it("should return 404 for non-existent key", async () => {
      const response = await request(app).post("/api/auth/revoke").send({ api_key: "ak_live_nonexistentkey1234567890" }).expect(HTTPSTATUS.NOT_FOUND);

      expect(response.body.success).toBe(false);
    });

    it("should not allow revoking already revoked key", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        app_name: "Test App",
        app_url: "https://test-double-revoke.com",
        user_id: "user1",
      });

      const apiKey = registerRes.body.data.api_key;

      await request(app).post("/api/auth/revoke").send({ api_key: apiKey }).expect(HTTPSTATUS.CREATED);

      const response = await request(app).post("/api/auth/revoke").send({ api_key: apiKey }).expect(HTTPSTATUS.NOT_FOUND);

      expect(response.body.success).toBe(false);
    });
  });

  /**
   * Regenerate a new api key
   */
  describe("POST /api/auth/regenerate", () => {
    it("should regenerate an API key", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        app_name: "Test App",
        app_url: "https://testapp.com",
        user_id: "user1",
      });

      const appId = registerRes.body.app_id;
      const userId = registerRes.body.user_id;
      const oldKey = registerRes.body.api_key;

      //   regenerate api key
      const response = await request(app).post("/api/auth/regenerate").send({
        app_id: appId,
        user_id: userId,
      });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("api_key");
      expect(response.body.data.api_key).not.toBe(oldKey);
      expect(response.body.data.api_key).toMatch(/^sbx_/);
    });
  });

  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("timestamp");
    });
  });
});
