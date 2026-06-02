"use client";

import { useEffect } from "react";

/** Swallow benign WalletConnect session timeout rejections so they don't spam the console. */
export function WalletConnectErrorGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onUnhandled = (event: PromiseRejectionEvent) => {
      const message = String(event.reason?.message ?? event.reason ?? "");
      if (
        message.includes("Proposal expired") ||
        message.includes("No matching key") ||
        message.includes("session topic")
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  return <>{children}</>;
}
