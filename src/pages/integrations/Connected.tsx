import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function IntegrationsConnected() {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const provider = searchParams.get('provider');
    const level = searchParams.get('level');
    const status = searchParams.get('status');
    
    // Notify parent window if we're in a popup
    if (window.opener) {
      window.opener.postMessage({ 
        type: "oauth-finished", 
        provider, 
        level, 
        status 
      }, "*");
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Authorization Complete</h1>
        <p className="text-muted-foreground">You can close this window.</p>
      </div>
    </div>
  );
}