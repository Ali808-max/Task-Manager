package com.taskflow.ai;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.net.Uri;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int MIC_REQUEST = 7001;
    private static final int NOTIFICATION_REQUEST = 7002;
    private WebView webView;
    private SpeechRecognizer speechRecognizer;
    private PermissionRequest pendingWebPermission;
    private boolean nativeVoicePending = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        NotificationHelper.createChannel(this);
        requestNotificationPermission();

        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(15, 23, 42));
        window.setNavigationBarColor(Color.WHITE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(15, 23, 42));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (hasMicPermission()) {
                        grantAudio(request);
                    } else {
                        pendingWebPermission = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
                    }
                });
            }
        });

        webView.addJavascriptInterface(new VoiceBridge(), "TaskFlowVoice");
        webView.addJavascriptInterface(new ReminderBridge(), "TaskFlowReminder");
        webView.loadUrl("https://ali808-max.github.io/Task-Manager/?v=8.0");

        root.addView(webView);
        setContentView(root);
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_REQUEST);
        }
    }

    private boolean hasMicPermission() {
        return Build.VERSION.SDK_INT < 23 ||
                checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void grantAudio(PermissionRequest request) {
        if (request == null) return;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                return;
            }
        }
        request.deny();
    }

    private void startNativeSpeech() {
        if (!hasMicPermission()) {
            nativeVoicePending = true;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
            return;
        }

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            sendVoiceError("not-supported");
            return;
        }

        if (speechRecognizer != null) speechRecognizer.destroy();

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { sendVoiceEvent("start", ""); }
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() { sendVoiceEvent("end", ""); }
            @Override public void onError(int error) {
                sendVoiceError(String.valueOf(error));
                sendVoiceEvent("end", "");
            }
            @Override public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String text = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                sendVoiceResult(text);
                sendVoiceEvent("end", "");
            }
            @Override public void onPartialResults(Bundle partialResults) {}
            @Override public void onEvent(int eventType, Bundle params) {}
        });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        speechRecognizer.startListening(intent);
    }

    private void stopNativeSpeech() {
        if (speechRecognizer != null) speechRecognizer.stopListening();
    }

    private void sendVoiceEvent(String type, String value) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(
                "if(window.taskFlowNativeVoiceEvent){window.taskFlowNativeVoiceEvent(" + quote(type) + "," + quote(value) + ");}", null));
    }

    private void sendVoiceResult(String text) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(
                "if(window.taskFlowNativeVoiceResult){window.taskFlowNativeVoiceResult(" + quote(text) + ");}", null));
    }

    private void sendVoiceError(String error) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(
                "if(window.taskFlowNativeVoiceError){window.taskFlowNativeVoiceError(" + quote(error) + ");}", null));
    }

    private String quote(String s) {
        if (s == null) s = "";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r") + "\"";
    }

    private class VoiceBridge {
        @JavascriptInterface
        public void start() { runOnUiThread(() -> startNativeSpeech()); }

        @JavascriptInterface
        public void stop() { runOnUiThread(() -> stopNativeSpeech()); }
    }

    private class ReminderBridge {
        @JavascriptInterface
        public void scheduleTask(String json) {
            try {
                JSONObject task = new JSONObject(json);
                ReminderScheduler.schedule(MainActivity.this, task);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void cancelTask(String id) {
            ReminderScheduler.cancel(MainActivity.this, id);
        }

        @JavascriptInterface
        public void scheduleAll(String json) {
            try {
                JSONArray tasks = new JSONArray(json);
                for (int i = 0; i < tasks.length(); i++) {
                    ReminderScheduler.schedule(MainActivity.this, tasks.getJSONObject(i));
                }
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void refreshWidget(String json) {
            TaskFlowWidgetProvider.update(MainActivity.this, json);
        }

        @JavascriptInterface
        public void saveNotificationSettings(String start, String end) {
            getSharedPreferences("taskflow_notifications", MODE_PRIVATE).edit().putString("quiet_start", start == null ? "22:00" : start).putString("quiet_end", end == null ? "07:00" : end).apply();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == NOTIFICATION_REQUEST) return;
        if (requestCode != MIC_REQUEST) return;

        boolean allowed = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;

        if (pendingWebPermission != null) {
            if (allowed) grantAudio(pendingWebPermission);
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        }

        if (nativeVoicePending) {
            nativeVoicePending = false;
            if (allowed) startNativeSpeech();
            else sendVoiceError("not-allowed");
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (speechRecognizer != null) speechRecognizer.destroy();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
