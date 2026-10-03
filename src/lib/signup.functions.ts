import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const vendorSignupCategories = ["Homme", "Femme"];

export const courierZones = [
  "Adjamé",
  "Plateau",
  "Cocody",
  "Yopougon",
  "Abobo",
  "Marcory",
  "Treichville",
  "Koumassi",
  "Port-Bouët",
  "Anyama",
  "Bingerville",
  "Songon",
  "Intérieur du pays",
];

const vendorApplicationSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  shop_name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(8).max(30),
  stall: z.string().trim().max(120).optional(),
});

const courierApplicationSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(30),
  zone: z.string().trim().min(2).max(60),
});

/** Vérifie que l'identifiant fourni correspond bien à un compte fraîchement créé. */
async function assertUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Compte introuvable.");
  return supabaseAdmin;
}

/**
 * Créé au moment de l'inscription d'un vendeur : la boutique arrive côté admin
 * en attente de vérification (verified = false) et n'est donc pas visible
 * publiquement avant validation.
 */
export const registerVendorApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => vendorApplicationSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await assertUser(data.user_id);

    const { data: existing } = await supabaseAdmin
      .from("vendors")
      .select("id, user_id")
      .eq("shop_name", data.shop_name)
      .maybeSingle();

    if (existing) {
      if (!existing.user_id) {
        await supabaseAdmin.from("vendors").update({ user_id: data.user_id }).eq("id", existing.id);
      }
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "vendeur" }, { onConflict: "user_id,role" });
      return { status: "existing" as const };
    }

    const { error } = await supabaseAdmin.from("vendors").insert({
      user_id: data.user_id,
      name: data.name,
      shop_name: data.shop_name,
      category: data.category,
      phone: data.phone,
      stall: data.stall || null,
      status: "actif",
      verified: false,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: "vendeur" }, { onConflict: "user_id,role" });

    return { status: "created" as const };
  });

/**
 * Inscription d'un livreur : la fiche coursier est créée hors ligne, un agent
 * Mon Djassaman la valide et le met en disponible avant les premières missions.
 */
export const registerCourierApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => courierApplicationSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await assertUser(data.user_id);

    const { data: existing } = await supabaseAdmin
      .from("couriers")
      .select("id, user_id")
      .eq("phone", data.phone)
      .maybeSingle();

    if (existing) {
      if (!existing.user_id) {
        await supabaseAdmin
          .from("couriers")
          .update({ user_id: data.user_id })
          .eq("id", existing.id);
      }
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "livreur" }, { onConflict: "user_id,role" });
      return { status: "existing" as const };
    }

    const { error } = await supabaseAdmin.from("couriers").insert({
      user_id: data.user_id,
      name: data.name,
      phone: data.phone,
      zone: data.zone,
      availability: "hors ligne",
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: "livreur" }, { onConflict: "user_id,role" });

    return { status: "created" as const };
  });
