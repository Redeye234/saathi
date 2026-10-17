"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cleanWorkspace } from "./contracts.mjs";
import type { User, Workspace } from "./types";
import { apiFetch } from "./api-url";

type Snapshot = { data: Workspace; revision: string | null; dirty: boolean };
type Session = {
  authenticated: boolean;
  user: User | null;
  googleConfigured: boolean;
};
const LAST = "saathi-last-user-v2";
const key = (id: string) => `saathi-workspace-v2:${id}`;
const empty = () => cleanWorkspace({}) as Workspace;
export function useWorkspace() {
  const [data, setData] = useState<Workspace>(empty);
  const [session, setSession] = useState<Session | null>(null);
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState("Loading your workspace…");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const state = useRef<{
    user: User | null;
    snapshot: Snapshot;
    ready: boolean;
  }>({
    user: null,
    snapshot: { data: empty(), revision: null, dirty: false },
    ready: false,
  });
  const saving = useRef(false);
  const mounted = useRef(true);
  const persist = useCallback(() => {
    const current = state.current;
    if (!current.user) return;
    try {
      localStorage.setItem(
        key(current.user.userId),
        JSON.stringify(current.snapshot),
      );
      localStorage.setItem(LAST, JSON.stringify(current.user));
    } catch {
      setError(
        "This browser could not save your records. Download important work before closing.",
      );
    }
  }, []);
  const sync = useCallback(async () => {
    const current = state.current;
    if (!current.ready || !current.user || saving.current || !navigator.onLine)
      return;
    saving.current = true;
    try {
      while (state.current.snapshot.dirty && navigator.onLine) {
        const sent = state.current.snapshot;
        setStatus("Saving to your account…");
        const response = await apiFetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: sent.data, revision: sent.revision }),
        });
        const result = (await response.json()) as {
          error?: string;
          syncedAt: string;
        };
        if (response.status === 409) {
          setConflict(true);
          setStatus("Choose a copy to sync");
          break;
        }
        if (!response.ok)
          throw new Error(result.error || "Could not save to your account.");
        state.current.snapshot = {
          ...state.current.snapshot,
          revision: result.syncedAt,
          dirty: state.current.snapshot !== sent,
        };
        persist();
        setError("");
        setStatus("Saved to your account");
      }
    } catch (e) {
      setStatus("Saved on this device");
      setError(e instanceof Error ? e.message : "Sync unavailable.");
    } finally {
      saving.current = false;
    }
  }, [persist]);
  useEffect(() => {
    mounted.current = true;
    async function open() {
      let cachedUser: User | null = null;
      try {
        cachedUser = JSON.parse(localStorage.getItem(LAST) || "null");
      } catch {}
      let result: Session;
      try {
        const response = await apiFetch("/api/session", { cache: "no-store" });
        if (!response.ok) throw new Error();
        result = await response.json();
      } catch {
        result = {
          authenticated: Boolean(cachedUser),
          user: cachedUser,
          googleConfigured: false,
        };
      }
      if (!mounted.current) return;
      setSession(result);
      setOnline(navigator.onLine);
      if (!result.authenticated || !result.user) {
        setStatus("");
        return;
      }
      const current = state.current;
      current.user = result.user;
      try {
        const raw = localStorage.getItem(key(result.user.userId));
        if (raw) {
          const parsed = JSON.parse(raw);
          current.snapshot = {
            data: cleanWorkspace(parsed.data),
            revision: parsed.revision ?? null,
            dirty: Boolean(parsed.dirty),
          };
        }
      } catch {
        setError("A saved device copy could not be read.");
      }
      try {
        const response = await apiFetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const cloud = (await response.json()) as {
          data: Workspace;
          syncedAt: string | null;
        };
        if (!current.snapshot.dirty)
          current.snapshot = {
            data: cleanWorkspace(cloud.data),
            revision: cloud.syncedAt,
            dirty: false,
          };
        else if (current.snapshot.revision !== cloud.syncedAt)
          setConflict(true);
        setStatus(
          current.snapshot.dirty
            ? "Changes waiting to sync"
            : "Saved to your account",
        );
      } catch {
        setStatus("Saved on this device");
      }
      if (!mounted.current) return;
      current.ready = true;
      setData(current.snapshot.data);
      persist();
      // Offline edits carry their original revision; the server rejects conflicting writes.
      void sync();
    }
    void open();
    const on = () => {
        setOnline(true);
        void sync();
      },
      off = () => {
        setOnline(false);
        setStatus("Offline · saved on this device");
      };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [persist, sync]);
  const update = useCallback(
    (change: (previous: Workspace) => Workspace) => {
      if (!state.current.ready) return;
      try {
        const next = cleanWorkspace(change(state.current.snapshot.data));
        state.current.snapshot = {
          ...state.current.snapshot,
          data: next,
          dirty: true,
        };
        setData(next);
        persist();
        setStatus(
          navigator.onLine
            ? "Changes waiting to sync"
            : "Offline · saved on this device",
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid record.");
      }
    },
    [persist],
  );
  useEffect(() => {
    if (conflict) return;
    const timer = setTimeout(() => void sync(), 600);
    return () => clearTimeout(timer);
  }, [data, conflict, sync]);
  async function resolveConflict(choice: "device" | "account") {
    try {
      const response = await apiFetch("/api/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error("Reconnect to resolve this.");
      const cloud = (await response.json()) as {
        data: Workspace;
        syncedAt: string | null;
      };
      state.current.snapshot = {
        data:
          choice === "account"
            ? cleanWorkspace(cloud.data)
            : state.current.snapshot.data,
        revision: cloud.syncedAt,
        dirty: choice === "device",
      };
      setData(state.current.snapshot.data);
      persist();
      setConflict(false);
      setStatus("Saved to your account");
      if (choice === "device") void sync();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    }
  }
  async function signOut() {
    if (state.current.snapshot.dirty) {
      setError("Sync your changes before signing out, so they are not lost.");
      return;
    }
    try {
      const response = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
    } catch {
      setError("Reconnect before signing out.");
      return;
    }
    if (state.current.user)
      localStorage.removeItem(key(state.current.user.userId));
    localStorage.removeItem(LAST);
    localStorage.removeItem("saathi-v1");
    window.location.reload();
  }
  return {
    data,
    update,
    session,
    online,
    status,
    error,
    conflict,
    resolveConflict,
    sync,
    signOut,
  };
}
