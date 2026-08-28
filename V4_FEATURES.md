# TaskFlow AI V4

This package extends the existing TaskFlow project with:

- Android notifications with DONE and SNOOZE 10 MIN actions
- Full-screen reminder activity when permitted
- Multiple reminder offsets (1 day, 2 hours, 1 hour, 30 min, 15 min, 10 min, 5 min, at due time)
- Recurring reminder scheduling for hourly/daily/weekly/monthly tasks
- Reminder persistence across device reboot/app update
- Android home-screen widget showing pending/overdue count and first pending task
- Calendar month view
- Productivity dashboard with pending/completed/overdue/completion rate
- Focus suggestions
- JSON export/import backup
- Dark mode
- Quiet hours settings for full-screen alarm suppression
- AI task breakdown suggestions
- Existing PWA, Google Sheets, voice and AI features retained

The AI breakdown remains a local suggestion feature unless a secure AI endpoint is configured; no API key is embedded in the APK.
