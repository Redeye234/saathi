"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  Download,
  FileText,
  LoaderCircle,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { requestAssistant, downloadBlob } from "../lib/api-client";
import { prepareDocument, DOCUMENT_TTL_MS } from "../lib/media";
import { useVoice } from "../lib/use-voice";
import { exportPackage, packageText } from "../lib/package-export";
import { indiaDate } from "../lib/earnings.mjs";
import { sources } from "../lib/knowledge.mjs";
import type {
  ComplaintPackage,
  ConversationTurn,
  Plan,
  SavedCase,
} from "../lib/types";

type Props = {
  language: string;
  lowData: boolean;
  onSave: (value: SavedCase) => void;
  initial?: SavedCase;
  seed?: string;
  documentFirst?: boolean;
};
export function CaseAssistant({
  language,
  lowData,
  onSave,
  initial,
  seed = "",
  documentFirst = false,
}: Props) {
  const [input, setInput] = useState(seed);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [pack, setPack] = useState<ComplaintPackage | null>(initial || null);
  const [variant, setVariant] = useState<"english" | "hindi" | "local">(
    "english",
  );
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [facts, setFacts] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState<string[]>(
    initial?.checkedEvidence || [],
  );
  const [followUp, setFollowUp] = useState(initial?.followUp || "");
  const [status, setStatus] = useState<SavedCase["status"]>(
    initial?.status || "Draft",
  );
  const id = useRef(initial?.id || crypto.randomUUID());
  const file = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const voice = useVoice((text) => {
    setInput(text);
    void ask(text, true);
  });
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!image) return;
    const timer = setTimeout(() => {
      setImage("");
      setImageName("");
    }, DOCUMENT_TTL_MS);
    return () => clearTimeout(timer);
  }, [image]);
  async function ask(message = input, spoken = false) {
    if (!message.trim() || busy) return;
    setBusy("Making your next-step plan");
    setError("");
    abort.current = new AbortController();
    try {
      const context =
        confirmed && facts
          ? `Worker-reviewed document facts: ${facts}\n\n${message}`
          : message;
      const result = await requestAssistant(
        { mode: "action", message: context, language, history },
        abort.current.signal,
      );
      if (!result.plan)
        throw new Error("The plan did not finish. Please try again.");
      setPlan(result.plan);
      setHistory(
        (previous) =>
          [
            ...previous,
            { role: "user", content: context },
            { role: "assistant", content: JSON.stringify(result.plan) },
          ].slice(-10) as ConversationTurn[],
      );
      setInput("");
      if (spoken && !lowData)
        void voice.speak(`${result.plan.summary} ${result.plan.nextQuestion}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  async function readDocument() {
    if (!image && !input.trim()) return;
    setBusy("Reading your document");
    setError("");
    abort.current = new AbortController();
    try {
      const result = await requestAssistant(
        {
          mode: "document",
          message:
            input.trim() ||
            "Explain this document. Extract the visible payment amount, date, status and work details. Mark unclear text; do not guess.",
          language,
          imageData: image || undefined,
        },
        abort.current.signal,
      );
      setFacts(result.text);
      setConfirmed(false);
      setImage("");
      setImageName("");
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  async function createPackage() {
    setBusy("Preparing Hindi + English complaints");
    setError("");
    abort.current = new AbortController();
    try {
      const result = await requestAssistant(
        {
          mode: "package",
          message: `Prepare a grievance from the conversation. ${confirmed ? `Reviewed document facts: ${facts}` : ""} ${input ? `Additional worker facts: ${input}` : ""}`,
          history,
          language,
        },
        abort.current.signal,
      );
      if (!result.package)
        throw new Error("The package did not finish. Please try again.");
      setPack(result.package);
      setSaved(false);
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  function save() {
    if (!pack) return;
    onSave({
      ...pack,
      id: id.current,
      date: initial?.date || indiaDate(),
      language,
      status,
      followUp,
      checkedEvidence: checked,
    });
    setSaved(true);
  }
  async function pdf() {
    if (!pack) return;
    setBusy("Preparing your download");
    try {
      await exportPackage(pack, language);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "PDF unavailable. Please use the text copy.",
      );
    } finally {
      setBusy("");
    }
  }
  const selectedSources = sources.filter((s) =>
    (pack?.officialLinks || plan?.officialLinks || []).includes(s.id),
  );
  return (
    <div className="case-grid">
      <div className="case-main">
        <div className="panel composer">
          <div className="panel-title">
            <span className="icon-tile">
              <Mic size={21} />
            </span>
            <div>
              <h2>
                {documentFirst
                  ? "Let’s make this document clear."
                  : "Tell me what happened."}
              </h2>
              <p>
                Speak, type, or add a screenshot. We’ll work through it
                together.
              </p>
            </div>
          </div>
          <textarea
            aria-label="Your work issue"
            value={input}
            maxLength={8000}
            onChange={(e) => setInput(e.target.value)}
            placeholder="मेरा भुगतान नहीं आया। / My payment hasn’t arrived…"
            rows={3}
          />
          <div className="composer-actions">
            <div className="row">
              <button
                className={`button ${voice.state === "recording" ? "danger" : "secondary"}`}
                disabled={
                  Boolean(busy) ||
                  ["transcribing", "preparing"].includes(voice.state)
                }
                onClick={() =>
                  voice.state === "recording"
                    ? voice.stop()
                    : void voice.start()
                }
              >
                {voice.state === "recording" ? (
                  <Square size={17} />
                ) : (
                  <Mic size={17} />
                )}{" "}
                {voice.state === "recording"
                  ? `Finish · ${voice.seconds}s`
                  : voice.state === "transcribing"
                    ? "Transcribing…"
                    : "Speak"}
              </button>
              <button
                className="button secondary"
                disabled={Boolean(busy)}
                onClick={() => file.current?.click()}
              >
                <Camera size={17} /> Add document
              </button>
              <input
                ref={file}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const value = e.target.files?.[0];
                  e.target.value = "";
                  if (!value) return;
                  try {
                    setImage(await prepareDocument(value, lowData));
                    setImageName(value.name);
                    setError("");
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }}
              />
            </div>
            <button
              className="button primary"
              disabled={Boolean(busy) || (!input.trim() && !image)}
              onClick={() =>
                image || documentFirst ? void readDocument() : void ask()
              }
            >
              {image || documentFirst
                ? "Explain document"
                : "Find my next step"}
              <ArrowRight size={17} />
            </button>
          </div>
          {image && (
            <div className="document-preview">
              <img src={image} alt="Document ready for explanation" />
              <span>
                {imageName}
                <small>Removed after reading or after 5 minutes.</small>
              </span>
              <button
                className="icon-button"
                aria-label="Remove document"
                onClick={() => {
                  setImage("");
                  setImageName("");
                }}
              >
                <X />
              </button>
            </div>
          )}
          <p className="small muted">
            Voice is AI-generated. Review transcriptions and translations;
            quality varies by language. Hide identity and bank numbers before
            uploading.
          </p>
          {busy && (
            <div className="progress-message" role="status">
              <LoaderCircle className="spin" size={18} />
              {busy}…
            </div>
          )}
          {(error || voice.error) && (
            <p className="notice error" role="alert">
              {error || voice.error}
            </p>
          )}
        </div>
        {facts && (
          <section className="panel">
            <div className="section-heading">
              <h2>What your document says</h2>
              <button
                className="text-button"
                onClick={() => void voice.speak(facts)}
              >
                <Volume2 size={17} />
                Listen
              </button>
            </div>
            <textarea
              aria-label="Review document facts"
              className="document-facts"
              value={facts}
              onChange={(e) => {
                setFacts(e.target.value);
                setConfirmed(false);
              }}
              rows={8}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I reviewed these facts and corrected any mistakes.
            </label>
            <button
              className="button secondary"
              disabled={!confirmed || Boolean(busy)}
              onClick={() =>
                void ask(
                  "Help me choose the next step using these reviewed document facts.",
                )
              }
            >
              <ArrowRight size={17} />
              Use these facts in my plan
            </button>
            <p className="small muted">
              The uploaded image has been removed. Only this explanation remains
              until you leave this screen. AI provider retention policies may
              apply.
            </p>
          </section>
        )}
        {plan && (
          <section className="panel plan-panel" aria-live="polite">
            <span className="eyebrow">YOUR NEXT STEP</span>
            <h2>{plan.title}</h2>
            <p className="answer-text" lang={language}>
              {plan.summary}
            </p>
            <ol className="step-list">
              {plan.nextSteps.map((step, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            {plan.nextQuestion && (
              <div className="followup">
                <strong>One thing to clarify</strong>
                <p>{plan.nextQuestion}</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ask();
                  }}
                >
                  <input
                    aria-label="Answer Saathi’s question"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    required
                    maxLength={2000}
                    placeholder="Your answer…"
                  />
                  <button
                    className="icon-button"
                    aria-label="Send follow-up"
                    disabled={Boolean(busy)}
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            )}
            <div className="row wrap">
              <button
                className="button primary"
                disabled={Boolean(busy)}
                onClick={() => void createPackage()}
              >
                <FileText size={17} />
                Create complaint package
              </button>
              <button
                className="button secondary"
                disabled={["preparing", "recording", "transcribing"].includes(
                  voice.state,
                )}
                onClick={() =>
                  voice.state === "speaking"
                    ? voice.stop()
                    : voice.state === "ready"
                      ? void voice.replay()
                      : void voice.speak(`${plan.summary} ${plan.nextQuestion}`)
                }
              >
                <Volume2 size={17} />
                {voice.state === "speaking"
                  ? "Pause"
                  : voice.state === "ready"
                    ? "Play reply"
                    : "Listen"}
              </button>
            </div>
            {plan.uncertainties.length > 0 && (
              <p className="small muted">
                Please confirm: {plan.uncertainties.join(" ")}
              </p>
            )}
          </section>
        )}
        {pack && (
          <section className="panel package-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">READY FOR YOUR REVIEW</span>
                <h2>{pack.title}</h2>
              </div>
              <span className="status-badge">Hindi + English</span>
            </div>
            <div className="segmented compact">
              {(
                ["english", "hindi", ...(pack.local ? ["local"] : [])] as const
              ).map((v) => (
                <button
                  key={v}
                  className={variant === v ? "selected" : ""}
                  onClick={() => setVariant(v as typeof variant)}
                >
                  {v === "english"
                    ? "English"
                    : v === "hindi"
                      ? "हिन्दी"
                      : language}
                </button>
              ))}
            </div>
            <textarea
              aria-label="Edit complaint"
              value={pack[variant]}
              maxLength={6000}
              rows={13}
              onChange={(e) => {
                setPack({ ...pack, [variant]: e.target.value });
                setSaved(false);
              }}
            />
            <p className="small muted">
              Review names, amounts and placeholders before sharing. Changes to
              one language do not automatically translate to the others.
            </p>
            <h3>Evidence to collect</h3>
            {pack.evidence.map((item) => (
              <label className="check-row" key={item}>
                <input
                  type="checkbox"
                  checked={checked.includes(item)}
                  onChange={() => {
                    setChecked((prev) =>
                      prev.includes(item)
                        ? prev.filter((v) => v !== item)
                        : [...prev, item],
                    );
                    setSaved(false);
                  }}
                />
                {item}
              </label>
            ))}
            <div className="form-grid">
              <label>
                Case status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as SavedCase["status"]);
                    setSaved(false);
                  }}
                >
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Resolved</option>
                </select>
              </label>
              <label>
                My follow-up date
                <input
                  type="date"
                  value={followUp}
                  onChange={(e) => {
                    setFollowUp(e.target.value);
                    setSaved(false);
                  }}
                />
              </label>
            </div>
            <div className="row wrap">
              <button className="button primary" onClick={save}>
                <Check size={17} />
                {saved ? "Saved to workspace" : "Save package"}
              </button>
              <button
                className="button secondary"
                disabled={Boolean(busy)}
                onClick={() => void pdf()}
              >
                <Download size={17} />
                Download PDF
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  downloadBlob(
                    "saathi-complaint.txt",
                    new Blob([packageText(pack, language)], {
                      type: "text/plain;charset=utf-8",
                    }),
                  )
                }
              >
                Text copy
              </button>
              <a
                className="button secondary"
                href={`https://wa.me/?text=${encodeURIComponent(pack[variant])}`}
                target="_blank"
                rel="noreferrer"
              >
                Share on WhatsApp
              </a>
            </div>
            <p className="small muted">
              WhatsApp opens with the selected letter. You choose the recipient
              and send it. Download the PDF to attach the full bilingual
              package.
            </p>
            {pack.uncertainties.length > 0 && (
              <div className="notice">{pack.uncertainties.join(" ")}</div>
            )}
          </section>
        )}
        {!plan && !facts && !pack && (
          <div className="starter-prompts">
            {[
              "My payment hasn’t arrived",
              "Explain a deduction from my wages",
              "Help me prepare a complaint",
            ].map((text) => (
              <button
                key={text}
                onClick={() => {
                  setInput(text);
                  void ask(text);
                }}
                disabled={Boolean(busy)}
              >
                <Plus size={16} />
                {text}
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        )}
      </div>
      <aside className="case-side">
        <div className="panel trust-card">
          <ShieldCheck size={26} />
          <h3>You stay in control.</h3>
          <p>
            Saathi helps you understand, gather evidence and prepare. Nothing is
            submitted automatically.
          </p>
          <div className="journey">
            <span className={plan ? "done" : ""}>1 · Understand the issue</span>
            <span className={facts ? "done" : ""}>
              2 · Review your evidence
            </span>
            <span className={pack ? "done" : ""}>3 · Prepare & save</span>
          </div>
        </div>
        <div className="panel">
          <h3>Official references</h3>
          {selectedSources.length ? (
            selectedSources.map((s) => (
              <a
                className="source-link"
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                {s.title}
                <small>Reviewed {s.reviewed} ↗</small>
              </a>
            ))
          ) : (
            <p className="small muted">
              Relevant official links appear here when available. For a platform
              payment issue, begin with that platform’s official support.
            </p>
          )}
          <p className="small muted">
            AI can make mistakes. Rules and eligibility can change; check the
            linked official source.
          </p>
        </div>
      </aside>
    </div>
  );
}
