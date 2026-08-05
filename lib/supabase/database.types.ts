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
      calendar_events: {
        Row: {
          all_day: boolean;
          category: string;
          created_at: string;
          end_at: string | null;
          end_on: string;
          household_id: string;
          id: string;
          location: string;
          notes: string;
          recurrence: string;
          recurrence_end_on: string | null;
          start_at: string | null;
          start_on: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          all_day?: boolean;
          category?: string;
          created_at?: string;
          end_at?: string | null;
          end_on: string;
          household_id: string;
          id?: string;
          location?: string;
          notes?: string;
          recurrence?: string;
          recurrence_end_on?: string | null;
          start_at?: string | null;
          start_on: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          all_day?: boolean;
          category?: string;
          created_at?: string;
          end_at?: string | null;
          end_on?: string;
          household_id?: string;
          id?: string;
          location?: string;
          notes?: string;
          recurrence?: string;
          recurrence_end_on?: string | null;
          start_at?: string | null;
          start_on?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_source_preferences: {
        Row: {
          household_id: string;
          id: string;
          source_key: string;
          updated_at: string;
          user_id: string;
          visible: boolean;
        };
        Insert: {
          household_id: string;
          id?: string;
          source_key: string;
          updated_at?: string;
          user_id: string;
          visible?: boolean;
        };
        Update: {
          household_id?: string;
          id?: string;
          source_key?: string;
          updated_at?: string;
          user_id?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_source_preferences_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      countdowns: {
        Row: {
          color: string;
          created_at: string;
          household_id: string;
          id: string;
          target_on: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          household_id: string;
          id?: string;
          target_on: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          household_id?: string;
          id?: string;
          target_on?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "countdowns_household_id_fkey";
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
          generation_key: string | null;
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
          generation_key?: string | null;
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
          generation_key?: string | null;
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
          name_normalized: string | null;
          store_section: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_unit?: string;
          household_id: string;
          id?: string;
          name: string;
          name_normalized?: string | null;
          store_section?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_unit?: string;
          household_id?: string;
          id?: string;
          name?: string;
          name_normalized?: string | null;
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
          custom_title: string;
          household_id: string;
          id: string;
          meal_slot: string;
          notes: string;
          plan_date: string;
          recipe_id: string | null;
          servings: number | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          custom_title?: string;
          household_id: string;
          id?: string;
          meal_slot: string;
          notes?: string;
          plan_date: string;
          recipe_id?: string | null;
          servings?: number | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          custom_title?: string;
          household_id?: string;
          id?: string;
          meal_slot?: string;
          notes?: string;
          plan_date?: string;
          recipe_id?: string | null;
          servings?: number | null;
          sort_order?: number;
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
          quantity: number | null;
          recipe_id: string;
          sort_order: number;
          unit: string;
        };
        Insert: {
          household_id: string;
          id?: string;
          ingredient_id: string;
          notes?: string;
          quantity?: number | null;
          recipe_id: string;
          sort_order?: number;
          unit?: string;
        };
        Update: {
          household_id?: string;
          id?: string;
          ingredient_id?: string;
          notes?: string;
          quantity?: number | null;
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
          cook_time_minutes: number | null;
          created_at: string;
          household_id: string;
          id: string;
          image_path: string | null;
          instructions: string;
          name: string;
          notes: string;
          prep_time_minutes: number | null;
          servings: number;
          source_url: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          cook_time_minutes?: number | null;
          created_at?: string;
          household_id: string;
          id?: string;
          image_path?: string | null;
          instructions?: string;
          name: string;
          notes?: string;
          prep_time_minutes?: number | null;
          servings?: number;
          source_url?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          cook_time_minutes?: number | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          image_path?: string | null;
          instructions?: string;
          name?: string;
          notes?: string;
          prep_time_minutes?: number | null;
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
          billing_day: number;
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
          billing_day?: number;
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
          billing_day?: number;
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
      regenerate_grocery_list: {
        Args: {
          p_household_id: string;
          p_items: Json;
          p_list_name?: string;
          p_week_start_on: string;
        };
        Returns: string;
      };
      save_recipe_with_ingredients: {
        Args: {
          p_cook_time_minutes: number;
          p_expected_updated_at?: string | null;
          p_household_id: string;
          p_ingredients: Json;
          p_instructions: string;
          p_name: string;
          p_notes: string;
          p_prep_time_minutes: number;
          p_recipe_id?: string;
          p_servings: number;
        };
        Returns: string;
      };
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
