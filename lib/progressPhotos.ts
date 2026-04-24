import { supabase } from "./supabase";

export interface ProgressPhoto {
  id: string;
  photoUrl: string;      // signed URL (valid 1 hour)
  storagePath: string;   // e.g. "{user_id}/{uuid}.jpg"
  takenAt: string;       // ISO string
}

interface ProgressPhotoRow {
  id: string;
  user_id: string;
  photo_url: string;
  taken_at: string;
  created_at: string;
}

export async function getProgressPhotos(): Promise<ProgressPhoto[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: true });

  if (error || !data) return [];

  const photos: ProgressPhoto[] = [];
  for (const row of data as ProgressPhotoRow[]) {
    const { data: signedData } = await supabase.storage
      .from("progress-photos")
      .createSignedUrl(row.photo_url, 3600);
    if (signedData?.signedUrl) {
      photos.push({
        id: row.id,
        photoUrl: signedData.signedUrl,
        storagePath: row.photo_url,
        takenAt: row.taken_at,
      });
    }
  }
  return photos;
}

export async function uploadProgressPhoto(file: File): Promise<ProgressPhoto> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("progress-photos")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error: insertError } = await supabase
    .from("progress_photos")
    .insert({ user_id: user.id, photo_url: path })
    .select("*")
    .single();
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  const row = data as ProgressPhotoRow;
  const { data: signedData } = await supabase.storage
    .from("progress-photos")
    .createSignedUrl(path, 3600);

  return {
    id: row.id,
    photoUrl: signedData?.signedUrl ?? "",
    storagePath: path,
    takenAt: row.taken_at,
  };
}

export async function deleteProgressPhoto(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from("progress-photos").remove([storagePath]);
  await supabase.from("progress_photos").delete().eq("id", id);
}
