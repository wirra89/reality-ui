import { supabase } from "./supabase";

export interface ProgressEntry {
  id: string;
  date: string;          // "YYYY-MM-DD"
  imageUrl: string;      // signed URL (1 hour TTL)
  storagePath: string;   // e.g. "{user_id}/entries/{uuid}.jpg"
  weight: number | null;
  mood: string | null;
  note: string | null;
  phase: string | null;
  createdAt: string;
}

export interface CreateProgressEntryInput {
  file: File;
  date: string;
  weight?: number | null;
  mood?: string | null;
  note?: string | null;
  phase?: string | null;
}

interface ProgressEntryRow {
  id: string;
  user_id: string;
  date: string;
  image_url: string;
  weight: number | null;
  mood: string | null;
  note: string | null;
  phase: string | null;
  created_at: string;
}

async function toProgressEntry(row: ProgressEntryRow): Promise<ProgressEntry | null> {
  const { data } = await supabase.storage
    .from("progress-photos")
    .createSignedUrl(row.image_url, 3600);
  if (!data?.signedUrl) return null;
  return {
    id:          row.id,
    date:        row.date,
    imageUrl:    data.signedUrl,
    storagePath: row.image_url,
    weight:      row.weight,
    mood:        row.mood,
    note:        row.note,
    phase:       row.phase,
    createdAt:   row.created_at,
  };
}

export async function getProgressEntries(): Promise<ProgressEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("progress_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];

  const results = await Promise.all(
    (data as ProgressEntryRow[]).map(toProgressEntry)
  );
  return results.filter((e): e is ProgressEntry => e !== null);
}

export async function createProgressEntry(input: CreateProgressEntryInput): Promise<ProgressEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext  = input.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/entries/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("progress-photos")
    .upload(path, input.file, { contentType: input.file.type });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error: insertError } = await supabase
    .from("progress_entries")
    .insert({
      user_id:   user.id,
      date:      input.date,
      image_url: path,
      weight:    input.weight ?? null,
      mood:      input.mood   ?? null,
      note:      input.note   ?? null,
      phase:     input.phase  ?? null,
    })
    .select("*")
    .single();
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  const entry = await toProgressEntry(data as ProgressEntryRow);
  if (!entry) throw new Error("Signed URL failed after insert");
  return entry;
}

export async function deleteProgressEntry(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from("progress-photos").remove([storagePath]);
  await supabase.from("progress_entries").delete().eq("id", id);
}
