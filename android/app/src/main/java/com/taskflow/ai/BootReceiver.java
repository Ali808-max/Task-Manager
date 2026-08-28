package com.taskflow.ai;
import android.content.BroadcastReceiver;import android.content.Context;import android.content.Intent;import java.util.Map;import org.json.JSONObject;
public class BootReceiver extends BroadcastReceiver{
 @Override public void onReceive(Context c,Intent i){Map<String,?> all=c.getSharedPreferences("taskflow_reminders",0).getAll();for(Map.Entry<String,?> e:all.entrySet()){if(!e.getKey().startsWith("task_"))continue;try{ReminderScheduler.schedule(c,new JSONObject(String.valueOf(e.getValue())));}catch(Exception ignored){}}}
}
