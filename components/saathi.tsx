"use client";
import { useState } from "react";
import {
  Home,
  Mic,
  Wallet,
  Sprout,
  FileText,
  ShieldCheck,
  Menu,
  LogOut,
  ArrowRight,
  Plus,
  Trash2,
  Download,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import { Logo, WorkersArt } from "./brand";
import { LoginLanding } from "./login-landing";
import { CaseAssistant } from "./case-assistant";
import { SchemeMatcher } from "./scheme-matcher";
import { useWorkspace } from "../lib/use-workspace";
import { languages, navigation } from "../lib/languages";
import { indiaDate, summarize, csvExport } from "../lib/earnings.mjs";
import { downloadBlob } from "../lib/api-client";
import type { SavedCase } from "../lib/types";

const views = [
  "overview",
  "assistant",
  "earnings",
  "schemes",
  "documents",
  "safety",
  "cases",
] as const;
type View = (typeof views)[number];
const icons = [Home, Mic, Wallet, Sprout, FileText, ShieldCheck, FileText];
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export default function Saathi() {
  const workspace = useWorkspace();
  const { data, update, session, online } = workspace;
  const [view, setView] = useState<View>("overview");
  const [menu, setMenu] = useState(false);
  const [activeCase, setActiveCase] = useState<SavedCase | undefined>();
  const [seed, setSeed] = useState("");
  const [caseKey, setCaseKey] = useState(0);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("income");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(indiaDate());
  const [fatigue, setFatigue] = useState(2);
  const [safe, setSafe] = useState(true);
  const [missed, setMissed] = useState("");
  const [message, setMessage] = useState("");
  const language = languages.find((l) => l[0] === data.lang) || languages[0];
  const labels = navigation[data.lang] || navigation.en;
  const totals = summarize(data.entries);
  const today = indiaDate();
  function go(next: View) {
    setView(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function start(text = "", value?: SavedCase) {
    setSeed(text);
    setActiveCase(value);
    setCaseKey((k) => k + 1);
    go("assistant");
  }
  function save(value: SavedCase) {
    update((w) => ({
      ...w,
      cases: [value, ...w.cases.filter((v) => v.id !== value.id)],
    }));
  }
  if (!session)
    return (
      <div className="loading-screen">
        <Logo />
        <p>Opening your Saathi…</p>
      </div>
    );
  if (!session.authenticated)
    return <LoginLanding googleConfigured={session.googleConfigured} />;
  return (
    <div className="workspace">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Logo />
        <span className="sidebar-caption">A little support. Every day.</span>
        <nav>
          {views.map((value, i) => {
            const Icon = icons[i];
            return (
              <button
                key={value}
                className={view === value ? "active" : ""}
                onClick={() => go(value)}
              >
                <Icon size={19} />
                {labels[i]}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <label className="check-row">
            <input
              type="checkbox"
              checked={data.lowData}
              onChange={(e) =>
                update((w) => ({ ...w, lowData: e.target.checked }))
              }
            />
            Low-data mode
          </label>
          <p className="small muted">
            Smaller images. Spoken replies on request. Records available
            offline.
          </p>
          <button
            className="text-button"
            onClick={() => void workspace.signOut()}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span className="sync-state">
            {online ? <CheckCircle2 size={15} /> : <WifiOff size={15} />}{" "}
            {workspace.status}
          </span>
          <div className="row">
            <select
              aria-label="Choose language"
              value={data.lang}
              onChange={(e) => update((w) => ({ ...w, lang: e.target.value }))}
            >
              {languages.map((l) => (
                <option key={l[0]} value={l[0]}>
                  {l[2]}
                </option>
              ))}
            </select>
            <span className="avatar">
              {session.user?.displayName?.[0] || "S"}
            </span>
          </div>
        </header>
        <main className="workspace-main">
          {workspace.error && (
            <div className="notice error" role="alert">
              {workspace.error}{" "}
              <button
                className="text-button"
                onClick={() => void workspace.sync()}
              >
                Retry sync
              </button>
            </div>
          )}
          {workspace.conflict && (
            <div className="notice">
              Your account changed elsewhere. Choose the copy to keep.
              <div className="row">
                <button
                  onClick={() => void workspace.resolveConflict("account")}
                >
                  Use account copy
                </button>
                <button
                  onClick={() => void workspace.resolveConflict("device")}
                >
                  Keep this device’s copy
                </button>
              </div>
            </div>
          )}
          {!online && (
            <p className="notice">
              You’re offline. Saved records and downloads work; AI and sharing
              need a connection.
            </p>
          )}
          {view === "overview" && (
            <>
              <div className="page-heading">
                <span className="eyebrow">
                  {language[3]} · {session.user?.displayName}
                </span>
                <h1>Let’s make today a little easier.</h1>
                <p>
                  Your work, your records, and a companion in your language.
                </p>
              </div>
              <section className="dashboard-hero">
                <div>
                  <span className="pill">FROM A QUESTION TO A NEXT STEP</span>
                  <h2>
                    Your voice.
                    <br />A clear way forward.
                  </h2>
                  <p>
                    A missed payment? A confusing document?
                    <br />
                    Tell Saathi. We’ll work through it together.
                  </p>
                  <button className="button primary" onClick={() => start()}>
                    <Mic size={19} />
                    Talk to Saathi
                    <ArrowRight size={18} />
                  </button>
                </div>
                <WorkersArt />
              </section>
              <div className="metric-grid">
                <div className="panel">
                  <span>Total earned</span>
                  <strong>{money(totals.income)}</strong>
                </div>
                <div className="panel">
                  <span>After expenses</span>
                  <strong>{money(totals.net)}</strong>
                </div>
                <div className="panel">
                  <span>Open cases</span>
                  <strong>
                    {data.cases.filter((c) => c.status !== "Resolved").length}
                  </strong>
                </div>
              </div>
              <div className="section-heading">
                <h2>A little help goes a long way.</h2>
              </div>
              <div className="quick-grid">
                {[
                  [
                    "Understand a document",
                    "Read a wage slip, notice or payment screenshot.",
                    "documents",
                  ],
                  [
                    "Find support for you",
                    "Match your details to official welfare schemes.",
                    "schemes",
                  ],
                  [
                    "Keep your earnings clear",
                    "Record income and expenses as you go.",
                    "earnings",
                  ],
                ].map(([title, text, target]) => (
                  <button
                    className="panel quick-card"
                    key={title}
                    onClick={() => go(target as View)}
                  >
                    <span className="icon-tile">
                      <ArrowRight />
                    </span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </button>
                ))}
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">A MOMENT FOR YOU</span>
                    <h2>How was your workday?</h2>
                  </div>
                  <span className="small muted">{today}</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    update((w) => ({
                      ...w,
                      dailyChecks: [
                        {
                          id: today,
                          date: today,
                          earned: summarize(w.entries, today, today).income,
                          expenses: summarize(w.entries, today, today).expenses,
                          fatigue,
                          safe,
                          missedPayment: Number(missed) || 0,
                          note: "",
                        },
                        ...w.dailyChecks.filter((c) => c.date !== today),
                      ],
                    }));
                    setMessage("Today’s check-in saved.");
                  }}
                >
                  <div className="form-grid three">
                    <label>
                      Energy level
                      <select
                        value={fatigue}
                        onChange={(e) => setFatigue(Number(e.target.value))}
                      >
                        <option value={1}>Feeling fresh</option>
                        <option value={2}>Doing okay</option>
                        <option value={3}>A little tired</option>
                        <option value={4}>Very tired</option>
                        <option value={5}>Need a break</option>
                      </select>
                    </label>
                    <label>
                      Any payment still missing? (₹)
                      <input
                        type="number"
                        min="0"
                        max="10000000"
                        value={missed}
                        onChange={(e) => setMissed(e.target.value)}
                        placeholder="0"
                      />
                    </label>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={safe}
                        onChange={(e) => setSafe(e.target.checked)}
                      />
                      I felt safe at work today
                    </label>
                  </div>
                  {fatigue >= 4 && (
                    <p className="notice">
                      Take a break in a safe place before driving or continuing
                      strenuous work.
                    </p>
                  )}
                  {!safe && (
                    <p className="notice">
                      If you’re in immediate danger, call{" "}
                      <a href="tel:112">112</a>. Saathi cannot dispatch help.
                    </p>
                  )}
                  <div className="row wrap">
                    <button className="button primary">
                      Save daily check-in
                    </button>
                    {Number(missed) > 0 && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          start(
                            `My payment of ₹${missed} has not arrived. Help me follow up.`,
                          )
                        }
                      >
                        Get help with this payment
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                  {message && <p role="status">{message}</p>}
                </form>
              </section>
              {data.cases
                .filter(
                  (c) =>
                    c.followUp &&
                    c.followUp <= today &&
                    c.status !== "Resolved",
                )
                .map((c) => (
                  <button
                    className="panel reminder"
                    key={c.id}
                    onClick={() => start("", c)}
                  >
                    Follow-up due: {c.title}
                    <ArrowRight size={18} />
                  </button>
                ))}
            </>
          )}
          {(view === "assistant" || view === "documents") && (
            <>
              <div className="page-heading">
                <span className="eyebrow">YOUR PERSONAL ACTION COMPANION</span>
                <h1>
                  {view === "documents"
                    ? "Paperwork, made simpler."
                    : "One concern. A clear next step."}
                </h1>
                <p>
                  Ask in {language[1]}. Review the facts. Leave with something
                  useful.
                </p>
              </div>
              <CaseAssistant
                key={`${view}-${caseKey}`}
                language={language[1]}
                lowData={data.lowData}
                onSave={save}
                initial={view === "assistant" ? activeCase : undefined}
                seed={seed}
                documentFirst={view === "documents"}
              />
            </>
          )}
          {view === "schemes" && (
            <SchemeMatcher
              language={language[1]}
              state={data.profile.state}
              role={data.profile.role}
            />
          )}
          {view === "earnings" && (
            <>
              <div className="page-heading">
                <span className="eyebrow">EVERY RUPEE, A LITTLE CLEARER</span>
                <h1>Your work. Your records.</h1>
                <p>Saved on your device and synced to your account.</p>
              </div>
              <div className="metric-grid">
                <div className="panel">
                  <span>Income</span>
                  <strong>{money(totals.income)}</strong>
                </div>
                <div className="panel">
                  <span>Expenses</span>
                  <strong>{money(totals.expenses)}</strong>
                </div>
                <div className="panel">
                  <span>Take-home</span>
                  <strong>{money(totals.net)}</strong>
                </div>
              </div>
              <section className="panel">
                <h2>Add a record</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    update((w) => ({
                      ...w,
                      entries: [
                        {
                          id: crypto.randomUUID(),
                          date,
                          kind,
                          amount: Number(amount),
                          note,
                        },
                        ...w.entries,
                      ],
                    }));
                    setAmount("");
                    setNote("");
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Type
                      <select
                        value={kind}
                        onChange={(e) => setKind(e.target.value as typeof kind)}
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </label>
                    <label>
                      Amount (₹)
                      <input
                        required
                        type="number"
                        min="0.01"
                        max="10000000"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </label>
                    <label>
                      Date
                      <input
                        required
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label>
                      Note
                      <input
                        value={note}
                        maxLength={300}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Deliveries, fuel, lunch…"
                      />
                    </label>
                  </div>
                  <button className="button primary">
                    <Plus size={17} />
                    Save entry
                  </button>
                </form>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Your transactions</h2>
                  <button
                    className="text-button"
                    onClick={() =>
                      downloadBlob(
                        "saathi-earnings.csv",
                        new Blob([csvExport(data.entries)], {
                          type: "text/csv;charset=utf-8",
                        }),
                      )
                    }
                  >
                    <Download size={17} />
                    Export CSV
                  </button>
                </div>
                {!data.entries.length && (
                  <p className="empty-state">
                    Your first record starts here. Add today’s income above.
                  </p>
                )}
                {data.entries.map((entry) => (
                  <div className="record" key={entry.id}>
                    <span>
                      <strong>{entry.note || entry.kind}</strong>
                      <small>{entry.date}</small>
                    </span>
                    <strong
                      className={entry.kind === "income" ? "positive-text" : ""}
                    >
                      {entry.kind === "income" ? "+" : "−"}
                      {money(entry.amount)}
                    </strong>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${entry.note || entry.kind}`}
                      onClick={() =>
                        update((w) => ({
                          ...w,
                          entries: w.entries.filter((v) => v.id !== entry.id),
                        }))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}
          {view === "cases" && (
            <>
              <div className="page-heading">
                <span className="eyebrow">YOUR VOICE, ON RECORD</span>
                <h1>Every concern deserves follow-through.</h1>
                <p>Review, download and track the complaints you’ve saved.</p>
              </div>
              <button className="button primary" onClick={() => start()}>
                <Plus size={17} />
                Start a new case
              </button>
              <div className="scheme-grid">
                {data.cases.map((c) => (
                  <article className="panel" key={c.id}>
                    <span className="status-badge">{c.status}</span>
                    <h2>{c.title}</h2>
                    <p>{c.english.slice(0, 150)}…</p>
                    {c.followUp && (
                      <p className="small">Follow-up: {c.followUp}</p>
                    )}
                    <button
                      className="text-button"
                      onClick={() => start("", c)}
                    >
                      Open package
                      <ArrowRight size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete case ${c.title}`}
                      onClick={() =>
                        update((w) => ({
                          ...w,
                          cases: w.cases.filter((v) => v.id !== c.id),
                        }))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
              </div>
              {!data.cases.length && (
                <div className="panel empty-state">
                  <FileText size={32} />
                  <h2>Your next step, saved here.</h2>
                  <p>
                    Ask Saathi for help, create a complaint package, then save
                    it to your workspace.
                  </p>
                </div>
              )}
              {data.drafts.map((d) => (
                <details className="panel" key={d.id}>
                  <summary>{d.title} · Previous draft</summary>
                  <p className="answer-text">{d.text}</p>
                </details>
              ))}
            </>
          )}
          {view === "safety" && (
            <>
              <div className="page-heading">
                <span className="eyebrow">
                  YOU MATTER MORE THAN THE NEXT TASK
                </span>
                <h1>A safer, steadier workday.</h1>
                <p>Practical reminders you can keep with you, even offline.</p>
              </div>
              <div className="panel emergency">
                <h2>In immediate danger?</h2>
                <p>
                  Move to a safer place if you can. Call India’s emergency
                  response number. This app cannot contact emergency services
                  for you.
                </p>
                <a className="button primary" href="tel:112">
                  Call 112
                </a>
                <a
                  className="text-button"
                  href="https://112.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Official emergency information ↗
                </a>
              </div>
              <div className="panel">
                <h2>Before your next shift</h2>
                {[
                  "Check your phone battery and emergency contacts",
                  "Inspect your vehicle and use protective equipment",
                  "Carry drinking water and plan rest breaks",
                  "Tell someone you trust where you are working",
                  "Save payment and shift records",
                ].map((item) => (
                  <label className="check-row" key={item}>
                    <input
                      type="checkbox"
                      checked={data.checks.includes(item)}
                      onChange={() =>
                        update((w) => ({
                          ...w,
                          checks: w.checks.includes(item)
                            ? w.checks.filter((v) => v !== item)
                            : [...w.checks, item],
                        }))
                      }
                    />
                    {item}
                  </label>
                ))}
              </div>
            </>
          )}
          <footer className="workspace-footer">
            Made for your everyday work. · AI guidance can be mistaken. Review
            important facts and official sources.
          </footer>
        </main>
      </div>
    </div>
  );
}
