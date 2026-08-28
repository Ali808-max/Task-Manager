# TaskFlow AI Android APK

Open this `android` folder in Android Studio and build:
Build → Build Bundle(s) / APK(s) → Build APK(s)

The generated debug APK is normally:
`app/build/outputs/apk/debug/app-debug.apk`

This app loads the live TaskFlow AI GitHub Pages site, so website updates do not require rebuilding the APK. It requests microphone permission for voice input.

For a signed release APK, configure an Android signing key in Android Studio.


## Native task reminders

The APK requests notification permission and schedules Android notifications from tasks saved by the web app. A task with a due date/time schedules a notification at the due time; selecting 10m, 30m, or 1h schedules it that amount before the due time.
