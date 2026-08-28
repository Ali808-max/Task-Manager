package com.taskflow.ai;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AlarmActivity extends Activity {
    private String taskId;
    private String taskTitle;
    private String taskDue;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        taskId = getIntent().getStringExtra("task_id");
        taskTitle = getIntent().getStringExtra("task_title");
        taskDue = getIntent().getStringExtra("task_due");
        if (taskTitle == null || taskTitle.trim().isEmpty()) taskTitle = "Task reminder";

        getWindow().setStatusBarColor(Color.rgb(15, 23, 42));
        getWindow().setNavigationBarColor(Color.WHITE);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(24), dp(24), dp(24), dp(24));
        root.setBackgroundColor(Color.rgb(246, 247, 251));

        TextView icon = new TextView(this);
        icon.setText("🔔");
        icon.setTextSize(54);
        icon.setGravity(Gravity.CENTER);
        root.addView(icon, new LinearLayout.LayoutParams(-1, dp(80)));

        TextView heading = new TextView(this);
        heading.setText("TASK REMINDER");
        heading.setTextSize(14);
        heading.setTextColor(Color.rgb(37, 99, 235));
        heading.setGravity(Gravity.CENTER);
        root.addView(heading, new LinearLayout.LayoutParams(-1, dp(35)));

        TextView title = new TextView(this);
        title.setText(taskTitle);
        title.setTextSize(28);
        title.setTextColor(Color.rgb(15, 23, 42));
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(title, new LinearLayout.LayoutParams(-1, dp(90)));

        TextView due = new TextView(this);
        due.setText(taskDue == null || taskDue.isEmpty() ? "Your scheduled task is due now." : "Scheduled for " + taskDue);
        due.setTextSize(15);
        due.setTextColor(Color.rgb(100, 116, 139));
        due.setGravity(Gravity.CENTER);
        root.addView(due, new LinearLayout.LayoutParams(-1, dp(50)));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setGravity(Gravity.CENTER);

        Button done = new Button(this);
        done.setText("DONE");
        done.setOnClickListener(v -> finish());

        Button snooze = new Button(this);
        snooze.setText("SNOOZE 10 MIN");
        snooze.setOnClickListener(v -> {
            scheduleSnooze();
            finish();
        });

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, dp(52), 1f);
        bp.setMargins(dp(6), dp(12), dp(6), dp(6));
        buttons.addView(done, bp);
        buttons.addView(snooze, bp);
        root.addView(buttons, new LinearLayout.LayoutParams(-1, dp(80)));

        setContentView(root);
    }

    private void scheduleSnooze() {
        Intent intent = new Intent(this, TaskReminderReceiver.class);
        intent.putExtra("task_id", taskId == null ? "snooze-" + System.currentTimeMillis() : taskId + "-snooze");
        intent.putExtra("task_title", taskTitle);
        intent.putExtra("task_due", "in 10 minutes");

        int requestCode = Math.abs((taskId == null ? taskTitle : taskId).hashCode()) + 100000;
        PendingIntent pi = PendingIntent.getBroadcast(this, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarm = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) {
            long at = System.currentTimeMillis() + 10L * 60L * 1000L;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarm.canScheduleExactAlarms()) {
                alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                alarm.set(AlarmManager.RTC_WAKEUP, at, pi);
            }
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
