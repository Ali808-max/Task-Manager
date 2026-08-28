package com.taskflow.ai;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class TaskFlowWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_REFRESH = "com.taskflow.ai.REFRESH_WIDGET";
    private static final String PREFS = "taskflow_widget";
    private static final String TASKS = "tasks";

    public static void update(Context context, String json) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(TASKS, json == null ? "[]" : json).apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        android.content.ComponentName name = new android.content.ComponentName(context, TaskFlowWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(name);
        for (int id : ids) updateOne(context, manager, id);
    }

    private static void updateOne(Context context, AppWidgetManager manager, int id) {
        String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(TASKS, "[]");
        int pending=0, overdue=0;
        String first="No pending tasks";
        try {
            JSONArray arr = new JSONArray(json);
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
            for(int i=0;i<arr.length();i++){
                JSONObject t=arr.getJSONObject(i);
                if(!"completed".equals(t.optString("status","pending"))){
                    pending++;
                    if("No pending tasks".equals(first)) first=t.optString("title","Task");
                    String due=t.optString("dueDate",""); if(!due.isEmpty() && due.compareTo(today)<0) overdue++;
                }
            }
        }catch(Exception ignored){}
        RemoteViews views=new RemoteViews(context.getPackageName(),R.layout.widget_taskflow);
        views.setTextViewText(R.id.widget_title,"TaskFlow AI");
        views.setTextViewText(R.id.widget_count,pending+" pending  •  "+overdue+" overdue");
        views.setTextViewText(R.id.widget_task,first);
        Intent open=new Intent(context,MainActivity.class);
        PendingIntent pi=PendingIntent.getActivity(context,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root,pi);
        manager.updateAppWidget(id,views);
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids){ for(int id:ids) updateOne(context,manager,id); }
    @Override public void onReceive(Context context, Intent intent){ super.onReceive(context,intent); if(ACTION_REFRESH.equals(intent.getAction())) update(context,intent.getStringExtra(TASKS)); }
}
