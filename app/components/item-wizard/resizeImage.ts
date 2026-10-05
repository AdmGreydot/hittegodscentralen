const MAX_SIDE = 1600;
const QUALITY = 0.85;

// iPhone photos (HEIC/HEIF). Windows and some Android browsers report no MIME type for them,
// so the file name is checked too.
export function isHeicFile(file: File) {
  return /^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

// Decodes the photo. Safari reads HEIC itself; Chrome, Edge and Firefox can't, so for those the
// HEIC decoder (heic-to, a few MB) is loaded, but only when someone actually picks a HEIC file.
async function decode(file: File): Promise<ImageBitmap | null> {
  try {
    // Respect the photo's EXIF rotation so portrait photos stay upright.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (!isHeicFile(file)) return null;
  }
  try {
    const { heicTo } = await import("heic-to/next");
    return await heicTo({ blob: file, type: "bitmap", options: { imageOrientation: "from-image" } });
  } catch (error) {
    console.error("HEIC decode failed", error);
    return null;
  }
}

// Scales a photo down to at most 1600px on the longest side and re-encodes it as JPEG, so a
// 6 MB phone photo becomes a few hundred KB before upload. HEIC photos come out as JPEG too, so
// the server and every browser only ever see JPEG. Returns null if the file can't be read.
export async function resizeImage(file: File): Promise<File | null> {
  const bitmap = await decode(file);
  if (!bitmap) return null;

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  // White behind transparent PNGs, since JPEG has no transparency.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) return null;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
