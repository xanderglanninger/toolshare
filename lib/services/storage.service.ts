// Configure with Supabase Storage or AWS S3
// npm install @supabase/storage-js  OR  @aws-sdk/client-s3

export async function uploadImage(
  file: File,
  folder: "equipment" | "avatars"
): Promise<string> {
  // TODO: implement upload and return public URL
  throw new Error("Storage not yet configured");
}

export async function deleteImage(url: string): Promise<void> {
  // TODO: delete from bucket
  throw new Error("Storage not yet configured");
}
