/**
 * Database types for the Jella Home public schema.
 *
 * Regenerate from a running project when the schema changes:
 *   npm run supabase:types
 *   # or: npx supabase gen types typescript --linked > lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          display_name: string;
          role: "owner" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          display_name: string;
          role?: "owner" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          display_name?: string;
          role?: "owner" | "member";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          kind: "income" | "expense" | "bill" | "savings" | "debt";
          sort_order: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          kind: "income" | "expense" | "bill" | "savings" | "debt";
          sort_order?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          kind?: "income" | "expense" | "bill" | "savings" | "debt";
          sort_order?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_categories_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          category_id: string;
          amount_cents: number;
          direction: "in" | "out";
          occurred_on: string;
          payee: string;
          notes: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          category_id: string;
          amount_cents: number;
          direction: "in" | "out";
          occurred_on: string;
          payee?: string;
          notes?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          category_id?: string;
          amount_cents?: number;
          direction?: "in" | "out";
          occurred_on?: string;
          payee?: string;
          notes?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "budget_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredients: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          default_unit: string;
          store_section: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          default_unit?: string;
          store_section?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          default_unit?: string;
          store_section?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ingredients_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          servings: number;
          instructions: string;
          notes: string;
          source_url: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          servings?: number;
          instructions?: string;
          notes?: string;
          source_url?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          servings?: number;
          instructions?: string;
          notes?: string;
          source_url?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          household_id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          notes: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          household_id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit?: string;
          notes?: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          household_id?: string;
          recipe_id?: string;
          ingredient_id?: string;
          quantity?: number;
          unit?: string;
          notes?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
        ];
      };
      planned_meals: {
        Row: {
          id: string;
          household_id: string;
          plan_date: string;
          meal_slot: "breakfast" | "lunch" | "dinner" | "snack" | "other";
          recipe_id: string | null;
          custom_title: string | null;
          servings: number | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          plan_date: string;
          meal_slot: "breakfast" | "lunch" | "dinner" | "snack" | "other";
          recipe_id?: string | null;
          custom_title?: string | null;
          servings?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          plan_date?: string;
          meal_slot?: "breakfast" | "lunch" | "dinner" | "snack" | "other";
          recipe_id?: string | null;
          custom_title?: string | null;
          servings?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_meals_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planned_meals_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_lists: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          week_start_on: string | null;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          week_start_on?: string | null;
          status?: "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          week_start_on?: string | null;
          status?: "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grocery_lists_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_list_items: {
        Row: {
          id: string;
          household_id: string;
          list_id: string;
          name: string;
          quantity: number | null;
          unit: string;
          store_section: string;
          is_checked: boolean;
          source: "manual" | "generated";
          ingredient_id: string | null;
          recipe_id: string | null;
          notes: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          list_id: string;
          name: string;
          quantity?: number | null;
          unit?: string;
          store_section?: string;
          is_checked?: boolean;
          source?: "manual" | "generated";
          ingredient_id?: string | null;
          recipe_id?: string | null;
          notes?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          list_id?: string;
          name?: string;
          quantity?: number | null;
          unit?: string;
          store_section?: string;
          is_checked?: boolean;
          source?: "manual" | "generated";
          ingredient_id?: string | null;
          recipe_id?: string | null;
          notes?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grocery_list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "grocery_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          household_id: string;
          vendor: string;
          category_id: string | null;
          amount_cents: number;
          cadence: "weekly" | "monthly" | "quarterly" | "yearly";
          renewal_on: string | null;
          status: "active" | "paused" | "canceled";
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          vendor: string;
          category_id?: string | null;
          amount_cents: number;
          cadence: "weekly" | "monthly" | "quarterly" | "yearly";
          renewal_on?: string | null;
          status?: "active" | "paused" | "canceled";
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          vendor?: string;
          category_id?: string | null;
          amount_cents?: number;
          cadence?: "weekly" | "monthly" | "quarterly" | "yearly";
          renewal_on?: string | null;
          status?: "active" | "paused" | "canceled";
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_household_member: {
        Args: { target_household_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
