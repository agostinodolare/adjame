import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "staff" | "vendeur" | "livreur";

export const roleHome: Record<AppRole, string> = {
  admin: "/admin",
  staff: "/admin",
  vendeur: "/",
  livreur: "/",
};

/** Rôles du compte connecté, par ordre de priorité d'accès. */
export async function fetchMyRoles(): Promise<AppRole[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return [];
  
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) return [];
  return (data ?? []).map((row) => row.role as AppRole);
}

export function primaryRole(roles: AppRole[]): AppRole | null {
  const order: AppRole[] = ["admin", "staff", "livreur", "vendeur"];
  return order.find((role) => roles.includes(role)) ?? null;
}

/** Destination naturelle après connexion selon le rôle du compte. */
export async function destinationForCurrentUser() {
  const role = primaryRole(await fetchMyRoles());
  return role ? roleHome[role] : "/admin";
}
