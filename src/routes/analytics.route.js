import { Router } from "express";
import { validateEvent } from "../middleware/eventValidation.middleware.js";
import { eventCollectController, eventSummaryController, eventUserStatsController } from "../controller/event.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { analyticsRateLimiter, eventRateLimiter } from "../config/rateLimit.config.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: analytics
 *   description: Event collection and analytics APIs
 */

/**
 * @swagger
 * /analytics/collect:
 *   post:
 *     summary: Collect an event from a registered application
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               event:
 *                 type: string
 *                 example: page_view
 *               url:
 *                 type: string
 *                 example: https://example.com/home
 *               referrer:
 *                 type: string
 *                 example: https://google.com
 *               device:
 *                 type: string
 *                 example: desktop
 *               ipAddress:
 *                 type: string
 *                 example: 192.168.0.1
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-11-13T10:00:00Z
 *               metadata:
 *                 type: object
 *                 example:
 *                   plan: "pro"
 *                   feature: "analytics"
 *               session_id:
 *                 type: string
 *                 example: session123
 *               user_id:
 *                 type: string
 *                 example: user123
 *     responses:
 *       201:
 *         description: Event collected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event collected successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     event_id:
 *                       type: string
 *                       example: 9e3a2f61-1d46-4e83-9c11-5f2e8a0c9932
 *                     event_type:
 *                       type: string
 *                       example: page_view
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-13T10:00:00Z
 *       400:
 *         description: Bad Request — invalid input or app already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: App with this URL already registered for this user
 *       500:
 *         description: Internal Server Error — unexpected failure during registration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.post("/collect", eventRateLimiter, authenticate, validateEvent, eventCollectController);

/**
 * @swagger
 * /analytics/event-summary:
 *   get:
 *     summary: Fetch event summary for a specific app or event type
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: app_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the registered application
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *         description: Optional event type to filter by
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering events
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering events
 *     responses:
 *       200:
 *         description: Event summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event Summary fetched successfully
 *                 data:
 *                   type: object
 *                   example:
 *                     total_events: 340
 *                     unique_users: 120
 *                     top_devices:
 *                       desktop: 200
 *                       mobile: 140
 *                     top_event_types:
 *                       page_view: 250
 *                       button_click: 90
 *       400:
 *         description: Bad Request — invalid input or app already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: App with this URL already registered for this user
 *       500:
 *         description: Internal Server Error — unexpected failure during registration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get("/event-summary", analyticsRateLimiter, authenticate, eventSummaryController);

/**
 * @swagger
 * /analytics/user-stats:
 *   get:
 *     summary: Retrieve per-user statistics on collected events
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: app_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the registered application
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: User statistics on events fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User statistics on event fetched successfully
 *                 data:
 *                   type: object
 *                   example:
 *                     total_users: 85
 *                     average_events_per_user: 4
 *                     active_users_last_7_days: 23
 *       400:
 *         description: Bad Request — invalid input or app already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: App with this URL already registered for this user
 *       500:
 *         description: Internal Server Error — unexpected failure during registration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get("/user-stats", analyticsRateLimiter, authenticate, eventUserStatsController);

export default router;
