import { createRequire } from "node:module";
import { existsSync } from "node:fs";
const require = createRequire(import.meta.url);
const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";       // Cyrillic-capable
const FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

/** Render a clean A4 PDF (title + body) as a Buffer. Falls back to Helvetica if DejaVu is absent. */
export async function makePdf(title: string, body: string): Promise<Buffer> {
  const PDFDocument = require("pdfkit");
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: title } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const ttf = existsSync(FONT);
    if (ttf) { doc.registerFont("b", FONT); if (existsSync(FONT_B)) doc.registerFont("bb", FONT_B); }
    const F = ttf ? "b" : "Helvetica";
    const FB = ttf && existsSync(FONT_B) ? "bb" : (ttf ? "b" : "Helvetica-Bold");
    doc.font(FB).fontSize(22).fillColor("#5b4bff").text(title, { align: "center" });
    doc.moveDown(1);
    doc.font(F).fontSize(12).fillColor("#222222").text(body, { align: "left", lineGap: 5 });
    doc.moveDown(2);
    doc.font(F).fontSize(9).fillColor("#999999").text("AIfa Creativity  ·  CODE Eternal", { align: "center" });
    doc.end();
  });
}
