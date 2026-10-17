import { z } from "zod/v4";

const short = z.string().max(500);
const list = z.array(short).max(8);
export const planSchema = z.object({
  title: z.string().max(100),
  summary: z.string().max(1500),
  urgency: z.enum(["low", "medium", "high"]),
  nextQuestion: z.string().max(300),
  nextSteps: list,
  evidence: list,
  uncertainties: list,
  officialLinks: z.array(z.string().max(80)).max(6),
});
export const packageSchema = z.object({
  title: z.string().max(100),
  hindi: z.string().max(6000),
  english: z.string().max(6000),
  local: z.string().max(6000),
  evidence: list,
  nextSteps: list,
  uncertainties: list,
  officialLinks: z.array(z.string().max(80)).max(6),
});
export const jsonFormat = (schema, name) => ({
  type: "json_schema",
  name,
  strict: true,
  schema: z.toJSONSchema(schema, { target: "draft-7" }),
});

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const amount = z.number().finite().min(0).max(10000000);
const entry = z.object({
  id: short,
  date,
  kind: z.enum(["income", "expense"]),
  amount,
  note: z.string().max(300),
});
const draft = z.object({
  id: short,
  title: short,
  text: z.string().max(20000),
  status: z.enum(["Draft", "Sent", "Resolved"]),
  date,
});
const casePackage = packageSchema.extend({
  id: short,
  date,
  language: short,
  status: z.enum(["Draft", "Sent", "Resolved"]),
  checkedEvidence: z.array(z.string().max(500)).max(20),
  followUp: date.or(z.literal("")),
});
const daily = z.object({
  id: short,
  date,
  earned: amount,
  expenses: amount,
  fatigue: z.number().int().min(1).max(5),
  safe: z.boolean(),
  missedPayment: amount,
  note: z.string().max(600),
});
export const workspaceSchema = z.object({
  entries: z.array(entry).max(1000).default([]),
  drafts: z.array(draft).max(100).default([]),
  checks: z.array(short).max(20).default([]),
  evidenceChecks: z.array(short).max(20).default([]),
  profile: z
    .object({
      name: z.string().max(60),
      role: z.string().max(80),
      state: z.string().max(80),
    })
    .default({ name: "", role: "Delivery partner", state: "" }),
  lang: z.string().max(12).default("en"),
  customLang: z.string().max(80).default(""),
  cases: z.array(casePackage).max(50).default([]),
  dailyChecks: z.array(daily).max(366).default([]),
  lowData: z.boolean().default(false),
});

export function cleanWorkspace(input) {
  const result = workspaceSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      "Workspace data is invalid. Check record dates and amounts.",
    );
  if (/data:(?:image|audio)\//i.test(JSON.stringify(result.data)))
    throw new Error("Uploaded media cannot be saved to the workspace.");
  return result.data;
}
