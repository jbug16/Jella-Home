import { subscriptionMonthlyEquivalentCents } from "@/lib/import/workbook/extract";
import type {
  ExtractSummary,
  ParsedWorkbook,
  WorkbookExtract,
} from "@/lib/import/workbook/types";

const STATIC_ASSUMPTIONS = [
  "One-time extraction only — no Supabase writes until manually approved.",
  "Recipe-only ingredients not listed on Setup are included in ingredients.json using the unit from the recipe line.",
  "Subscriptions have renewal_on null because the workbook stores no renewal dates.",
  "billing_day defaults to 1 when the workbook leaves it blank.",
  "Budget limits come from Monthly Budget line trackers for the month shown in D9/D10 only (not a full history).",
  "Log transactions require date, kind, subcategory, and positive amount on the same row.",
  "Shopping-list and meal-plan sheets are out of scope for this migration.",
] as const;

function duplicateResolutionsFromWarnings(warnings: string[]): string[] {
  return warnings.filter((w) => /duplicate/i.test(w));
}

function skippedRecords(
  parsed: ParsedWorkbook,
): ExtractSummary["skipped_records"] {
  const skipped: ExtractSummary["skipped_records"] = [];

  for (const row of parsed.skippedRecipes) {
    skipped.push({
      domain: "recipe",
      label: row.name,
      reason: row.reason,
    });
  }

  return skipped;
}

export function buildExtractSummary(input: {
  parsed: ParsedWorkbook;
  extract: WorkbookExtract;
  outputDirectory: string;
  validationWarnings: string[];
}): ExtractSummary {
  const { parsed, extract, outputDirectory, validationWarnings } = input;
  const warnings = [...validationWarnings];

  return {
    generated_at: new Date().toISOString(),
    workbook_path: parsed.workbookPath,
    output_directory: outputDirectory,
    counts: {
      ingredients: extract.ingredients.length,
      recipes: extract.recipes.length,
      recipe_ingredients: extract.recipe_ingredients.length,
      subscriptions: extract.subscriptions.length,
      budget_categories: extract.budget_categories.length,
      budget_limits: extract.budget_limits.length,
      transactions: extract.transactions.length,
      subscription_monthly_equivalent_cents: subscriptionMonthlyEquivalentCents(
        extract.subscriptions,
      ),
    },
    skipped_records: skippedRecords(parsed),
    duplicate_resolutions: duplicateResolutionsFromWarnings(warnings),
    warnings,
    assumptions: [...STATIC_ASSUMPTIONS],
    subscriptions_missing_renewal_dates: extract.subscriptions.map(
      (sub) => sub.vendor,
    ),
    recipes_skipped_no_ingredients: parsed.skippedRecipes.map((row) => ({
      name: row.name,
      reason: row.reason,
    })),
  };
}

export function formatExtractSummaryText(summary: ExtractSummary): string {
  const lines: string[] = [
    "Workbook extraction summary",
    "===========================",
    "",
    `Generated: ${summary.generated_at}`,
    `Workbook: ${summary.workbook_path}`,
    `Output: ${summary.output_directory}`,
    "",
    "Record counts",
    "-------------",
    `  ingredients: ${summary.counts.ingredients}`,
    `  recipes: ${summary.counts.recipes}`,
    `  recipe_ingredients: ${summary.counts.recipe_ingredients}`,
    `  subscriptions: ${summary.counts.subscriptions}`,
    `  budget_categories: ${summary.counts.budget_categories}`,
    `  budget_limits: ${summary.counts.budget_limits}`,
    `  transactions: ${summary.counts.transactions}`,
    `  subscription monthly equivalent (cents): ${summary.counts.subscription_monthly_equivalent_cents}`,
    "",
  ];

  if (summary.recipes_skipped_no_ingredients.length > 0) {
    lines.push("Recipes skipped (no ingredients)");
    lines.push("------------------------------");
    for (const row of summary.recipes_skipped_no_ingredients) {
      lines.push(`  - ${row.name}: ${row.reason}`);
    }
    lines.push("");
  }

  if (summary.subscriptions_missing_renewal_dates.length > 0) {
    lines.push("Subscriptions missing renewal dates");
    lines.push("-----------------------------------");
    for (const vendor of summary.subscriptions_missing_renewal_dates) {
      lines.push(`  - ${vendor}`);
    }
    lines.push("");
  }

  if (summary.skipped_records.length > 0) {
    lines.push("Skipped records");
    lines.push("---------------");
    for (const row of summary.skipped_records) {
      lines.push(`  - [${row.domain}] ${row.label}: ${row.reason}`);
    }
    lines.push("");
  }

  if (summary.duplicate_resolutions.length > 0) {
    lines.push("Duplicate resolutions");
    lines.push("---------------------");
    for (const message of summary.duplicate_resolutions) {
      lines.push(`  - ${message}`);
    }
    lines.push("");
  }

  if (summary.warnings.length > 0) {
    lines.push("Warnings");
    lines.push("--------");
    for (const message of summary.warnings) {
      lines.push(`  - ${message}`);
    }
    lines.push("");
  }

  lines.push("Assumptions");
  lines.push("-----------");
  for (const assumption of summary.assumptions) {
    lines.push(`  - ${assumption}`);
  }

  return lines.join("\n");
}

export async function writeExtractOutput(input: {
  outputDirectory: string;
  extract: WorkbookExtract;
  summary: ExtractSummary;
}): Promise<{
  jsonFiles: string[];
  summaryJsonPath: string;
  summaryTextPath: string;
}> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  await mkdir(input.outputDirectory, { recursive: true });

  const files: Array<{ name: string; data: unknown }> = [
    { name: "ingredients.json", data: input.extract.ingredients },
    { name: "recipes.json", data: input.extract.recipes },
    {
      name: "recipe_ingredients.json",
      data: input.extract.recipe_ingredients,
    },
    { name: "subscriptions.json", data: input.extract.subscriptions },
    { name: "budget_categories.json", data: input.extract.budget_categories },
    { name: "budget_limits.json", data: input.extract.budget_limits },
    { name: "transactions.json", data: input.extract.transactions },
    { name: "summary.json", data: input.summary },
  ];

  const jsonFiles: string[] = [];
  for (const file of files) {
    const path = join(input.outputDirectory, file.name);
    await writeFile(path, `${JSON.stringify(file.data, null, 2)}\n`, "utf8");
    jsonFiles.push(path);
  }

  const summaryTextPath = join(input.outputDirectory, "summary.txt");
  await writeFile(
    summaryTextPath,
    `${formatExtractSummaryText(input.summary)}\n`,
    "utf8",
  );

  const summaryJsonPath = join(input.outputDirectory, "summary.json");

  return { jsonFiles, summaryJsonPath, summaryTextPath };
}
