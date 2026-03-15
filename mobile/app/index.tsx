import { useRef, useState, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  BackHandler,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import Constants from "expo-constants";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl || "https://ringside-app.onrender.com";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => handler.remove();
  }, [canGoBack]);

  const onNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  // Inject JS to pass the auth token from AsyncStorage into the WebView
  const injectedJS = `
    (function() {
      // Bridge: native app can send auth token to web app
      window.isNativeApp = true;
      window.nativePlatform = '${Platform.OS}';

      // Override fetch to add auth header if token exists
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        return originalFetch.apply(this, arguments);
      };
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: API_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsBackForwardNavigationGestures
        onNavigationStateChange={onNavigationStateChange}
        injectedJavaScript={injectedJS}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("WebView error:", nativeEvent);
        }}
        // Allow web push, camera, etc.
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        // Pull to refresh
        pullToRefreshEnabled
        // Handle external links
        onShouldStartLoadWithRequest={(request) => {
          // Open Stripe checkout and other external links in system browser
          if (
            request.url.includes("checkout.stripe.com") ||
            request.url.includes("billing.stripe.com") ||
            (!request.url.startsWith(API_URL) && !request.url.startsWith("about:"))
          ) {
            return false; // system browser handles it
          }
          return true;
        }}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#8B6914" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0EB",
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F0EB",
  },
});
