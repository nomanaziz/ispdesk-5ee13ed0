import { supabase } from "@/integrations/supabase/client";

export type LogEventInput = {
  action: string;
  entity_type?: string;
  entity_id?: string;
  entity_label?: string;
  severity?: "info" | "warning" | "error" | "critical";
  message?: string;
  metadata?: Record<string, any>;
  device_name?: string;
};

export async function logEvent(payload: LogEventInput) {
  try {
    await supabase.functions.invoke("log-event", { body: payload });
  } catch {
    // best-effort, never block UI
  }
}
