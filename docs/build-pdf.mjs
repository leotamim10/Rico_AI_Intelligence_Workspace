// Product doc → PDF. Renders the Markdown to a styled, print-friendly
// HTML page and prints it with headless Chrome.
//   node docs/build-pdf.mjs
// Requires: `marked` (via npx), google-chrome on PATH.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { marked } from "marked";

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(here, "Xai-Product-Doc.md"), "utf8");
const body = marked.parse(md, { mangle: false, headerIds: true });

// Print-friendly: light page, brand accent on structure. Xai is dark-UI,
// but a document PDF reads more professionally on paper as light stock.
const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm 18mm; }
  :root { --accent:#2f6fd6; --ink:#16181a; --muted:#5a6169; --rule:#e2e5e8; }
  * { box-sizing: border-box; }
  body {
    font: 10.5pt/1.55 -apple-system, "Segoe UI", Inter, system-ui, sans-serif;
    color: var(--ink); max-width: 720px; margin: 0 auto; padding: 8px 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 22pt; letter-spacing: -0.02em; margin: 0 0 2px; }
  h2 { font-size: 14pt; letter-spacing: -0.01em; margin: 26px 0 8px;
       padding-bottom: 5px; border-bottom: 1px solid var(--rule); }
  h3 { font-size: 11pt; color: var(--muted); font-weight: 600;
       margin: 0 0 18px; text-transform: none; }
  h2 + p, h2 + table { margin-top: 8px; }
  p, li { color: #23272b; }
  a { color: var(--accent); text-decoration: none; }
  strong { color: var(--ink); font-weight: 600; }
  code { font: 9pt "SF Mono", "Geist Mono", ui-monospace, monospace;
         background: #f3f5f7; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f7f9fa; border: 1px solid var(--rule); border-radius: 6px;
        padding: 12px 14px; overflow-x: auto; }
  pre code { background: none; padding: 0; font-size: 8.5pt; line-height: 1.5; }
  hr { border: none; border-top: 1px solid var(--rule); margin: 22px 0; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; }
  th, td { text-align: left; padding: 6px 10px; border: 1px solid var(--rule);
           vertical-align: top; }
  th { background: #f3f5f7; font-weight: 600; }
  h2, h3 { break-after: avoid; }
  table, pre { break-inside: avoid; }
  blockquote { margin: 12px 0; padding: 8px 16px; border-left: 3px solid var(--accent);
    background: #f7f9fa; color: var(--muted); font-style: normal; }
</style></head><body>${body}</body></html>`;

const htmlPath = join(here, "Xai-Product-Doc.print.html");
const pdfPath = join(here, "Xai-Product-Doc.pdf");
writeFileSync(htmlPath, html);
execSync(
  `google-chrome --headless=new --no-sandbox --disable-gpu ` +
    `--print-to-pdf="${pdfPath}" --no-pdf-header-footer "file://${htmlPath}"`,
  { stdio: "inherit" },
);
console.log("PDF written:", pdfPath);
