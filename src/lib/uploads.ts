// Server-side image validation for payment screenshots. Never trust the client
// filename or Content-Type — sniff magic bytes.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export type ValidatedImage = { bytes: Buffer; contentType: string };

export type UploadValidation = { ok: true; image: ValidatedImage } | { ok: false; error: string };

// Detect jpeg/png/webp from leading bytes.
function sniff(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function validateImageUpload(file: unknown): Promise<UploadValidation> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please attach a payment screenshot." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image is too large (max 5MB)." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = sniff(bytes);
  if (!contentType) {
    return { ok: false, error: "Upload a JPEG, PNG, or WebP image." };
  }
  return { ok: true, image: { bytes, contentType } };
}
