import ExcelJS from "exceljs";
import { z } from "zod";

import type { SubscriptionCadence } from "@/lib/domain/subscription";
import {
  PLACEHOLDER_RECIPE,
  PLACEHOLDER_TITLE,
  RECIPE_BAND_START_ROWS,
  RECIPE_BLOCK_COLUMNS,
  RECIPE_BLOCK_OFFSET,
  SETUP_INGREDIENT_END_ROW,
  SETUP_INGREDIENT_START_ROW,
  SUBSCRIPTION_DATA_START_ROW,
  WORKBOOK_CADENCE_TO_DOMAIN,
} from "@/lib/import/workbook/constants";
import type {
  ParsedIngredientCatalogRow,
  ParsedRecipe,
  ParsedRecipeIngredientLine,
  ParsedSubscription,
  ParsedWorkbook,
} from "@/lib/import/workbook/types";
import { parseBudgetSheets } from "@/lib/import/workbook/parse-budget";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object" && "text" in value) {
    return String(value.text ?? "").trim();
  }
  if (typeof value === "object" && "result" in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  const text = cellText(value);
  if (!text) {
    return null;
  }
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function columnLetter(col: number): string {
  let letter = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function isFormulaCell(cell: ExcelJS.Cell): boolean {
  return cell.type === ExcelJS.ValueType.Formula;
}

function parseSetupIngredients(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
): ParsedIngredientCatalogRow[] {
  const rows: ParsedIngredientCatalogRow[] = [];
  for (
    let row = SETUP_INGREDIENT_START_ROW;
    row <= SETUP_INGREDIENT_END_ROW;
    row++
  ) {
    const name = cellText(sheet.getCell(row, 6).value);
    if (!name) {
      continue;
    }
    rows.push({
      row,
      name,
      storeSection: cellText(sheet.getCell(row, 7).value),
      defaultUnit: cellText(sheet.getCell(row, 12).value),
    });
  }
  if (rows.length === 0) {
    warnings.push(
      "Setup sheet: no ingredient catalog rows found in F10:F1002.",
    );
  }
  return rows;
}

function isPlaceholderRecipeName(name: string): boolean {
  return PLACEHOLDER_RECIPE.test(name) || PLACEHOLDER_TITLE.test(name);
}

function parseRecipeBlock(
  sheet: ExcelJS.Worksheet,
  nameRow: number,
  nameCol: number,
  warnings: string[],
  skippedRecipes: ParsedWorkbook["skippedRecipes"],
): ParsedRecipe | null {
  const name = cellText(sheet.getCell(nameRow, nameCol).value);
  if (!name || isPlaceholderRecipeName(name)) {
    return null;
  }

  const prepLabel = cellText(
    sheet.getCell(nameRow + RECIPE_BLOCK_OFFSET.prepTimeLabel, nameCol).value,
  );
  if (prepLabel !== "Prep Time (min)") {
    return null;
  }

  const valueCol = nameCol + RECIPE_BLOCK_OFFSET.metadataValueColOffset;
  const prep = cellNumber(
    sheet.getCell(nameRow + RECIPE_BLOCK_OFFSET.prepTimeLabel, valueCol).value,
  );
  const servingsRaw = cellNumber(
    sheet.getCell(nameRow + RECIPE_BLOCK_OFFSET.servingsLabel, valueCol).value,
  );
  const cook = cellNumber(
    sheet.getCell(nameRow + RECIPE_BLOCK_OFFSET.cookTimeLabel, valueCol).value,
  );

  let sourceUrl = cellText(
    sheet.getCell(nameRow + RECIPE_BLOCK_OFFSET.sourceUrl, nameCol).value,
  );
  if (sourceUrl && !sourceUrl.startsWith("http")) {
    sourceUrl = "";
  }

  const ingredients: ParsedRecipeIngredientLine[] = [];
  for (
    let row = nameRow + RECIPE_BLOCK_OFFSET.ingredientStart;
    row <= nameRow + RECIPE_BLOCK_OFFSET.ingredientEnd;
    row++
  ) {
    const ingName = cellText(sheet.getCell(row, nameCol).value);
    if (!ingName || ingName === "Ingredient" || ingName === "Total") {
      if (ingName === "Total") {
        break;
      }
      continue;
    }
    const qty = cellNumber(sheet.getCell(row, nameCol + 2).value);
    const unit = cellText(sheet.getCell(row, nameCol + 3).value);
    const section = cellText(sheet.getCell(row, nameCol + 1).value);
    ingredients.push({
      name: ingName,
      quantity: qty,
      unit,
      sortOrder: ingredients.length,
      storeSection: section,
    });
  }

  const source = `Recipe Management ${columnLetter(nameCol)}${nameRow}`;

  if (ingredients.length === 0) {
    warnings.push(`${source} (${name}): no ingredient lines — skipped.`);
    skippedRecipes.push({
      name,
      reason: "no ingredient lines",
      source,
    });
    return null;
  }

  const notesRow = nameRow + RECIPE_BLOCK_OFFSET.notesLabel;
  const notesLabel = cellText(sheet.getCell(notesRow, nameCol).value);
  let instructions = "";
  if (notesLabel === "Notes") {
    instructions = cellText(sheet.getCell(notesRow + 1, nameCol).value);
  }

  return {
    sheetRow: nameRow,
    column: columnLetter(nameCol),
    name,
    servings: servingsRaw && servingsRaw > 0 ? servingsRaw : 2,
    prepTimeMinutes: prep !== null && prep >= 0 ? Math.round(prep) : null,
    cookTimeMinutes: cook !== null && cook >= 0 ? Math.round(cook) : null,
    sourceUrl: sourceUrl || null,
    instructions,
    notes: "",
    ingredients,
  };
}

function parseRecipes(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
  skippedRecipes: ParsedWorkbook["skippedRecipes"],
): ParsedRecipe[] {
  const recipes: ParsedRecipe[] = [];
  for (const bandRow of RECIPE_BAND_START_ROWS) {
    for (const col of RECIPE_BLOCK_COLUMNS) {
      const recipe = parseRecipeBlock(
        sheet,
        bandRow,
        col,
        warnings,
        skippedRecipes,
      );
      if (recipe) {
        recipes.push(recipe);
      }
    }
  }
  return recipes;
}

const cadenceSchema = z.enum([
  "weekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "yearly",
]);

function parseCadence(raw: string): SubscriptionCadence | null {
  const key = raw.trim().toLowerCase();
  const mapped = WORKBOOK_CADENCE_TO_DOMAIN[key];
  if (!mapped) {
    return null;
  }
  const parsed = cadenceSchema.safeParse(mapped);
  return parsed.success ? parsed.data : null;
}

function parseSubscriptions(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
): ParsedSubscription[] {
  const rows: ParsedSubscription[] = [];
  const maxRow = sheet.rowCount;
  for (let row = SUBSCRIPTION_DATA_START_ROW; row <= maxRow; row++) {
    const vendor = cellText(sheet.getCell(row, 6).value);
    if (
      !vendor ||
      vendor.includes("SUBSCRIPTION") ||
      vendor.includes("TRACKER")
    ) {
      continue;
    }
    const cadenceRaw = cellText(sheet.getCell(row, 8).value);
    const cadence = parseCadence(cadenceRaw);
    const amount = cellNumber(sheet.getCell(row, 12).value);
    if (!cadence || amount === null) {
      warnings.push(
        `Subscription Tracker row ${row}: missing cadence or amount — skipped.`,
      );
      continue;
    }
    const autoRenewRaw = sheet.getCell(row, 9).value;
    let autoRenew: boolean | null = null;
    if (typeof autoRenewRaw === "boolean") {
      autoRenew = autoRenewRaw;
    } else if (autoRenewRaw === "TRUE" || autoRenewRaw === 1) {
      autoRenew = true;
    } else if (autoRenewRaw === "FALSE" || autoRenewRaw === 0) {
      autoRenew = false;
    }

    const billingDay = cellNumber(sheet.getCell(row, 10).value);

    rows.push({
      row,
      vendor,
      categoryLabel: cellText(sheet.getCell(row, 7).value),
      cadence,
      amountCents: Math.round(amount * 100),
      autoRenew,
      billingDay:
        billingDay !== null && billingDay >= 1 && billingDay <= 31
          ? Math.round(billingDay)
          : null,
      renewalOn: null,
    });
  }

  if (rows.some((row) => row.renewalOn === null)) {
    warnings.push(
      "Subscriptions: workbook has no renewal dates — extracted rows will have renewal_on null.",
    );
  }

  return rows;
}

export async function parseWorkbook(
  workbookPath: string,
): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const warnings: string[] = [];
  const skippedRecipes: ParsedWorkbook["skippedRecipes"] = [];
  const setup = workbook.getWorksheet("Setup");
  const recipesSheet = workbook.getWorksheet("Recipe Management");
  const subsSheet = workbook.getWorksheet("Subscription Tracker");
  const backendSheet = workbook.getWorksheet("Back-end");
  const monthlyBudgetSheet = workbook.getWorksheet("Monthly Budget");
  const logSheet = workbook.getWorksheet("Log");

  if (!setup || !recipesSheet || !subsSheet) {
    throw new Error(
      "Workbook is missing required sheets (Setup, Recipe Management, Subscription Tracker).",
    );
  }

  let budgetCategories: ParsedWorkbook["budgetCategories"] = [];
  let budgetLimits: ParsedWorkbook["budgetLimits"] = [];
  let transactions: ParsedWorkbook["transactions"] = [];

  if (backendSheet && monthlyBudgetSheet && logSheet) {
    const budget = parseBudgetSheets(
      backendSheet,
      monthlyBudgetSheet,
      logSheet,
      warnings,
    );
    budgetCategories = budget.categories;
    budgetLimits = budget.limits;
    transactions = budget.transactions;
  } else {
    warnings.push(
      "Budget sheets (Back-end, Monthly Budget, Log) missing or incomplete — budget output will be empty.",
    );
  }

  return {
    workbookPath,
    sheetNames: workbook.worksheets.map((ws) => ws.name),
    ingredients: parseSetupIngredients(setup, warnings),
    recipes: parseRecipes(recipesSheet, warnings, skippedRecipes),
    subscriptions: parseSubscriptions(subsSheet, warnings),
    budgetCategories,
    budgetLimits,
    transactions,
    skippedRecipes,
    warnings,
  };
}

export { cellText, cellNumber, isFormulaCell };
