import { supabase } from "@/integrations/supabase/client";

export type NotifChannel = "sms" | "email" | "whatsapp";

export interface SendNotifInput {
  tenant_id: string;
  channel: NotifChannel;
  recipient: string;
  template_category?: string;
  template_id?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, string | number>;
  context?: Record<string, unknown>;
}

export async function sendNotification(input: SendNotifInput) {
  const { data, error } = await supabase.functions.invoke("send-notification", { body: input });
  if (error) throw error;
  return data as { success: boolean; message_id?: string; error?: string };
}

export const NOTIF_CATEGORIES = [
  { value: "bill_reminder", label: "বিল রিমাইন্ডার" },
  { value: "payment_confirm", label: "পেমেন্ট কনফার্ম" },
  { value: "disconnect_notice", label: "ডিসকানেক্ট নোটিশ" },
  { value: "reconnect_confirm", label: "পুনঃসংযোগ" },
  { value: "ticket_update", label: "টিকেট আপডেট" },
  { value: "welcome", label: "ওয়েলকাম" },
  { value: "otp", label: "OTP / ভেরিফিকেশন" },
  { value: "custom", label: "কাস্টম" },
];

export const SMS_PROVIDERS = [
  { value: "sslwireless", label: "SSL Wireless" },
  { value: "mobireach", label: "MobiReach" },
  { value: "webhook", label: "Generic Webhook" },
];

export const EMAIL_PROVIDERS = [{ value: "resend", label: "Resend" }];
export const WA_PROVIDERS = [{ value: "whatsapp_cloud", label: "WhatsApp Cloud API (Meta)" }];
