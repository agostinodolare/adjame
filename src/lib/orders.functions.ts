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
  Bingerville: 2500,
  "Intérieur du pays": 6000,
};

export const communes = Object.keys(deliveryFees);

export const deliveryFeeFor = (commune: string) => deliveryFees[commune] ?? 2000;

const requestSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_phone: z.string().trim().min(8).max(30),
  commune: z.string().trim().min(2).max(60),
  address: z.string().trim().max(200).optional(),
  items_total: z.number().int().min(100).max(5_000_000),
  shop_name: z.string().trim().max(120).optional(),
});

export const requestDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let vendorId: string | null = null;
    if (data.shop_name) {
      const { data: vendor } = await supabaseAdmin
        .from("vendors")
        .select("id")
        .eq("shop_name", data.shop_name)
        .eq("status", "actif")
        .maybeSingle();
      vendorId = vendor?.id ?? null;
    }

    const reference = `MG-${Math.floor(1000 + Math.random() * 9000)}${Date.now() % 100}`;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        reference,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        commune: data.commune,
        address: data.address || null,
        items_total: data.items_total,
        delivery_fee: deliveryFeeFor(data.commune),
        status: "nouvelle",
        vendor_id: vendorId,
      })
      .select("reference, delivery_fee")
      .single();

    if (error) throw new Error(error.message);
    return order;
  });
