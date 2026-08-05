/** Map common workbook unit strings onto approved domain units. */
const UNIT_ALIASES: Record<string, string> = {
  lbs: "lb",
  lb: "lb",
  pound: "lb",
  pounds: "lb",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  unit: "piece",
  units: "piece",
  piece: "piece",
  pieces: "piece",
  clove: "clove",
  cloves: "clove",
  pinch: "pinch",
  dash: "dash",
  can: "can",
  cans: "can",
  bunch: "bunch",
  ml: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  "fl oz": "fl oz",
};

export function mapWorkbookUnit(raw: string): {
  unit: string;
  mapped: boolean;
} {
  const normalized = raw.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized) {
    return { unit: "", mapped: true };
  }
  const alias = UNIT_ALIASES[normalized];
  if (alias) {
    return { unit: alias, mapped: true };
  }
  return { unit: normalized, mapped: false };
}
