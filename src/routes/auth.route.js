import { Router } from "express";
import { validateRegister, validateRevoke, validatGetAPIKey } from "../middleware/validation.middleware.js";
import { getApiKeyController, regenerateApiKeyController, registerAppController, revokeApiKeyController } from "../controller/auth.controller.js";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new application and generate an API key
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_name
 *               - app_url
 *               - user_id
 *             properties:
 *               app_name:
 *                 type: string
 *                 example: My Test App
 *               app_url:
 *                 type: string
 *                 example: https://test.com
 *               user_id:
 *                 type: string
 *                 example: user123
 *     responses:
 *       201:
 *         description: App registered successfully
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
 *                   example: App registered successfully. Save your API key - it will not be shown again!
 *                 data:
 *                   type: object
 *                   properties:
 *                     app_id:
 *                       type: string
 *                       example: b23d6d1f-90e6-45f3-9ed1-9fdda2396da7
 *                     app_name:
 *                       type: string
 *                       example: My Test App
 *                     app_url:
 *                       type: string
 *                       example: https://test.com
 *                     api_key:
 *                       type: string
 *                       example: sbx_m0WSzFbQcf2ezKnptTRDnN9DEfVRYe8sFKZwsoYOPu56hFhF
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-13T10:54:33.317Z
 */
router.post("/register", validateRegister, registerAppController);

/**
 * @swagger
 * /auth/api-key:
 *   post:
 *     summary: Retrieve API key details
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_id
 *             properties:
 *               app_id:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Returns API key info
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
 *                   example: API key details retrieved successfully!
 *                 data:
 *                   type: object
 *                   properties:
 *                     app_id:
 *                       type: string
 *                       example: b23d6d1f-90e6-45f3-9ed1-9fdda2396da7
 *                     app_name:
 *                       type: string
 *                       example: My Test App
 *                     app_url:
 *                       type: string
 *                       example: https://test.com
 *                     key_prefix:
 *                        type: string
 *                        example: sbx_ABSKHFJBBNKD*****************
 *                     is_active:
 *                         type: boolean
 *                         example: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-13T10:54:33.317Z
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-11-13T10:54:33.317Z
 *                     last_used_at:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     note:
 *                       type: string
 *                       example: For security reasons, the full API key is only shown once during registration
 *       404:
 *         description: App not found
 */
router.post("/api-key", validatGetAPIKey, getApiKeyController);

/**
 * @swagger
 * /auth/revoke:
 *   post:
 *     summary: Revoke an active API key for a registered app
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *             properties:
 *               api_key:
 *                 type: string
 *                 example: sbx_7fab1e8c02524174bc611475ad8cdecb
 *     responses:
 *       200:
 *         description: API key revoked successfully
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
 *                   example: API key revoked successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     app_id:
 *                       type: string
 *                       example: 7fab1e8c-0252-4174-bc61-1475ad8cdecb
 *                     key_prefix:
 *                       type: string
 *                       example: sbx_ZrEBuD6vz0Y****************************************************************
 *                     revoked_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-13T17:46:04.264Z
 *                     message:
 *                       type: string
 *                       example: API key successfully revoked
 */
router.post("/revoke", validateRevoke, revokeApiKeyController);

/**
 * @swagger
 * /auth/regenerate:
 *   post:
 *     summary: Regenerate an active API key for a registered app
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_id
 *               - user_id
 *             properties:
 *               app_id:
 *                 type: string
 *                 example: 7fab1e8c-0252-4174-bc61-1475ad8cdecb
 *               user_id:
 *                  type: string
 *                  example: kchb1e8c-0252-4174-bc61-1475ad8cdecb
 *     responses:
 *       200:
 *         description: API key regenerated successfully
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
 *                   example: API key regenerated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     app_id:
 *                       type: string
 *                       example: 7fab1e8c-0252-4174-bc61-1475ad8cdecb
 *                     api_key:
 *                       type: string
 *                       example: sbx_ZrEBuD6vz0Ysncbdjkcbdkjcdcjdcnjd
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-13T17:46:04.264Z
 *                     message:
 *                       type: string
 *                       example: API key successfully regenerated
 */
router.post("/regenerate", regenerateApiKeyController);

export default router;
