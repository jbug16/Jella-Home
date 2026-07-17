export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      budget_categories: {
        Row: {
          archived_at: string | null;
          created_at: string;
          household_id: string;
          id: string;
          kind: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          kind: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          kind?: string;
          name?: string;
          sort_order?: number;
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
      budget_month_limits: {
        Row: {
          category_id: string;
          created_at: string;
          household_id: string;
          id: string;
          limit_cents: number;
          month_start: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          household_id: string;
          id?: string;
          limit_cents: number;
          month_start: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          household_id?: string;
          id?: string;
          limit_cents?: number;
          month_start?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_month_limits_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "budget_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_month_limits_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_list_items: {
        Row: {
          created_at: string;
          household_id: string;
          id: string;
          ingredient_id: string | null;
          is_checked: boolean;
          list_id: string;
          name: string;
          notes: string;
          quantity: number | null;
          recipe_id: string | null;
          sort_order: number;
          source: string;
          store_section: string;
          unit: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          id?: string;
          ingredient_id?: string | null;
          is_checked?: boolean;
          list_id: string;
          name: string;
          notes?: string;
          quantity?: number | null;
          recipe_id?: string | null;
          sort_order?: number;
          source?: string;
          store_section?: string;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          id?: string;
          ingredient_id?: string | null;
          is_checked?: boolean;
          list_id?: string;
          name?: string;
          notes?: string;
          quantity?: number | null;
          recipe_id?: string | null;
          sort_order?: number;
          source?: string;
          store_section?: string;
          unit?: string;
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
            foreignKeyName: "grocery_list_items_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grocery_list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "grocery_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grocery_list_items_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_lists: {
        Row: {
          created_at: string;
          household_id: string;
          id: string;
          name: string;
          status: string;
          updated_at: string;
          week_start_on: string | null;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
          week_start_on?: string | null;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
          week_start_on?: string | null;
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
      household_members: {
        Row: {
          created_at: string;
          display_name: string;
          household_id: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          household_id: string;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          household_id?: string;
          id?: string;
          role?: string;
          user_id?: string;
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
      households: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          created_at: string;
          default_unit: string;
          household_id: string;
          id: string;
          name: string;
          store_section: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_unit?: string;
          household_id: string;
          id?: string;
          name: string;
          store_section?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_unit?: string;
          household_id?: string;
          id?: string;
          name?: string;
          store_section?: string;
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
      planned_meals: {
        Row: {
          created_at: string;
          custom_title: string | null;
          household_id: string;
          id: string;
          meal_slot: string;
          notes: string;
          plan_date: string;
          recipe_id: string | null;
          servings: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          custom_title?: string | null;
          household_id: string;
          id?: string;
          meal_slot: string;
          notes?: string;
          plan_date: string;
          recipe_id?: string | null;
          servings?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          custom_title?: string | null;
          household_id?: string;
          id?: string;
          meal_slot?: string;
          notes?: string;
          plan_date?: string;
          recipe_id?: string | null;
          servings?: number | null;
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
      recipe_ingredients: {
        Row: {
          household_id: string;
          id: string;
          ingredient_id: string;
          notes: string;
          quantity: number;
          recipe_id: string;
          sort_order: number;
          unit: string;
        };
        Insert: {
          household_id: string;
          id?: string;
          ingredient_id: string;
          notes?: string;
          quantity: number;
          recipe_id: string;
          sort_order?: number;
          unit?: string;
        };
        Update: {
          household_id?: string;
          id?: string;
          ingredient_id?: string;
          notes?: string;
          quantity?: number;
          recipe_id?: string;
          sort_order?: number;
          unit?: string;
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
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          archived_at: string | null;
          created_at: string;
          household_id: string;
          id: string;
          instructions: string;
          name: string;
          notes: string;
          servings: number;
          source_url: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          instructions?: string;
          name: string;
          notes?: string;
          servings?: number;
          source_url?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          instructions?: string;
          name?: string;
          notes?: string;
          servings?: number;
          source_url?: string | null;
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
      subscriptions: {
        Row: {
          amount_cents: number;
          cadence: string;
          category_label: string;
          created_at: string;
          household_id: string;
          id: string;
          notes: string;
          renewal_on: string | null;
          status: string;
          updated_at: string;
          vendor: string;
        };
        Insert: {
          amount_cents: number;
          cadence: string;
          category_label?: string;
          created_at?: string;
          household_id: string;
          id?: string;
          notes?: string;
          renewal_on?: string | null;
          status?: string;
          updated_at?: string;
          vendor: string;
        };
        Update: {
          amount_cents?: number;
          cadence?: string;
          category_label?: string;
          created_at?: string;
          household_id?: string;
          id?: string;
          notes?: string;
          renewal_on?: string | null;
          status?: string;
          updated_at?: string;
          vendor?: string;
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
      transactions: {
        Row: {
          amount_cents: number;
          category_id: string;
          created_at: string;
          created_by: string | null;
          direction: string;
          household_id: string;
          id: string;
          notes: string;
          occurred_on: string;
          payee: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          direction: string;
          household_id: string;
          id?: string;
          notes?: string;
          occurred_on: string;
          payee?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          direction?: string;
          household_id?: string;
          id?: string;
          notes?: string;
          occurred_on?: string;
          payee?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "budget_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
