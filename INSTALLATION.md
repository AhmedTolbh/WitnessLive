# WitnessLive Chrome Extension - Installation Guide

## Prerequisites

- Google Chrome browser (version 88 or later)
- A Gemini API key (free from Google AI Studio)

## Installation Steps

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (keep it secure!)

### 2. Load the Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle switch in the top right corner)
4. Click **Load unpacked** button
5. Select the `WitnessLive` directory (the folder containing this file)
6. The extension should now appear in your extensions list

### 3. Configure the API Key

1. Click the WitnessLive extension icon in your Chrome toolbar
2. Click **right-click** on the extension icon and select **Options**
   - Or navigate to `chrome://extensions/`, find WitnessLive, and click **Details** → **Extension options**
3. Enter your Gemini API key in the settings
4. Click **Save Settings**

### 4. Launch the Application

1. Click the WitnessLive extension icon in your toolbar
2. Click **Launch Session** in the popup
3. A new window will open with the WitnessLive interface
4. Grant permissions for:
   - Screen sharing (required to analyze your screen)
   - Microphone access (required for voice interaction)
5. Start using the AI assistant!

## Usage

Once launched, WitnessLive will:
- Capture your screen in real-time
- Listen to your voice commands and questions
- Provide AI-powered assistance for debugging, coding, and problem-solving
- Show live transcriptions of your conversation
- Display visual markers to point to UI elements when needed

## Troubleshooting

### "No Gemini API key configured" error
- Make sure you've configured your API key in the extension options
- Try refreshing the extension page and re-entering the key

### Screen sharing not working
- Make sure you grant permission when Chrome asks
- Select the correct screen/window to share
- Check that your browser has permission to access screen capture

### Extension not loading
- Check that all files are present in the directory
- Verify the manifest.json is valid
- Look for errors in `chrome://extensions/` (click "Details" on WitnessLive)
- Try removing and re-adding the extension

### Audio not working
- Grant microphone permission when prompted
- Check your microphone settings in Chrome
- Ensure your system microphone is working

## Updating the Extension

When you update the extension files:
1. Go to `chrome://extensions/`
2. Find WitnessLive
3. Click the **reload** icon (circular arrow)

## Uninstalling

1. Go to `chrome://extensions/`
2. Find WitnessLive
3. Click **Remove**
4. Confirm the removal

## Privacy & Security

- Your API key is stored locally in Chrome's secure storage
- Screen captures and audio are sent only to Google's Gemini API
- No data is stored or transmitted to any third parties
- You can revoke the extension's permissions at any time

## Support

For issues or questions:
- Check the [GitHub repository](https://github.com/AhmedTolbh/WitnessLive)
- Review the troubleshooting section above
- Ensure you're using the latest version of Chrome

## Features

- **Real-time Screen Analysis**: AI watches your screen to help debug and solve problems
- **Voice Interaction**: Speak naturally to the AI assistant
- **Live Transcription**: See what you say and what the AI responds
- **Visual Markers**: AI can point to specific UI elements on your screen
- **Google Search Integration**: AI can search for documentation and solutions
- **Citation Tracking**: See sources for AI responses
