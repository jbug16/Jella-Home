#!/usr/bin/env tsx
/**
 * One-time legacy workbook extraction utility.
 * Parses the XLSX workbook and writes normalized JSON files for manual review.
 * Does not connect to Supabase.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildExtractSummary,
  buildWorkbookExtract,
  formatExtractSummaryText,
  normalizeWorkbook,
  parseWorkbook,
  validateWorkbook,
  writeExtractOutput,
} from "../lib/import/workbook";

const DEFAULT_OUTPUT_DIR = resolve(process.cwd(), "private-data/extract");

function printUsage(): void {
  console.log(`Usage: npm run extract:workbook -- [options]

Options:
  --workbook <path>   XLSX path (default: private-data/workbook.xlsx)
  --output <path>     Output directory (default: private-data/extract)
  --help              Show this help

Writes ingredients.json, recipes.json, recipe_ingredients.json,
subscriptions.json, budget_categories.json, budget_limits.json,
transactions.json, summary.json, and summary.txt.
No database writes are performed.
`);
}

function parseArgs(argv: string[]): {
  workbookPath: string;
  outputDir: string;
} {
  let workbookPath = resolve(process.cwd(), "private-data/workbook.xlsx");
  let outputDir = DEFAULT_OUTPUT_DIR;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      case "--workbook":
        workbookPath = resolve(process.cwd(), argv[++i] ?? "");
        break;
      case "--output":
        outputDir = resolve(process.cwd(), argv[++i] ?? DEFAULT_OUTPUT_DIR);
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  if (!existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  return { workbookPath, outputDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`Workbook: ${args.workbookPath}`);
  console.log(`Output: ${args.outputDir}`);
  console.log("");

  console.log("Phase 1/4: parse");
  const parsed = await parseWorkbook(args.workbookPath);

  console.log("Phase 2/4: normalize");
  const normalized = normalizeWorkbook(parsed);

  console.log("Phase 3/4: validate");
  const validation = validateWorkbook(normalized);
  if (!validation.ok) {
    console.error("Validation failed:");
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log("Phase 4/4: extract");
  const extract = buildWorkbookExtract(normalized);
  const summary = buildExtractSummary({
    parsed: normalized,
    extract,
    outputDirectory: args.outputDir,
    validationWarnings: validation.warnings,
  });

  const paths = await writeExtractOutput({
    outputDirectory: args.outputDir,
    extract,
    summary,
  });

  console.log("");
  console.log(formatExtractSummaryText(summary));
  console.log("");
  console.log("Extracted files:");
  for (const file of paths.jsonFiles) {
    console.log(`  ${file}`);
  }
  console.log(`  ${paths.summaryTextPath}`);
  console.log("");
  console.log(
    "Extraction complete — review the files before loading into Supabase.",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
