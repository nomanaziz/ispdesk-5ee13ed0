import { supabase } from "@/integrations/supabase/client";

export type NoteOwnerType = "admin" | "pop" | "client";
export const NOTE_COLORS = ["yellow", "blue", "green", "pink", "purple", "orange"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export interface UserNote {
  id: string;
  owner_type: string;
  owner_id: string;
  title: string | null;
  content: string;
  color: NoteColor;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteInput {
  title?: string | null;
  content: string;
  color: NoteColor;
  pinned?: boolean;
}

async function callPortalNotes<T = any>(action: string, payload: any = {}): Promise<T> {
  const token = localStorage.getItem("portal_token");
  if (!token) throw new Error("Not authenticated");
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/portal-notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json.data as T;
}

function isPortal(ownerType: NoteOwnerType) {
  return ownerType === "pop" || ownerType === "client";
}

export const notesApi = {
  async list(ownerType: NoteOwnerType): Promise<UserNote[]> {
    if (isPortal(ownerType)) {
      return await callPortalNotes<UserNote[]>("list");
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("user_notes")
      .select("*")
      .eq("owner_type", "admin")
      .eq("owner_id", user.id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []) as UserNote[];
  },

  async create(ownerType: NoteOwnerType, input: NoteInput): Promise<UserNote> {
    if (isPortal(ownerType)) {
      return await callPortalNotes<UserNote>("create", input);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("user_notes")
      .insert({
        owner_type: "admin",
        owner_id: user.id,
        title: input.title ?? null,
        content: input.content,
        color: input.color,
        pinned: !!input.pinned,
      })
      .select()
      .single();
    if (error) throw error;
    return data as UserNote;
  },

  async update(
    ownerType: NoteOwnerType,
    id: string,
    patch: Partial<NoteInput>,
  ): Promise<UserNote> {
    if (isPortal(ownerType)) {
      return await callPortalNotes<UserNote>("update", { id, ...patch });
    }
    const { data, error } = await supabase
      .from("user_notes")
      .update(patch as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as UserNote;
  },

  async remove(ownerType: NoteOwnerType, id: string): Promise<void> {
    if (isPortal(ownerType)) {
      await callPortalNotes("delete", { id });
      return;
    }
    const { error } = await supabase.from("user_notes").delete().eq("id", id);
    if (error) throw error;
  },

  async togglePin(ownerType: NoteOwnerType, note: UserNote): Promise<UserNote> {
    return await this.update(ownerType, note.id, { pinned: !note.pinned });
  },
};
