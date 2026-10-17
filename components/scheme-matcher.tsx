"use client";
import { useState } from "react";
import { Sprout, ArrowUpRight, Volume2 } from "lucide-react";
import { matchSchemes } from "../lib/schemes.mjs";
import { sources } from "../lib/knowledge.mjs";
import { requestAssistant } from "../lib/api-client";
import { useVoice } from "../lib/use-voice";
export function SchemeMatcher({
  language,
  state,
  role,
}: {
  language: string;
  state: string;
  role: string;
}) {
  const [profile, setProfile] = useState({
    age: "",
    income: "",
    state,
    role,
    coverage: "unknown",
    tax: "unknown",
    bank: "unknown",
    days: "",
  });
  const [show, setShow] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const voice = useVoice(() => {});
  const results = matchSchemes(profile);
  const field = (key: keyof typeof profile, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setExplanation("");
  };
  async function explain() {
    setBusy(true);
    setError("");
    try {
      const result = await requestAssistant({
        mode: "chat",
        message: `Explain these preliminary scheme checks simply. Do not upgrade potential matches to confirmed eligibility: ${JSON.stringify(results)}. Ask the most important missing question.`,
        language,
      });
      setExplanation(result.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">SUPPORT THAT FITS YOUR LIFE</span>
        <h1>Find your next opportunity.</h1>
        <p>
          A few details help narrow down the official schemes worth exploring.
        </p>
      </div>
      <div className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShow(true);
          }}
        >
          <div className="form-grid three">
            <label>
              Age
              <input
                type="number"
                min="16"
                max="110"
                value={profile.age}
                onChange={(e) => field("age", e.target.value)}
                required
              />
            </label>
            <label>
              Monthly income (₹)
              <input
                type="number"
                min="0"
                max="10000000"
                value={profile.income}
                onChange={(e) => field("income", e.target.value)}
                required
              />
            </label>
            <label>
              State where you work
              <input
                value={profile.state}
                onChange={(e) => field("state", e.target.value)}
                maxLength={80}
                required
                placeholder="e.g. Maharashtra"
              />
            </label>
            <label>
              Type of work
              <select
                value={profile.role}
                onChange={(e) => field("role", e.target.value)}
              >
                {[
                  "Delivery partner",
                  "Driver",
                  "Daily-wage worker",
                  "Construction worker",
                  "Domestic worker",
                  "Street vendor",
                  "Other informal work",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {(["coverage", "tax", "bank"] as const).map((key) => (
              <label key={key}>
                {key === "coverage"
                  ? "EPFO / ESIC / NPS or government job?"
                  : key === "tax"
                    ? "Do you pay income tax?"
                    : "Bank or post-office account?"}
                <select
                  value={profile[key]}
                  onChange={(e) => field(key, e.target.value)}
                >
                  <option value="unknown">Not sure</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            ))}
            {profile.role === "Construction worker" && (
              <label>
                Construction days in last 12 months
                <input
                  type="number"
                  min="0"
                  max="366"
                  value={profile.days}
                  onChange={(e) => field("days", e.target.value)}
                />
              </label>
            )}
          </div>
          <button className="button primary">
            <Sprout size={18} />
            Find potential matches
          </button>
        </form>
        <p className="small muted">
          Preliminary checks, not an eligibility decision. Insurance needs
          premium consent and a participating account. At age 70 (PMSBY) or 60
          (construction board), confirm entry rules directly. Other pension
          coverage and documentation can affect PM-SYM.
        </p>
      </div>
      {show && (
        <>
          <div className="scheme-grid">
            {results.map((result) => (
              <article className="panel" key={result.id}>
                <span
                  className={`status-badge ${result.status === "Potential match" ? "positive" : ""}`}
                >
                  {result.status}
                </span>
                <h2>{result.title}</h2>
                <p>{result.description}</p>
                <ul>
                  {result.reasons.map((reason: string) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <a
                  className="text-button"
                  href={sources.find((s) => s.id === result.id)?.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Check official details <ArrowUpRight size={16} />
                </a>
              </article>
            ))}
          </div>
          <div className="panel">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void explain()}
            >
              {busy ? "Explaining…" : `Explain my results in ${language}`}
            </button>
            {explanation && (
              <>
                <p className="answer-text">{explanation}</p>
                <button
                  className="text-button"
                  onClick={() => void voice.speak(explanation)}
                >
                  <Volume2 size={17} />
                  Listen · AI voice
                </button>
              </>
            )}
            {(error || voice.error) && (
              <p role="alert" className="notice error">
                {error || voice.error}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
