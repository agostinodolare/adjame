export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      coupon_redemptions: {
        Row: {
          coupon_id: string;
          customer_id: string;
          discount_amount: number;
          id: string;
          redeemed_at: string;
        };
        Insert: {
          coupon_id: string;
          customer_id: string;
          discount_amount?: number;
          id?: string;
          redeemed_at?: string;
        };
        Update: {
          coupon_id?: string;
          customer_id?: string;
          discount_amount?: number;
          id?: string;
          redeemed_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          discount_type: string;
          discount_value: number;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          updated_at: string;
          valid_from: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          discount_type: string;
          discount_value: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          updated_at?: string;
          valid_from?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          discount_type?: string;
          discount_value?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          updated_at?: string;
          valid_from?: string;
        };
        Relationships: [];
      };
      courier_reviews: {
        Row: {
          order_id: string;
          courier_id: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          order_id: string;
          courier_id: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          order_id?: string;
          courier_id?: string;
          rating?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courier_reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courier_reviews_courier_id_fkey";
            columns: ["courier_id"];
            isOneToOne: false;
            referencedRelation: "couriers";
            referencedColumns: ["id"];
          },
        ];
      };
      couriers: {
        Row: {
          availability: string;
          created_at: string;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
          zone: string;
        };
        Insert: {
          availability?: string;
          created_at?: string;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          zone?: string;
        };
        Update: {
          availability?: string;
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
          zone?: string;
        };
        Relationships: [];
      };
      customer_profiles: {
        Row: {
          address: string | null;
          commune: string;
          full_name: string;
          phone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          commune?: string;
          full_name: string;
          phone: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          commune?: string;
          full_name?: string;
          phone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          additional_image_paths: string[];
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          name: string;
          price: number;
          stock: number;
          subcategory: string | null;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          additional_image_paths?: string[];
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name: string;
          price: number;
          stock?: number;
          subcategory?: string | null;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          additional_image_paths?: string[];
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name?: string;
          price?: number;
          stock?: number;
          subcategory?: string | null;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      product_reviews: {
        Row: {
          order_item_id: string;
          product_id: string;
          rating: number;
          created_at: string;
        };
        product_actions: {
          Row: {
            favorite: boolean;
            liked: boolean;
            product_id: string;
            updated_at: string;
            user_id: string;
          };
          Insert: {
            favorite?: boolean;
            liked?: boolean;
            product_id: string;
            updated_at?: string;
            user_id: string;
          };
          Update: {
            favorite?: boolean;
            liked?: boolean;
            product_id?: string;
            updated_at?: string;
            user_id?: string;
          };
          Relationships: [
            {
              foreignKeyName: "product_actions_product_id_fkey";
              columns: ["product_id"];
              isOneToOne: false;
              referencedRelation: "products";
              referencedColumns: ["id"];
            },
          ];
        };
        Insert: {
          order_item_id: string;
          product_id: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          order_item_id?: string;
          product_id?: string;
          rating?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: true;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          line_total: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          line_total: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_total?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address: string | null;
          commune: string;
          coupon_id: string | null;
          courier_id: string | null;
          created_at: string;
          customer_name: string;
          customer_id: string | null;
          customer_phone: string | null;
          delivery_fee: number;
          discount_total: number;
          id: string;
          items_total: number;
          reference: string;
          status: string;
          updated_at: string;
          vendor_id: string | null;
        };
        Insert: {
          address?: string | null;
          commune?: string;
          coupon_id?: string | null;
          courier_id?: string | null;
          created_at?: string;
          customer_name: string;
          customer_id?: string | null;
          customer_phone?: string | null;
          delivery_fee?: number;
          discount_total?: number;
          id?: string;
          items_total?: number;
          reference: string;
          status?: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Update: {
          address?: string | null;
          commune?: string;
          coupon_id?: string | null;
          courier_id?: string | null;
          created_at?: string;
          customer_name?: string;
          customer_id?: string | null;
          customer_phone?: string | null;
          delivery_fee?: number;
          discount_total?: number;
          id?: string;
          items_total?: number;
          reference?: string;
          status?: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_courier_id_fkey";
            columns: ["courier_id"];
            isOneToOne: false;
            referencedRelation: "couriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          banner_path: string | null;
          category: string;
          created_at: string;
          id: string;
          logo_path: string | null;
          name: string;
          phone: string | null;
          shop_name: string;
          stall: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
          verified: boolean;
        };
        Insert: {
          banner_path?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name: string;
          phone?: string | null;
          shop_name: string;
          stall?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          verified?: boolean;
        };
        Update: {
          banner_path?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          logo_path?: string | null;
          name?: string;
          phone?: string | null;
          shop_name?: string;
          stall?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          verified?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_courier_id: { Args: never; Returns: string };
      current_vendor_id: { Args: never; Returns: string };
      assign_order_courier: {
        Args: {
          _courier_id: string | null;
          _order_id: string;
        };
        Returns: Json;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      place_market_orders: {
        Args: {
          _address: string | null;
          _commune: string;
          _customer_name: string;
          _customer_phone: string;
          _delivery_fee: number;
          _items: Json;
          _customer_id: string | null;
        };
        Returns: Json;
      };
      place_market_orders_with_coupon: {
        Args: {
          _address: string | null;
          _commune: string;
          _coupon_code: string | null;
          _customer_id: string | null;
          _customer_name: string;
          _customer_phone: string;
          _delivery_fee: number;
          _items: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "staff" | "vendeur" | "livreur" | "client";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
  public: {
    Enums: {
      app_role: ["admin", "staff", "vendeur", "livreur", "client"],
    },
  },
} as const;
