# Ringside Mobile App

Native iOS & Android wrapper for the Ringside horse show ring tracking app, built with Expo / React Native.

## How It Works

This app wraps the Ringside web app (hosted on Render) in a native WebView, adding:
- **Native push notifications** via Expo Notifications
- **Native navigation** (Android back button, iOS swipe-back)
- **App Store presence** (icon, splash screen, proper metadata)
- **Pull to refresh**
- **Stripe checkout** opens in system browser for security

## Prerequisites

1. **Node.js 18+** installed
2. **Expo CLI**: `npm install -g eas-cli`
3. **Apple Developer Account** ($99/year) — required for iOS App Store
4. **Google Play Developer Account** ($25 one-time) — required for Play Store
5. **Expo account**: Create at https://expo.dev

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (test in Expo Go app)
npx expo start

# Scan the QR code with Expo Go on your phone
```

## Building for App Store

### One-time setup
```bash
# Login to Expo
eas login

# Configure your project ID
eas init

# Update app.json with your Apple Team ID, bundle ID, etc.
```

### iOS Build & Submit
```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios

# Then go to App Store Connect to add screenshots, description, and submit for review
```

### Android Build & Submit
```bash
# Build for Play Store
eas build --platform android --profile production

# Submit to Google Play Console
eas submit --platform android
```

## App Store Requirements Checklist

### iOS (Apple)
- [ ] Apple Developer account enrolled ($99/year)
- [ ] App icon: 1024x1024px PNG (no transparency, no rounded corners)
- [ ] Screenshots: 6.7" (1290x2796), 6.5" (1284x2778), 5.5" (1242x2208)
- [ ] iPad screenshots (if supporting tablet): 12.9" (2048x2732)
- [ ] Privacy policy URL
- [ ] App description (up to 4000 chars)
- [ ] Keywords (up to 100 chars)
- [ ] Support URL
- [ ] Age rating questionnaire completed

### Android (Google Play)
- [ ] Google Play Developer account ($25 one-time)
- [ ] App icon: 512x512px PNG
- [ ] Feature graphic: 1024x500px
- [ ] Screenshots: min 2, phone + tablet
- [ ] Privacy policy URL
- [ ] App description (short: 80 chars, full: 4000 chars)
- [ ] Content rating questionnaire
- [ ] Target audience declaration

## Environment Configuration

Update `app.json` → `extra.apiUrl` to point to your Render deployment:

```json
"extra": {
  "apiUrl": "https://ringside-app.onrender.com"
}
```

## Push Notifications Setup

### iOS
Push notifications work automatically with EAS Build. The Expo push service handles APNs.

### Android  
1. Create a Firebase project at https://console.firebase.google.com
2. Download `google-services.json` and place in project root
3. Push notifications will work automatically via FCM through Expo's service

## Assets Needed

Place these in the `assets/` folder:
- `icon.png` — 1024x1024 app icon
- `splash.png` — 1284x2778 splash screen  
- `adaptive-icon.png` — 1024x1024 Android adaptive icon foreground
- `notification-icon.png` — 96x96 Android notification icon (white + transparent)
- `favicon.png` — 48x48 web favicon
