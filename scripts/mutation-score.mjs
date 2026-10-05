// Reads a Stryker JSON report and prints its mutation score as a Markdown table
// (P6.5): one row per file, lowest first, then the total. Used in the mutation
// workflow's job summary so a pull request shows its score without opening an
// artifact. Stryker's own formula:
//   (killed + timed out) / (all - ignored - compile errors - runtime errors)
// Usage: node scripts/mutation-score.mjs <report.json> [title]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function scoreOf(mutants) {
  const count = (status) => mutants.filter((m) => m.status === status).length;
  const detected = count("Killed") + count("Timeout");
  const valid = mutants.length - count("Ignored") - count("CompileError") - count("RuntimeError");
  return { detected, valid, survived: count("Survived"), noCoverage: count("NoCoverage"), score: valid ? (detected / valid) * 100 : 100 };
}

export function markdown(report, title) {
  const rows = Object.entries(report.files).map(([file, { mutants }]) => ({ file, ...scoreOf(mutants) }));
  const total = scoreOf(Object.values(report.files).flatMap((f) => f.mutants));
  const line = (r, name) => `| ${name} | ${r.score.toFixed(2)} % | ${r.detected} / ${r.valid} | ${r.survived} | ${r.noCoverage} |`;
  return [
    `### ${title}`,
    "",
    "| File | Score | Caught | Survived | No test reached |",
    "|---|---|---|---|---|",
    ...rows.sort((a, b) => a.score - b.score).map((r) => line(r, `\`${r.file}\``)),
    line(total, "**All**"),
    ""
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , path, title = "Mutation score"] = process.argv;
  process.stdout.write(markdown(JSON.parse(readFileSync(path, "utf8")), title));
}
