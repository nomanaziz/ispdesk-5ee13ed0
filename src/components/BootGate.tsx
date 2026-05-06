import { useEffect } from "react";

const SESSION_KEY = "icons-warmed-v1";

/**
 * Removes the static splash immediately and warms icon assets in the
 * background. Keeping icon preload imports out of the first render avoids
 * a long "ISP Desk / Loading…" screen on root and production loads.
 */
export function BootGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hideSplash();

    const alreadyWarmed =
      typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";
    if (alreadyWarmed) {
      return;
    }

    const warmIcons = () => {
      Promise.all([
        import("@/components/icons/Icons8Icon").then((m) => m.preloadAllIcons8()),
        import("@/components/icons/HishabeeIcon").then((m) => m.preloadAllHishabee()),
      ])
        .catch(() => {
          /* non-critical warmup */
        })
        .finally(() => {
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            /* ignore */
          }
        });
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmIcons, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = globalThis.setTimeout(warmIcons, 1);
    return () => globalThis.clearTimeout(timerId);
  }, []);

  return <>{children}</>;
}

function hideSplash() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("boot-splash");
  if (!el) return;
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
  window.setTimeout(() => el.remove(), 250);
}

