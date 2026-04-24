import { useEffect, useState } from "react";
import { preloadAllIcons8 } from "@/components/icons/Icons8Icon";
import { preloadAllHishabee } from "@/components/icons/HishabeeIcon";

const SESSION_KEY = "icons-warmed-v1";
const MAX_WAIT_MS = 3000;

/**
 * Holds the very first render until every Icons8 + Hishabee asset has
 * decoded, so sidebars/menus paint with all icons present (no
 * "text first, icon later" flash).
 *
 * Skipped on subsequent navigations within the same browser tab — the
 * splash element in index.html is hidden either way.
 */
export function BootGate({ children }: { children: React.ReactNode }) {
  const alreadyWarmed =
    typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";
  const [ready, setReady] = useState(alreadyWarmed);

  useEffect(() => {
    if (alreadyWarmed) {
      hideSplash();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      hideSplash();
      setReady(true);
    };

    const timeout = window.setTimeout(finish, MAX_WAIT_MS);
    Promise.all([preloadAllIcons8(), preloadAllHishabee()])
      .then(finish)
      .catch(finish)
      .finally(() => window.clearTimeout(timeout));

    return () => window.clearTimeout(timeout);
  }, [alreadyWarmed]);

  if (!ready) return null;
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
