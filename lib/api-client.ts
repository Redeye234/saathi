import type { ComplaintPackage, ConversationTurn, Plan, Source } from "./types";

export type AssistantResult = {
  text: string;
  sources: Source[];
  plan?: Plan;
  package?: ComplaintPackage;
};
export async function requestAssistant(
  input: {
    mode: string;
    message: string;
    language: string;
    history?: ConversationTurn[];
    imageData?: string;
  },
  signal?: AbortSignal,
): Promise<AssistantResult> {
  if (!navigator.onLine)
    throw new Error(
      "You are offline. Your records and saved packages still work. Connect to use AI.",
    );
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: signal || AbortSignal.timeout(90000),
  });
  const body = (await response.json()) as AssistantResult & { error?: string };
  if (!response.ok)
    throw new Error(
      body.error || "Saathi could not complete this request. Please try again.",
    );
  return body;
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
