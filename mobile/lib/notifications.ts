/**
 * Native push notification setup using Expo Notifications.
 * 
 * On iOS, this requires an Apple Developer account and push notification capability.
 * On Android, this requires Firebase Cloud Messaging (google-services.json).
 * 
 * The Expo push token is sent to the Ringside backend, which can then send
 * notifications via Expo's push notification service.
 */
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl || "https://ringside-app.onrender.com";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and store the token.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("ringside", {
      name: "Ringside Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B6914",
      sound: "default",
    });
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const pushToken = tokenData.data;

  // Store locally
  await AsyncStorage.setItem("expoPushToken", pushToken);

  console.log("Expo push token:", pushToken);
  return pushToken;
}

/**
 * Send the Expo push token to the Ringside backend.
 * Call this after the user logs in so we can associate the token with their account.
 */
export async function sendPushTokenToServer(authToken: string): Promise<void> {
  const pushToken = await AsyncStorage.getItem("expoPushToken");
  if (!pushToken) return;

  try {
    await fetch(`${API_URL}/api/push/register-native`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ expoPushToken: pushToken }),
    });
  } catch (err) {
    console.error("Failed to register push token with server:", err);
  }
}

/**
 * Listen for notification taps (when user taps on a notification).
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
