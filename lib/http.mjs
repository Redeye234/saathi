export const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export const sameOrigin = (request) =>
  !request.headers.get("origin") ||
  request.headers.get("origin") === new URL(request.url).origin;
export async function limitedBody(request, limit) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new RangeError("Request too large");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        throw new RangeError("Request too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export const readJson = async (request, limit) =>
  JSON.parse(new TextDecoder().decode(await limitedBody(request, limit)));
