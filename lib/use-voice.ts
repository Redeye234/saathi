"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api-url";

export function useVoice(onTranscript: (text: string) => void) {
  const [state, setState] = useState<
    "idle" | "recording" | "transcribing" | "preparing" | "speaking" | "ready"
  >("idle");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef("");
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const handler = useRef(onTranscript);
  useEffect(() => {
    handler.current = onTranscript;
  }, [onTranscript]);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    audio.current?.pause();
    if (state === "speaking") setState("ready");
  };
  async function start() {
    setError("");
    if (!navigator.onLine) {
      setError(
        "Reconnect to use voice. You can still type and save records offline.",
      );
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Recording is unavailable in this browser. Please type your question.",
      );
      return;
    }
    try {
      audio.current?.pause();
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (v) => MediaRecorder.isTypeSupported(v),
      );
      const recording = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : undefined,
      );
      recorder.current = recording;
      const chunks: BlobPart[] = [];
      recording.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recording.onstop = async () => {
        if (timer.current) clearInterval(timer.current);
        stream.current?.getTracks().forEach((t) => t.stop());
        setState("transcribing");
        controller.current = new AbortController();
        try {
          const form = new FormData();
          form.append(
            "audio",
            new Blob(chunks, { type: recording.mimeType || "audio/webm" }),
            "recording",
          );
          const response = await apiFetch("/api/voice/transcribe", {
            method: "POST",
            body: form,
            signal: controller.current.signal,
          });
          const result = (await response.json()) as {
            error?: string;
            text: string;
          };
          if (!response.ok)
            throw new Error(result.error || "Speech could not be understood.");
          setState("idle");
          handler.current(result.text);
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            setError(e instanceof Error ? e.message : "Please try again.");
            setState("idle");
          }
        }
      };
      let elapsed = 0;
      setSeconds(0);
      setState("recording");
      recording.start();
      timer.current = setInterval(() => {
        elapsed++;
        setSeconds(elapsed);
        if (elapsed >= 60) recording.stop();
      }, 1000);
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      setState("idle");
      setError(
        "Microphone access was not available. Allow it in your browser or type below.",
      );
    }
  }
  async function speak(text: string) {
    if (!navigator.onLine) {
      setError("Reconnect to listen to this answer.");
      return;
    }
    setError("");
    audio.current?.pause();
    controller.current?.abort();
    controller.current = new AbortController();
    setState("preparing");
    try {
      const response = await apiFetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 3500) }),
        signal: controller.current.signal,
      });
      if (!response.ok) {
        const result = (await response.json()) as {
          error?: string;
          text: string;
        };
        throw new Error(result.error || "Audio unavailable.");
      }
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(await response.blob());
      audio.current = new Audio(url.current);
      audio.current.onended = () => setState("ready");
      try {
        await audio.current.play();
        setState("speaking");
      } catch {
        setState("ready");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Please try again.");
        setState("idle");
      }
    }
  }
  async function replay() {
    try {
      await audio.current?.play();
      setState("speaking");
    } catch {
      setError("Your browser could not play the audio.");
    }
  }
  return { state, error, seconds, start, stop, speak, replay };
}
