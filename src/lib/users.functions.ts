import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AppRole } from "@/lib/roles";

const accessTokenSchema = z.object({
  accessToken: z.string().min(1),
});

const assignRoleSchema = accessTokenSchema.extend({
  userId: z.string().uuid(),
  role: z.enum(["admin", "staff", "vendeur", "livreur", "client"]),
});

const removeRoleSchema = accessTokenSchema.extend({
  userId: z.string().uuid(),
  role: z.enum(["admin", "staff", "vendeur", "livreur", "client"]),
});

async function requireAdmin(accessToken: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Session administrateur invalide.");

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  if (rolesError) throw new Error(rolesError.message);
  if (!roles.some((row) => row.role === "admin")) {
    throw new Error("Cette opération est réservée aux administrateurs.");
  }

  return supabaseAdmin;
}

export const listManagedUsers = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessTokenSchema.parse(input))
  .handler(async ({ data }) => {
    const supabaseAdmin = await requireAdmin(data.accessToken);
    const perPage = 100;
    const users: { id: string; email: string }[] = [];
    for (let page = 1; ; page += 1) {
      const { data: result, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw new Error(error.message);
      users.push(
        ...result.users.map((user) => ({
          id: user.id,
          email: user.email ?? "",
        })),
      );
      if (result.users.length < perPage) break;
    }

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesError) throw new Error(rolesError.message);

    return users.map((user) => ({
      ...user,
      roles: roles.filter((role) => role.user_id === user.id).map((role) => role.role as AppRole),
    }));
  });

export const assignManagedRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => assignRoleSchema.parse(input))
  .handler(async ({ data }) => {
    const supabaseAdmin = await requireAdmin(data.accessToken);
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(
      data.userId,
    );
    if (targetError || !target.user) throw new Error("Compte utilisateur introuvable.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
  });

export const removeManagedRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => removeRoleSchema.parse(input))
  .handler(async ({ data }) => {
    const supabaseAdmin = await requireAdmin(data.accessToken);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
  });
