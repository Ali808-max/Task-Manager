package com.taskflow.ai;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class TaskReminderReceiver extends BroadcastReceiver {
    public static final String ACTION_DONE = "com.taskflow.ai.DONE";
    public static final String ACTION_SNOOZE = "com.taskflow.ai.SNOOZE";

    @Override public void onReceive(Context context, Intent intent) {
        String action=intent.getAction();
        String id=intent.getStringExtra("task_id");
        int notificationId=Math.abs((id==null?"task":id).hashCode());
        NotificationManager nm=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if(ACTION_DONE.equals(action)) { if(nm!=null) nm.cancel(notificationId); ReminderScheduler.cancel(context,id); return; }
        if(ACTION_SNOOZE.equals(action)) { if(nm!=null) nm.cancel(notificationId); scheduleSnooze(context,intent); return; }

        NotificationHelper.createChannel(context);
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
        String title=intent.getStringExtra("task_title"); if(title==null||title.trim().isEmpty())title="Task reminder";
        String due=intent.getStringExtra("task_due"); String recurring=intent.getStringExtra("recurring"); String reminder=intent.getStringExtra("reminder");
        Intent open=new Intent(context,MainActivity.class); open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending=PendingIntent.getActivity(context,notificationId+1,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent done=new Intent(context,TaskReminderReceiver.class).setAction(ACTION_DONE).putExtra("task_id",id);
        PendingIntent donePi=PendingIntent.getBroadcast(context,notificationId+2,done,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent snooze=new Intent(context,TaskReminderReceiver.class).setAction(ACTION_SNOOZE).putExtra("task_id",id).putExtra("task_title",title);
        PendingIntent snoozePi=PendingIntent.getBroadcast(context,notificationId+3,snooze,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent alarmScreen=new Intent(context,AlarmActivity.class).putExtra("task_id",id).putExtra("task_title",title).putExtra("task_due",due).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent alarmPending=PendingIntent.getActivity(context,notificationId+4,alarmScreen,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String text=(due==null||due.isEmpty())?"Your scheduled task is due.":"Scheduled for "+due;
        Notification.Builder b=new Notification.Builder(context,NotificationHelper.CHANNEL_ID).setSmallIcon(R.drawable.ic_notification).setContentTitle("TaskFlow AI").setContentText(title).setStyle(new Notification.BigTextStyle().bigText(title+"\n"+text)).setPriority(Notification.PRIORITY_HIGH).setAutoCancel(true).setContentIntent(openPending).addAction(new Notification.Action.Builder(null,"DONE",donePi).build()).addAction(new Notification.Action.Builder(null,"SNOOZE 10 MIN",snoozePi).build());
        if(!inQuietHours(context)) b.setFullScreenIntent(alarmPending,true);
        if(nm!=null)nm.notify(notificationId,b.build());
        scheduleNextRecurring(context,id,title,due,recurring,reminder);
    }

    private static boolean inQuietHours(Context c){
        String st=c.getSharedPreferences("taskflow_notifications",0).getString("quiet_start","22:00"), en=c.getSharedPreferences("taskflow_notifications",0).getString("quiet_end","07:00");
        try{int s=Integer.parseInt(st.substring(0,2))*60+Integer.parseInt(st.substring(3,5));int e=Integer.parseInt(en.substring(0,2))*60+Integer.parseInt(en.substring(3,5));Calendar now=Calendar.getInstance();int n=now.get(Calendar.HOUR_OF_DAY)*60+now.get(Calendar.MINUTE);return s>e?(n>=s||n<e):(n>=s&&n<e);}catch(Exception x){return false;}
    }
    private static void scheduleSnooze(Context c,Intent src){
        Intent i=new Intent(c,TaskReminderReceiver.class); i.putExtra("task_id",src.getStringExtra("task_id")+":snooze");i.putExtra("task_title",src.getStringExtra("task_title"));i.putExtra("task_due","in 10 minutes");
        PendingIntent pi=PendingIntent.getBroadcast(c,Math.abs((src.getStringExtra("task_id")+":snooze").hashCode()),i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);android.app.AlarmManager a=(android.app.AlarmManager)c.getSystemService(Context.ALARM_SERVICE);long at=System.currentTimeMillis()+600000L;if(a!=null){if(Build.VERSION.SDK_INT>=23)a.setAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP,at,pi);else a.set(android.app.AlarmManager.RTC_WAKEUP,at,pi);}}
    private static void scheduleNextRecurring(Context c,String id,String title,String due,String recurring,String reminder){
        if(recurring==null||recurring.isEmpty()||due==null||due.length()<16)return;
        try{String[] p=due.split(" ");Calendar cal=Calendar.getInstance();cal.setTime(new SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.US).parse(due));if("hourly".equals(recurring))cal.add(Calendar.HOUR_OF_DAY,1);else if("daily".equals(recurring))cal.add(Calendar.DAY_OF_YEAR,1);else if("weekly".equals(recurring))cal.add(Calendar.WEEK_OF_YEAR,1);else if("monthly".equals(recurring))cal.add(Calendar.MONTH,1);else return;JSONObject o=new JSONObject();o.put("id",id);o.put("title",title);o.put("dueDate",new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(cal.getTime()));o.put("dueTime",new SimpleDateFormat("HH:mm",Locale.US).format(cal.getTime()));o.put("reminder",reminder==null?"":reminder);o.put("recurring",recurring);o.put("status","pending");ReminderScheduler.schedule(c,o);}catch(Exception ignored){}
    }
}
