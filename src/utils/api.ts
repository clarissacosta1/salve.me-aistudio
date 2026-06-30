/**
 * Utility helper to resolve API endpoints.
 * When running as a native mobile application (via Android Studio, iOS Xcode, or Capacitor/Cordova),
 * relative paths like "/api/situations" will fail on device because the origin is "localhost" or "capacitor://".
 * This helper automatically prefixes the deployed backend URL when running natively or when configured.
 */

const NATIVE_BACKEND_URL = "https://ais-pre-gthyx5g3l4lrsoceaddzap-478459567488.europe-west1.run.app";

export function getApiUrl(endpoint: string): string {
  // Ensure the endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Check if we are running in a native web view environment (Capacitor or Cordova)
  const isCapacitorNative = 
    typeof window !== "undefined" && 
    ((window as any).Capacitor?.isNative || 
     window.location.protocol === "capacitor:" || 
     window.location.protocol === "file:");

  // Check if we have a custom public VITE URL configured
  const envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;

  if (envBaseUrl) {
    return `${envBaseUrl}${cleanEndpoint}`;
  }

  if (isCapacitorNative) {
    return `${NATIVE_BACKEND_URL}${cleanEndpoint}`;
  }

  return cleanEndpoint;
}
