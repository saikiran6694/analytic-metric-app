import { HTTPSTATUS } from "../config/http.config.js";
import { EventService } from "../services/event.service.js";

/**
 * @route POST /collect
 * @desc Collect event data
 * @access Protected by api key, validated by middleware
 */
export const eventCollectController = async (req, res) => {
  try {
    const eventData = {
      event: req.body.event,
      url: req.body.url,
      referrer: req.body.referrer,
      device: req.body.device,
      ipAddress: req.body.ipAddress || req.ip,
      timestamp: req.body.timestamp,
      metadata: req.body.metadata,
      session_id: req.body.session_id,
      user_id: req.body.user_id,
    };

    const result = await EventService.collectEvent(req.app_id, eventData);

    res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: "Event collected successfully",
      data: {
        event_id: result.id,
        event_type: result.event_type,
        timestamp: result.timestamp,
      },
    });
  } catch (error) {
    console.error("Event collection error:", error);
    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to collect event",
    });
  }
};

/**
 * @route GET /event-summary
 * @desc Get summary of events by event-type
 * @access Protected by api key
 */
export const eventSummaryController = async (req, res) => {
  try {
    const { event, startDate, endDate } = req.query;

    if (!event) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        error: "Event type is required",
      });
    }

    // Get summary from the service
    const summary = await EventService.getEventSummary(req.app_id, event, startDate, endDate);

    if (!summary) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        success: false,
        error: "No events found for the specified criteria",
      });
    }

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "Event Summary fetched successfully",
      data: summary,
    });
  } catch (error) {
    console.error("Event summary error:", error);
    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to retrieve event summary",
    });
  }
};

/**
 * @route GET /user-stats
 * @desc Get user statistics
 * @access Protected by api key
 */
export const eventUserStatsController = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(HTTPSTATUS.BAD_REQUEST).json({
        success: false,
        error: "User ID is required",
      });
    }

    // Get user stats from the service
    const stats = await EventService.getUserStats(req.app_id, userId);

    if (!stats) {
      return res.status(HTTPSTATUS.NOT_FOUND).json({
        success: false,
        error: "No statistics found for the specified user",
      });
    }

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: "User statistics on event fetched successfully",
      data: stats,
    });
  } catch (error) {
    console.error("User stats error:", error);
    res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to retrieve user statistics",
    });
  }
};
