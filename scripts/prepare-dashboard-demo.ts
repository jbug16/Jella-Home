/**
 * Local-only demo helpers for Dashboard UI testing.
 *
 * Refuses any non-loopback Supabase URL so fixture data can never be written to
 * any hosted environment.
 *
 *   npx tsx scripts/prepare-dashboard-demo.ts           # image + today's meal
 *   npx tsx scripts/prepare-dashboard-demo.ts --image   # fixture recipe image only
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import type { Database } from "../lib/supabase/database.types";

const HOUSEHOLD_A = "11111111-1111-4111-8111-111111111111";
const RECIPE_SPAGHETTI = "66666666-6666-4666-8666-666666666666";
const IMAGE_OBJECT = "fixture-spaghetti.jpg";

type AdminClient = SupabaseClient<Database>;

function readLocalSupabaseEnv(): {
  url: string;
  secret: string;
} | null {
  const result = spawnSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    return null;
  }

  const env: Record<string, string> = {};
  for (const line of result.stdout.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2]!;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]!] = value;
  }

  const url = env.API_URL ?? env.SUPABASE_URL;
  const secret =
    env.SECRET_KEY ?? env.SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    return null;
  }

  return { url, secret };
}

function assertLocalSupabaseUrl(url: string): void {
  const hostname = new URL(url).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error(
      "Dashboard demo preparation is restricted to local Supabase.",
    );
  }
}

function todayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function resolveFixtureRecipe(supabase: AdminClient): Promise<{
  recipeId: string;
  householdId: string;
}> {
  const byId = await supabase
    .from("recipes")
    .select("id, household_id")
    .eq("id", RECIPE_SPAGHETTI)
    .is("archived_at", null)
    .maybeSingle();

  if (byId.data) {
    return {
      recipeId: byId.data.id,
      householdId: byId.data.household_id,
    };
  }

  const byName = await supabase
    .from("recipes")
    .select("id, household_id")
    .eq("name", "Fixture Spaghetti")
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (byName.data) {
    return {
      recipeId: byName.data.id,
      householdId: byName.data.household_id,
    };
  }

  // Local development fallback: use the first active recipe with an image opportunity.
  const anyRecipe = await supabase
    .from("recipes")
    .select("id, household_id, name")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anyRecipe.data) {
    throw new Error(
      "No recipes found. Seed local Supabase or create a recipe first.",
    );
  }

  console.log(`Using recipe “${anyRecipe.data.name}” for demo cover.`);
  return {
    recipeId: anyRecipe.data.id,
    householdId: anyRecipe.data.household_id,
  };
}

async function ensureFixtureRecipeImage(
  supabase: AdminClient,
  householdId: string,
  recipeId: string,
) {
  const imagePath = `${householdId}/${IMAGE_OBJECT}`;
  const fixtureFile = resolve(
    process.cwd(),
    "supabase/fixtures/fixture-spaghetti.jpg",
  );
  const bytes = readFileSync(fixtureFile);

  const { error: uploadError } = await supabase.storage
    .from("recipe-images")
    .upload(imagePath, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({ image_path: imagePath })
    .eq("id", recipeId)
    .eq("household_id", householdId);

  if (recipeError) {
    throw new Error(`Recipe image_path update failed: ${recipeError.message}`);
  }
}

async function resetTodaysDemoMeal(
  supabase: AdminClient,
  householdId: string,
  recipeId: string,
  recipeTitle: string,
) {
  const today = todayIsoLocal();

  const { error: deleteError } = await supabase
    .from("planned_meals")
    .delete()
    .eq("household_id", householdId)
    .eq("plan_date", today);

  if (deleteError) {
    throw new Error(`Clearing today's meals failed: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase.from("planned_meals").insert({
    household_id: householdId,
    plan_date: today,
    meal_slot: "dinner",
    recipe_id: recipeId,
    custom_title: recipeTitle,
    servings: 2,
    notes: "",
    sort_order: 0,
  });

  if (insertError) {
    throw new Error(`Inserting demo meal failed: ${insertError.message}`);
  }

  return today;
}

async function main() {
  const imageOnly = process.argv.includes("--image");
  const local = readLocalSupabaseEnv();
  if (!local) {
    throw new Error(
      "Local Supabase is unavailable. Start it before preparing dashboard fixtures.",
    );
  }
  const { url, secret } = local;
  assertLocalSupabaseUrl(url);

  const supabase = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { recipeId, householdId } = await resolveFixtureRecipe(supabase);
  const recipeRow = await supabase
    .from("recipes")
    .select("name")
    .eq("id", recipeId)
    .maybeSingle();
  const recipeTitle = recipeRow.data?.name ?? "Tonight's meal";

  await ensureFixtureRecipeImage(supabase, householdId, recipeId);
  console.log(`Cover image attached for “${recipeTitle}”.`);

  if (!imageOnly) {
    if (householdId !== HOUSEHOLD_A) {
      console.log(
        "Skipping meal reset because the selected local household is not the fixture household.",
      );
    } else {
      const today = await resetTodaysDemoMeal(
        supabase,
        householdId,
        recipeId,
        recipeTitle,
      );
      console.log(`One dinner planned for ${today}.`);
    }
  }

  console.log("Use a local seeded test account to sign in.");
  console.log("Open: http://localhost:3000/dashboard");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
