import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const deliveryFees: Record<string, number> = {
  Adjamé: 1000,
  Plateau: 1500,
  Treichville: 1500,
  Yopougon: 1500,
  Marcory: 2000,
  Cocody: 2000,
  Abobo: 2000,
  Koumassi: 1500,
  "Port-Bouët": 2500,
  Anyama: 2500,
  Bingerville: 2500,
  Songon: 2500,
  "Intérieur du pays": 6000,
};

export const communes = Object.keys(deliveryFees);

export const deliveryFeeFor = (commune: string) => deliveryFees[commune] ?? 2000;

const requestSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_phone: z.string().trim().min(8).max(30),
  commune: z.string().trim().min(2).max(60),
  address: z.string().trim().max(200).optional(),
  accessToken: z.string().min(1),
  coupon_code: z.string().trim().max(40).optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(30),
});

const couponPreviewSchema = z.object({
  accessToken: z.string().min(1),
  code: z.string().trim().min(3).max(40),
  itemsTotal: z.number().int().positive(),
});

const availableCouponsSchema = z.object({ accessToken: z.string().min(1) });

const assignCourierSchema = z.object({
  accessToken: z.string().min(1),
  orderId: z.string().uuid(),
  courierId: z.string().uuid().nullable(),
});

export const requestDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(data.accessToken);
    if (authError || !authData.user) throw new Error("Connexion requise pour commander.");
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);
    if (rolesError) throw new Error(rolesError.message);
    const customerId = roles.some((row) => row.role === "client") ? authData.user.id : null;

    const couponCode = data.coupon_code?.trim().toUpperCase() || null;
    if (couponCode && !customerId) {
      throw new Error("Connectez-vous avec un compte client pour utiliser un bon d’achat.");
    }

    const { data: orders, error } = await supabaseAdmin.rpc("place_market_orders_with_coupon", {
      _customer_name: data.customer_name,
      _customer_phone: data.customer_phone,
      _commune: data.commune,
      _address: data.address || null,
      _delivery_fee: deliveryFeeFor(data.commune),
      _items: data.items,
      _customer_id: customerId,
      _coupon_code: couponCode,
    });
    if (error) throw new Error(error.message);

    return z
      .array(
        z.object({
          reference: z.string(),
          vendor_name: z.string(),
          items_total: z.number(),
          delivery_fee: z.number(),
          discount_total: z.number(),
          coupon_code: z.string().nullable(),
        }),
      )
      .min(1)
      .parse(orders);
  });

export const previewCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => couponPreviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(data.accessToken);
    if (authError || !authData.user)
      throw new Error("Connexion requise pour utiliser un bon d’achat.");

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);
    if (rolesError) throw new Error(rolesError.message);
    if (!roles.some((row) => row.role === "client")) {
      throw new Error("Les bons d’achat sont réservés aux comptes clients.");
    }

    const code = data.code.toUpperCase();
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select("id, code, discount_type, discount_value, valid_from, expires_at, is_active")
      .eq("code", code)
      .maybeSingle();
    if (couponError) throw new Error(couponError.message);
    const now = Date.now();
    if (
      !coupon ||
      !coupon.is_active ||
      new Date(coupon.valid_from).getTime() > now ||
      (coupon.expires_at !== null && new Date(coupon.expires_at).getTime() <= now)
    ) {
      throw new Error("Ce code promo est invalide ou expiré.");
    }

    const { data: redemption, error: redemptionError } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("customer_id", authData.user.id)
      .maybeSingle();
    if (redemptionError) throw new Error(redemptionError.message);
    if (redemption) throw new Error("Vous avez déjà utilisé ce code promo.");

    const discountTotal =
      coupon.discount_type === "percentage"
        ? Math.floor((data.itemsTotal * coupon.discount_value) / 100)
        : Math.min(data.itemsTotal, coupon.discount_value);
    if (discountTotal <= 0) {
      throw new Error("Le montant du panier est trop faible pour appliquer ce code promo.");
    }

    return { code: coupon.code, discountTotal };
  });

export const listAvailableCoupons = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => availableCouponsSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(data.accessToken);
    if (authError || !authData.user)
      throw new Error("Connexion requise pour consulter les bons d’achat.");

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);
    if (rolesError) throw new Error(rolesError.message);
    if (!roles.some((row) => row.role === "client")) {
      throw new Error("Les bons d’achat sont réservés aux comptes clients.");
    }

    const now = new Date().toISOString();
    const { data: coupons, error: couponsError } = await supabaseAdmin
      .from("coupons")
      .select("id, code, discount_type, discount_value, expires_at")
      .eq("is_active", true)
      .lte("valid_from", now)
      .order("created_at", { ascending: false });
    if (couponsError) throw new Error(couponsError.message);
    if (!coupons.length) return [];

    const { data: redemptions, error: redemptionsError } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("coupon_id")
      .eq("customer_id", authData.user.id)
      .in(
        "coupon_id",
        coupons.map((coupon) => coupon.id),
      );
    if (redemptionsError) throw new Error(redemptionsError.message);
    const usedCouponIds = new Set((redemptions ?? []).map((redemption) => redemption.coupon_id));
    return coupons.filter(
      (coupon) =>
        !usedCouponIds.has(coupon.id) &&
        (coupon.expires_at === null || new Date(coupon.expires_at).getTime() > Date.now()),
    );
  });

export const assignOrderCourier = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => assignCourierSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(data.accessToken);
    if (authError || !authData.user) throw new Error("Session administrateur invalide.");

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);
    if (rolesError) throw new Error(rolesError.message);
    if (!roles.some((row) => row.role === "admin")) {
      throw new Error("Cette opération est réservée aux administrateurs.");
    }

    const { error } = await supabaseAdmin.rpc("assign_order_courier", {
      _order_id: data.orderId,
      _courier_id: data.courierId,
    });
    if (error) throw new Error(error.message);
  });
