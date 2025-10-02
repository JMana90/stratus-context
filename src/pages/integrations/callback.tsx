import { useEffect } from "react";

export default function OAuthCallbackRelay() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const provider = url.searchParams.get("provider") ?? "unknown";
    const status = (url.searchParams.get("status") as "success" | "error") ?? "error";
    const message = url.searchParams.get("message") ?? undefined;
    // Tell opener and close
    if (window.opener) {
      window.opener.postMessage({ type: "OAUTH_RESULT", provider, status, message }, window.location.origin);
      window.close();
    }
  }, []);
  return null;
}