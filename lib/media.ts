export const DOCUMENT_TTL_MS = 5 * 60 * 1000;
export async function prepareDocument(
  file: File,
  lowData = false,
): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a PNG, JPEG or WebP image. For PDFs, photograph or screenshot the page you need.",
    );
  if (file.size > 8_000_000)
    throw new Error("Choose an image smaller than 8 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      (lowData ? 1200 : 1800) / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", lowData ? 0.65 : 0.85);
    if (result.length > 4_000_000)
      throw new Error(
        "This image is too detailed. Crop it to the part you need.",
      );
    return result;
  } finally {
    bitmap.close();
  }
}
