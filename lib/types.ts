import { z } from "zod/v4";
import { planSchema, packageSchema, workspaceSchema } from "./contracts.mjs";
export type Plan = z.infer<typeof planSchema>;
export type ComplaintPackage = z.infer<typeof packageSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type SavedCase = Workspace["cases"][number];
export type DailyCheck = Workspace["dailyChecks"][number];
export type User = { userId: string; email: string; displayName: string };
export type Source = {
  id: string;
  title: string;
  url: string;
  reviewed: string;
};
export type ConversationTurn = { role: "user" | "assistant"; content: string };
