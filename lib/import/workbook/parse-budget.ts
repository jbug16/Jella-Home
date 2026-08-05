import type ExcelJS from "exceljs";

import type { BudgetCategoryKind } from "@/lib/domain/budget";
import {
  BACKEND_CATEGORY_COLUMNS,
  BUDGET_TRACKER_SECTIONS,
  LOG_DATA_END_ROW,
  LOG_DATA_START_ROW,
  MONTH_NAME_TO_NUMBER,
  WORKBOOK_KIND_TO_DOMAIN,
} from "@/lib/import/workbook/constants";
import { cellNumber, cellText } from "@/lib/import/workbook/parse-workbook";
import type {
  ParsedBudgetCategory,
  ParsedBudgetLimit,
  ParsedTransaction,
} from "@/lib/import/workbook/types";

function parseMonthStart(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
): string | null {
  const monthLabel = cellText(sheet.getCell(9, 4).value)
    .replace(/\s+/g, " ")
    .trim();
  const year = cellNumber(sheet.getCell(10, 4).value);
  const monthKey = monthLabel.replace(/\s/g, "").toUpperCase();
  const monthNum = MONTH_NAME_TO_NUMBER[monthKey];
  if (!monthNum || year === null || year < 2000) {
    warnings.push(
      `Monthly Budget: unable to parse month/year from D9/D10 (${monthLabel} / ${year}).`,
    );
    return null;
  }
  const month = String(monthNum).padStart(2, "0");
  return `${Math.round(year)}-${month}-01`;
}

function parseBackendCategories(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
): ParsedBudgetCategory[] {
  const categories: ParsedBudgetCategory[] = [];
  for (const { col, kind } of BACKEND_CATEGORY_COLUMNS) {
    let sortOrder = 0;
    for (let row = 3; row <= 37; row++) {
      const name = cellText(sheet.getCell(row, col).value);
      if (!name) {
        continue;
      }
      categories.push({
        name,
        kind,
        sortOrder: sortOrder++,
        source: `Back-end!${String.fromCharCode(64 + col)}${row}`,
      });
    }
  }
  if (categories.length === 0) {
    warnings.push("Back-end: no budget category names found in B3:F37.");
  }
  return categories;
}

function parseBudgetLimits(
  sheet: ExcelJS.Worksheet,
  monthStart: string | null,
  warnings: string[],
): ParsedBudgetLimit[] {
  if (!monthStart) {
    return [];
  }

  const limits: ParsedBudgetLimit[] = [];
  for (let row = 16; row <= 50; row++) {
    for (const section of BUDGET_TRACKER_SECTIONS) {
      const name = cellText(sheet.getCell(row, section.nameCol).value);
      if (!name) {
        continue;
      }
      const limitDollars = cellNumber(
        sheet.getCell(row, section.limitCol).value,
      );
      if (limitDollars === null || limitDollars < 0) {
        continue;
      }
      limits.push({
        categoryName: name,
        categoryKind: section.kind,
        monthStart,
        limitCents: Math.round(limitDollars * 100),
        source: `Monthly Budget row ${row}`,
      });
    }
  }

  if (limits.length === 0) {
    warnings.push(
      `Monthly Budget: no line-level budget limits found for ${monthStart}.`,
    );
  }
  return limits;
}

function excelDateToIso(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const num = cellNumber(value);
  if (num !== null && num > 30000 && num < 60000) {
    const base = new Date(Date.UTC(1899, 11, 30));
    base.setUTCDate(base.getUTCDate() + Math.round(num));
    return base.toISOString().slice(0, 10);
  }
  const text = cellText(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  return null;
}

function workbookKindToDomain(raw: string): BudgetCategoryKind | null {
  return WORKBOOK_KIND_TO_DOMAIN[raw.trim()] ?? null;
}

function parseTransactions(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let row = LOG_DATA_START_ROW; row <= LOG_DATA_END_ROW; row++) {
    const occurredOn = excelDateToIso(sheet.getCell(row, 2).value);
    const kindRaw = cellText(sheet.getCell(row, 3).value);
    const categoryName = cellText(sheet.getCell(row, 4).value);
    const amountDollars = cellNumber(sheet.getCell(row, 6).value);
    const notes = cellText(sheet.getCell(row, 7).value);

    if (!occurredOn && !kindRaw && !categoryName && amountDollars === null) {
      continue;
    }

    if (!occurredOn || !kindRaw || !categoryName || amountDollars === null) {
      continue;
    }

    const kind = workbookKindToDomain(kindRaw);
    if (!kind) {
      warnings.push(
        `Log row ${row}: unknown category kind "${kindRaw}" — skipped.`,
      );
      continue;
    }

    if (amountDollars <= 0) {
      warnings.push(`Log row ${row}: non-positive amount — skipped.`);
      continue;
    }

    transactions.push({
      categoryKind: kind,
      categoryName,
      amountCents: Math.round(amountDollars * 100),
      direction: kind === "income" ? "in" : "out",
      occurredOn,
      payee: "",
      notes,
      source: `Log row ${row}`,
    });
  }

  if (transactions.length === 0) {
    warnings.push(
      "Log: no complete transaction rows found (date, kind, subcategory, amount).",
    );
  }
  return transactions;
}

export function parseBudgetSheets(
  backend: ExcelJS.Worksheet,
  monthlyBudget: ExcelJS.Worksheet,
  log: ExcelJS.Worksheet,
  warnings: string[],
): {
  categories: ParsedBudgetCategory[];
  limits: ParsedBudgetLimit[];
  transactions: ParsedTransaction[];
} {
  const monthStart = parseMonthStart(monthlyBudget, warnings);
  return {
    categories: parseBackendCategories(backend, warnings),
    limits: parseBudgetLimits(monthlyBudget, monthStart, warnings),
    transactions: parseTransactions(log, warnings),
  };
}
