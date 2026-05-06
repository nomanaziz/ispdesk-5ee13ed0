import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root")!;
const splashElement = document.getElementById("boot-splash");

const removeBootSplash = () => {
  if (!splashElement) return;
  splashElement.style.opacity = "0";
  splashElement.style.pointerEvents = "none";
  window.setTimeout(() => splashElement.remove(), 250);
};

removeBootSplash();

import("./App.tsx")
  .then(({ default: App }) => {
    createRoot(rootElement).render(<App />);
  })
  .catch((error) => {
    console.error("App failed to boot", error);
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:Inter,system-ui,sans-serif;padding:24px;text-align:center">
        <div>
          <h1 style="font-size:24px;margin:0 0 8px">ISP Desk</h1>
          <p style="margin:0;color:#cbd5e1">App update is loading. Please refresh once.</p>
        </div>
      </div>
    `;
  });

// PWA service worker registration — guarded against Lovable preview iframes
(() => {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") || host.includes("lovableproject.com");

  if (isInIframe || isPreviewHost) {
    // Strip any previously-registered SW so preview always sees fresh code
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  // Production / standalone: register vite-plugin-pwa generated SW
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // virtual module may not be available in some build modes — ignore
    });
})();
