import { json, limitedBody, readJson, sameOrigin } from "./http.mjs";

export async function handleAudio(request, mode, config = {}, fetcher = fetch) {
  if (!sameOrigin(request))
    return json({ error: "This request must come from Saathi." }, 403);
  if (!config.apiKey) return json({ error: "Voice AI is not connected." }, 503);
  let body,
    headers = { Authorization: `Bearer ${config.apiKey}` };
  try {
    if (mode === "transcribe") {
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data"))
        return json({ error: "Send an audio recording." }, 415);
      const raw = await limitedBody(request, 6000000);
      const form = await new Response(raw, {
        headers: { "Content-Type": contentType },
      }).formData();
      const audio = form.get("audio");
      const extensions = {
        "audio/webm": "webm",
        "video/webm": "webm",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/ogg": "ogg",
      };
      if (
        !audio ||
        typeof audio === "string" ||
        !audio.size ||
        audio.size > 5000000 ||
        !extensions[audio.type.split(";")[0]]
      )
        return json(
          {
            error:
              "Use a recording under 5 MB in WebM, MP4, MP3, WAV or OGG format.",
          },
          400,
        );
      body = new FormData();
      body.append(
        "file",
        audio,
        `recording.${extensions[audio.type.split(";")[0]]}`,
      );
      body.append(
        "model",
        config.transcriptionModel || "gpt-4o-mini-transcribe",
      );
      body.append("response_format", "json");
    } else {
      if (!request.headers.get("content-type")?.includes("application/json"))
        return json({ error: "Send text as JSON." }, 415);
      const input = await readJson(request, 20000);
      if (
        typeof input.text !== "string" ||
        !input.text.trim() ||
        input.text.length > 3500
      )
        return json({ error: "Choose a shorter passage to read aloud." }, 400);
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({
        model: config.speechModel || "gpt-4o-mini-tts",
        voice: "coral",
        input: input.text,
        response_format: "mp3",
        instructions:
          "Read the supplied text warmly and clearly in its original language. Do not add any words.",
      });
    }
  } catch (e) {
    return json(
      { error: "The recording or text could not be read." },
      e instanceof RangeError ? 413 : 400,
    );
  }
  try {
    const response = await fetcher(
      `https://api.openai.com/v1/audio/${mode === "transcribe" ? "transcriptions" : "speech"}`,
      { method: "POST", headers, body, signal: AbortSignal.timeout(60000) },
    );
    if (!response.ok)
      return json(
        {
          error: "Voice is temporarily unavailable. Please type or try again.",
        },
        response.status === 429 ? 429 : 502,
      );
    if (mode === "transcribe") {
      const result = await response.json();
      return typeof result.text === "string" && result.text.trim()
        ? json({ text: result.text })
        : json({ error: "No speech was heard. Please try again." }, 422);
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json(
      { error: "Voice connection timed out. Please try again." },
      504,
    );
  }
}
