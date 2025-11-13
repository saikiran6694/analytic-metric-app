import { Router } from "express";
import { validateEvent } from "../middleware/eventValidation.middleware.js";
import { eventCollectController, eventSummaryController, eventUserStatsController } from "../controller/event.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";

const router = Router();

router.post("/collect", authenticate, validateEvent, eventCollectController);
router.get("/event-summary", authenticate, eventSummaryController);
router.get("/user-stats", authenticate, eventUserStatsController);

export default router;
