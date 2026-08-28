package com.taskflow.ai;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public final class ReminderScheduler {
    private ReminderScheduler() {}

    private static int requestCode(String id) {
        return Math.abs(id.hashCode());
    }

    public static void schedule(Context context, JSONObject task) {
        try {
            String id = task.optString("id", "");
            String title = task.optString("title", "TaskFlow task");
            String dueDate = task.optString("dueDate", "");
            String dueTime = task.optString("dueTime", "");
            String reminder = task.optString("reminder", "");
            String status = task.optString("status", "pending");
            if (id.isEmpty()) return;
            cancel(context, id);
            if (dueDate.isEmpty() || "completed".equals(status)) return;
            context.getSharedPreferences("taskflow_reminders", Context.MODE_PRIVATE).edit().putString("task_" + id, task.toString()).apply();
            if (dueTime.isEmpty()) dueTime = "09:00";
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US);
            format.setLenient(false);
            Date due = format.parse(dueDate + " " + dueTime);
            if (due == null) return;

            java.util.ArrayList<String> reminders = new java.util.ArrayList<>();
            if (!reminder.isEmpty()) reminders.add(reminder);
            org.json.JSONArray extra = task.optJSONArray("reminders");
            if (extra != null) for(int i=0;i<extra.length();i++) { String x=extra.optString(i,""); if(!x.isEmpty() && !reminders.contains(x)) reminders.add(x); }
            if (reminders.isEmpty()) return;

            for (String r : reminders) {
                long triggerAt = due.getTime() - reminderOffsetMs(r);
                if (triggerAt <= System.currentTimeMillis()) continue;
                Intent intent = new Intent(context, TaskReminderReceiver.class);
                intent.putExtra("task_id", id);
                intent.putExtra("task_title", title);
                intent.putExtra("task_due", dueDate + " " + dueTime);
                intent.putExtra("recurring", task.optString("recurring", ""));
                intent.putExtra("reminder", r);
                int rc = requestCode(id + ":" + r);
                PendingIntent pi = PendingIntent.getBroadcast(context, rc, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                setAlarm(context, pi, triggerAt);
            }
        } catch (Exception ignored) { }
    }

    private static void setAlarm(Context context, PendingIntent pi, long triggerAt) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarm.canScheduleExactAlarms()) alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            else alarm.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } catch (Exception ignored) {}
    }

    private static long reminderOffsetMs(String reminder) {
        if ("5m".equalsIgnoreCase(reminder)) return 5L * 60L * 1000L;
        if ("10m".equalsIgnoreCase(reminder)) return 10L * 60L * 1000L;
        if ("15m".equalsIgnoreCase(reminder)) return 15L * 60L * 1000L;
        if ("30m".equalsIgnoreCase(reminder)) return 30L * 60L * 1000L;
        if ("1h".equalsIgnoreCase(reminder)) return 60L * 60L * 1000L;
        if ("2h".equalsIgnoreCase(reminder)) return 2L * 60L * 60L * 1000L;
        if ("1d".equalsIgnoreCase(reminder)) return 24L * 60L * 60L * 1000L;
        return 0L;
    }

    public static void cancel(Context context, String id) {
        if (id == null || id.isEmpty()) return;
        String[] keys = {"", ":5m", ":10m", ":15m", ":30m", ":1h", ":2h", ":1d", ":at_time"};
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        context.getSharedPreferences("taskflow_reminders", Context.MODE_PRIVATE).edit().remove("task_" + id).apply();
        for (String key : keys) {
            Intent intent = new Intent(context, TaskReminderReceiver.class);
            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode(id + key), intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (pi != null) { if (alarm != null) alarm.cancel(pi); pi.cancel(); }
        }
    }
}
