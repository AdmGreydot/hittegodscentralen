const MAX_SIDE = 1600;
const QUALITY = 0.85;

// Scales a photo down to at most 1600px on the longest side and re-encodes it as JPEG, so a
// 6 MB phone photo becomes a few hundred KB before upload. Returns null if the browser can't
// read the file (e.g. HEIC in some browsers).
export async function resizeImage(file: File): Promise<File | null> {
  let bitmap: ImageBitmap;
  try {
    // Respect the photo's EXIF rotation so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

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
