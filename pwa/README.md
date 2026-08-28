# TaskFlow AI V3

Designed for GitHub Pages at https://ali808-max.github.io/Task-Manager/

## Upload
Upload the CONTENTS of this folder to the ROOT of your existing `Task-Manager` repository. Replace the old PWA files.

Do not upload the outer `taskflow-ai-v3` folder.

## Features
- AI-style natural language task creation without an AI key (local parser)
- AI assistant for basic task summaries
- Real browser voice input using Android Chrome Speech Recognition (HTTPS required)
- Recurring task and reminder fields
- Google Sheets sync using your existing working Apps Script /exec URL
- GitHub Pages PWA configuration
- Standalone install metadata and service worker

## Important AI note
The natural-language parser is local and works without an external AI service for common phrases such as:
"Call Raj tomorrow at 5 PM, high priority"
"Send quotation Friday at 10 AM"
"Call Amit every Monday at 10 AM"

For true generative AI, configure a secure server-side AI endpoint. Never put a private API key in `app.js`.

## Microphone
On Android Chrome, tap 🎤 and allow Microphone permission. If permission was previously denied: Chrome → site settings → Microphone → Allow, then reload the app.

## Automatic Google Sheets sync
Save your existing Apps Script `/exec` URL once. Changes sync automatically after edits, on reconnect, and about every 5 minutes while the app is active. Offline changes remain on the phone until internet returns.
