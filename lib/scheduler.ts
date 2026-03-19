// Scheduling is handled by Vercel Cron Jobs (vercel.json)
// Routes called automatically:
//   /api/schedule/process  → every 5 minutes (publishes due posts)
//   /api/engage/comments   → every hour (fetches new comments)
//   /api/analytics/growth  → daily at 9am (logs growth metrics)
// No local cron needed in production.

export const CRON_SCHEDULE = "*/5 * * * *";
