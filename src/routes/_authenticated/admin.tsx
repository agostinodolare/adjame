import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Store,
  TicketPercent,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Administration — Mon Djassaman" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Shield, exact: false },
  { to: "/admin/commandes", label: "Commandes", icon: ShoppingBag, exact: false },
  { to: "/admin/vendeurs", label: "Vendeurs", icon: Store, exact: false },
  { to: "/admin/coursiers", label: "Coursiers", icon: Bike, exact: false },
  { to: "/admin/coupons", label: "Bons d’achat", icon: TicketPercent, exact: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user?.id ?? "");
      return {
        email: userData.user?.email ?? "",
        isAdmin: (roles ?? []).some((row) => row.role === "admin"),
      };
    },
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo variant="secondary" className="size-10 object-contain" />
            <span>
              <span className="ml-2 rounded-sm bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                Admin
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{data?.email}</span>
            <Button variant="outline" onClick={signOut}>
              <LogOut /> <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary"
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : data?.isAdmin ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-7 text-center">
            <ShieldAlert className="mx-auto size-10 text-accent" />
            <h1 className="mt-4 font-display text-xl font-bold">Accès non autorisé</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce compte n’a pas les droits d’administration. Demandez à un administrateur de vous
              ajouter, puis reconnectez-vous.
            </p>
            <Button className="mt-5" variant="outline" onClick={signOut}>
              Utiliser un autre compte
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
