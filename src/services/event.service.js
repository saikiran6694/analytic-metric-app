import pool from "../config/database.config.js";

export class EventService {
  /**
   * Collect a single analytical event
   * @param {string} appId - ID of the application
   * @param {Object} eventData - Data of the event to be collected
   * @returns {Promise<Object | null>} The event details or null if not implemented
   */
  static async collectEvent(appId, eventData) {
    const { event, url, referrer, device, ipAddress, timestamp, metadata, session_id, user_id } = eventData;

    try {
      const result = await pool.query(
        `INSERT INTO events 
            (app_id, event_type, url, referrer, device, ip_address, timestamp, metadata, session_id, user_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, app_id, event_type, timestamp`,
        [appId, event, url, referrer, device, ipAddress, timestamp, metadata, session_id, user_id]
      );

      //   Trigger summary update ( be done asynchronously)
      this.updateEventSummary(appId, event, timestamp || new Date()).catch((err) => console.error("Error updating summary:", err));

      return result.rows[0];
    } catch (error) {
      console.error("Error collecting event:", error);
      throw new Error("Failed to collect event");
    }
  }

  /**
   * Update event summary for a specific date
   * This helps with fast analytics queries
   */
  static async updateEventSummary(appId, eventType, timestamp) {
    const date = new Date(timestamp).toISOString().split("T")[0];

    try {
      // Calculate stats for the day
      const stats = await pool.query(
        `WITH event_stats AS (
          SELECT 
            COUNT(*) as total_count,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
          FROM events
          WHERE app_id = $1 
            AND event_type = $2 
            AND DATE(timestamp) = $3
        ),
        device_stats AS (
          SELECT 
            jsonb_object_agg(
              COALESCE(device, 'unknown'),
              device_count
            ) as device_data
          FROM (
            SELECT 
              device,
              COUNT(*) as device_count
            FROM events
            WHERE app_id = $1 
              AND event_type = $2 
              AND DATE(timestamp) = $3
            GROUP BY device
          ) ds
        )
        SELECT 
          COALESCE(es.total_count, 0) as total_count,
          COALESCE(es.unique_users, 0) as unique_users,
          COALESCE(ds.device_data, '{}'::jsonb) as device_data
        FROM event_stats es
        CROSS JOIN device_stats ds`,
        [appId, eventType, date]
      );

      const { total_count, unique_users, device_data } = stats.rows[0];

      // Upsert summary
      await pool.query(
        `INSERT INTO event_summaries (
          app_id, event_type, date, total_count, unique_users, device_data, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (app_id, event_type, date) 
        DO UPDATE SET
          total_count = $4,
          unique_users = $5,
          device_data = $6,
          updated_at = NOW()`,
        [appId, eventType, date, total_count || 0, unique_users || 0, device_data || {}]
      );
    } catch (error) {
      console.error("Error updating event summary:", error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get event summary statistics
   */
  static async getEventSummary(appId, eventType, startDate, endDate) {
    try {
      let query = `
      WITH event_data AS (
        SELECT 
          event_type,
          user_id,
          device
        FROM events
        WHERE app_id = $1
    `;

      const params = [appId];
      let paramIndex = 2;

      if (eventType) {
        query += ` AND event_type = $${paramIndex}`;
        params.push(eventType);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += `
      )
      SELECT 
        event_type,
        COUNT(*) AS count,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
        (
          SELECT jsonb_object_agg(device, device_count)
          FROM (
            SELECT 
              COALESCE(device, 'unknown') AS device,
              COUNT(*)::text AS device_count
            FROM event_data
            GROUP BY device
          ) dc
        ) AS device_data
      FROM event_data
      GROUP BY event_type
    `;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error getting event summary:", error);
      throw new Error("Failed to retrieve event summary");
    }
  }

  /**
   * Get user statistics for app and user
   */
  static async getUserStats(appId, userId) {
    try {
      const result = await pool.query(
        `SELECT 
          user_id,
          COUNT(*) as total_events,
          jsonb_object_agg(
            COALESCE(device, 'unknown'),
            device_count
          ) as device_details,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'event_type', event_type,
                'timestamp', timestamp,
                'url', url
              ) ORDER BY timestamp DESC
            ) FILTER (WHERE rn <= 10),
            '[]'::jsonb
          ) as recent_events,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen,
          array_agg(DISTINCT ip_address) FILTER (WHERE ip_address IS NOT NULL) as ip_addresses
         FROM (
           SELECT 
             user_id,
             event_type,
             timestamp,
             url,
             device,
             ip_address,
             COUNT(*) OVER (PARTITION BY device) as device_count,
             ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
           FROM events
           WHERE app_id = $1 AND user_id = $2
         ) subquery
         GROUP BY user_id`,
        [appId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw new Error("Failed to retrieve user statistics");
    }
  }

  /**
   * Get recent events for debugging/monitoring
   */
  static async getRecentEvents(appId, limit = 100) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          event_type,
          url,
          device,
          timestamp,
          user_id,
          session_id
         FROM events
         WHERE app_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [appId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error("Error getting recent events:", error);
      throw new Error("Failed to retrieve recent events");
    }
  }

  /**
   * Get event counts by type
   */
  static async getEventCountsByType(appId, startDate, endDate) {
    try {
      let query = `
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
        FROM events
        WHERE app_id = $1
      `;

      const params = [appId];
      let paramIndex = 2;

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += `
        GROUP BY event_type
        ORDER BY count DESC
      `;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error getting event counts:", error);
      throw new Error("Failed to retrieve event counts");
    }
  }
}
