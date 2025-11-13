import { Router } from "express";
import { validateRegister, validateRevoke, validatGetAPIKey } from "../middleware/validation.middleware.js";
import { getApiKeyController, regenerateApiKeyController, registerAppController, revokeApiKeyController } from "../controller/auth.controller.js";

const router = Router();

router.post("/register", validateRegister, registerAppController);
router.post("/api-key", validatGetAPIKey, getApiKeyController);
router.post("/revoke", validateRevoke, revokeApiKeyController);
router.post("/regenerate", regenerateApiKeyController);

export default router;
