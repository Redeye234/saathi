import { PDFDocument } from "pdf-lib";
import type { ComplaintPackage } from "./types";
import { sources } from "./knowledge.mjs";
import { downloadBlob } from "./api-client";

export function packageText(value: ComplaintPackage, language: string) {
  return `${value.title}\n\nENGLISH\n${value.english}\n\nहिन्दी\n${value.hindi}${value.local ? `\n\n${language}\n${value.local}` : ""}\n\nEVIDENCE TO COLLECT\n${value.evidence.map((s) => `• ${s}`).join("\n")}\n\nNEXT STEPS\n${value.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nREVIEW BEFORE SENDING\n${value.uncertainties.join("\n")}\nThis is an editable AI-assisted draft. Nothing has been submitted.\n\nOFFICIAL REFERENCES\n${sources
    .filter((s) => value.officialLinks.includes(s.id))
    .map((s) => `${s.title}: ${s.url} (reviewed ${s.reviewed})`)
    .join("\n")}`;
}

// Canvas uses the browser's text shaping engine for Indic scripts. An attached
// UTF-8 copy preserves selectable text alongside the visually faithful pages.
export async function exportPackage(value: ComplaintPackage, language: string) {
  await document.fonts.ready;
  const pdf = await PDFDocument.create();
  pdf.setTitle(value.title);
  pdf.setAuthor("Saathi");
  const text = packageText(value, language);
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext("2d")!;
  if (!context)
    throw new Error(
      "PDF rendering is unavailable. Download the text copy instead.",
    );
  const width = 1080,
    lineHeight = 42;
  let y = 115,
    pageNumber = 1;
  const init = () => {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 1240, 1754);
    context.fillStyle = "#385b4b";
    context.font = "bold 24px sans-serif";
    context.fillText("saathi.  /  Your grievance package", 80, 55);
    context.fillStyle = "#172e25";
    context.font = "26px sans-serif";
    y = 115;
  };
  async function flush() {
    context.save();
    context.font = "18px sans-serif";
    context.fillStyle = "#586b62";
    context.fillText(`Review before sharing · Page ${pageNumber++}`, 80, 1700);
    context.restore();
    const jpg = await pdf.embedJpg(canvas.toDataURL("image/jpeg", 0.92));
    pdf
      .addPage([595.28, 841.89])
      .drawImage(jpg, { x: 0, y: 0, width: 595.28, height: 841.89 });
    init();
  }
  init();
  for (const paragraph of text.split("\n")) {
    const rtl = /[\u0600-\u06ff]/u.test(paragraph);
    context.direction = rtl ? "rtl" : "ltr";
    context.textAlign = rtl ? "right" : "left";
    const words = paragraph.split(/\s+/u);
    let line = "";
    const draw = async (value: string) => {
      if (y > 1635) await flush();
      context.direction = rtl ? "rtl" : "ltr";
      context.textAlign = rtl ? "right" : "left";
      context.fillText(value, rtl ? 1160 : 80, y);
      y += lineHeight;
    };
    for (const word of words) {
      if (context.measureText(`${line} ${word}`).width > width && line) {
        await draw(line);
        line = "";
      }
      if (context.measureText(word).width > width) {
        for (const char of Array.from(word)) {
          if (context.measureText(line + char).width > width) {
            await draw(line);
            line = "";
          }
          line += char;
        }
      } else line += (line ? " " : "") + word;
    }
    await draw(line);
    y += 8;
  }
  await flush();
  await pdf.attach(new TextEncoder().encode(text), "complaint.txt", {
    mimeType: "text/plain",
    description: "Accessible UTF-8 text copy of the grievance",
  });
  const bytes = await pdf.save();
  downloadBlob(
    "saathi-grievance.pdf",
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
  );
}
