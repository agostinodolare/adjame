import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "staff" | "vendeur" | "livreur" | "client";

export const roleHome: Record<AppRole, string> = {
  admin: "/admin",
  staff: "/admin",
  vendeur: "/",
  livreur: "/",
  client: "/client",
};

/** Rôles du compte connecté, par ordre de priorité d'accès. */
export async function fetchMyRoles(): Promise<AppRole[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return [];

  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error) return [];
  return (data ?? []).map((row) => row.role as AppRole);
}

export async function registerCurrentCustomer(userId: string) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session || session.user.id !== userId) throw new Error("Session client invalide.");

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);
  if (rolesError) throw rolesError;
  if (roles.some((row) => row.role === "client")) return;

  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: session.user.id, role: "client" });
  if (error) throw error;
}

export function primaryRole(roles: AppRole[]): AppRole | null {
  const order: AppRole[] = ["admin", "staff", "livreur", "vendeur", "client"];
  return order.find((role) => roles.includes(role)) ?? null;
}

/** Destination naturelle après connexion selon le rôle du compte. */
export async function destinationForCurrentUser() {
  const role = primaryRole(await fetchMyRoles());
  return role ? roleHome[role] : "/admin";
}
