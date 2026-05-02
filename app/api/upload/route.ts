// app/api/upload/route.ts
// Saves images locally under /public/uploads/listings for development.
// For production: swap the writeFile block for Cloudinary, S3, or Supabase Storage.
//
// Cloudinary drop-in:
//   import { v2 as cloudinary } from "cloudinary";
//   const result = await cloudinary.uploader.upload(dataURI, { folder: "lendme/listings" });
//   return NextResponse.json({ data: { url: result.secure_url } }, { status: 201 });

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext    = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const name   = `${randomUUID()}.${ext}`;
    const dir    = join(process.cwd(), "public", "uploads", "listings");

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), buffer);

    const url = `/uploads/listings/${name}`;
    return NextResponse.json({ data: { url } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}