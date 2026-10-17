"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  AudioLines,
  FileCheck2,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { Logo, WorkersArt } from "./brand";

export function LoginLanding({
  googleConfigured,
}: {
  googleConfigured: boolean;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("saathi-demo-2026");
  const [name, setName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function changeMode(value: "signin" | "signup") {
    setMode(value);
    setError("");
    setUsername(value === "signin" ? "demo" : "");
    setPassword(value === "signin" ? "saathi-demo-2026" : "");
    setConfirmation("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "signup" && confirmation !== password) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/auth/${mode === "signup" ? "signup" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            confirmPassword: confirmation,
            displayName: name,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Please try again.");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <div className="entry-page">
      <header className="entry-header">
        <Logo />
        <span>
          <ShieldCheck size={17} /> Made for your workday
        </span>
      </header>
      <main className="entry-main">
        <section className="entry-story">
          <span className="eyebrow">YOUR WORK. YOUR VOICE. YOUR SAATHI.</span>
          <h1>
            A little support.
            <br />
            <em>A better workday.</em>
          </h1>
          <p>
            Speak in your language. Understand your paperwork. Turn a missed
            payment into a clear next step.
          </p>
          <div className="entry-points">
            <span>
              <AudioLines />
              Speak naturally
            </span>
            <span>
              <FileCheck2 />
              Leave with a plan
            </span>
          </div>
          <WorkersArt />
          <span className="entry-caption">
            For delivery partners, drivers & everyday workers across India.
          </span>
        </section>
        <section className="entry-access" aria-label="Account access">
          <div className="auth-card">
            <div className="segmented">
              <button
                className={mode === "signin" ? "selected" : ""}
                onClick={() => changeMode("signin")}
              >
                Sign in
              </button>
              <button
                className={mode === "signup" ? "selected" : ""}
                onClick={() => changeMode("signup")}
              >
                Create account
              </button>
            </div>
            <h2>
              {mode === "signin"
                ? "Good to see you."
                : "Your Saathi starts here."}
            </h2>
            <p className="muted">
              {mode === "signin"
                ? "Try the demo, or enter your own account details."
                : "Keep your earnings, plans and complaints in one place."}
            </p>
            <form onSubmit={submit} autoComplete="on">
              {mode === "signup" && (
                <label>
                  Display name
                  <input
                    name="name"
                    autoComplete="name"
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <label>
                Username
                <input
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9._-]+"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {mode === "signup" && (
                <label>
                  Confirm password
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              )}
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary full" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" />
                ) : mode === "signup" ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
                <ArrowRight size={18} />
              </button>
            </form>
            {googleConfigured && (
              <a className="button secondary full" href="/api/google/start">
                Continue with Google
              </a>
            )}
          </div>
          <div className="demo-note">
            <strong>Just exploring?</strong>
            <span>
              Demo details are already filled in. It’s a shared space—use a
              personal account for your own records.
            </span>
            <button
              className="text-button"
              onClick={() => changeMode("signin")}
            >
              Use demo account <ArrowRight size={16} />
            </button>
          </div>
          <p className="small muted">
            Your browser’s password manager can save your personal login. Saathi
            never stores a readable password.
          </p>
        </section>
      </main>
      <footer className="entry-footer">
        <span>English + 22 scheduled Indian languages</span>
        <span>Voice, documents & practical next steps</span>
      </footer>
    </div>
  );
}
