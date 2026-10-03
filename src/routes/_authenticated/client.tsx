import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  ClipboardList,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  TicketPercent,
  UserRound,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({
    meta: [{ title: "Mon espace client — Mon Djassaman" }, { name: "robots", content: "noindex" }],
  }),
  component: ClientLayout,
});

const navItems = [
  { to: "/client", label: "Votre compte", icon: LayoutDashboard, exact: true },
  { to: "/client/profil", label: "Mon profil", icon: UserRound, exact: false },
  { to: "/client/commandes", label: "Mes commandes", icon: ClipboardList, exact: false },
] as const;

function ClientLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["client-me"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Connexion client requise.");

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (rolesError) throw rolesError;

      return {
        email: userData.user.email ?? "",
        isCustomer: (roles ?? []).some((row) => row.role === "client"),
      };
    },
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo variant="secondary" className="size-10 object-contain" />
            <span>
              <span className="ml-2 rounded-sm bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                Client
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
        <nav
          className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 pb-2 sm:px-6 lg:px-8"
          aria-label="Navigation client"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-background"
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          ))}
          <Link
            to="/"
            search={{ inbox: "open" }}
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-background"
          >
            <Mail className="size-4" /> Ma boîte de réception
          </Link>
          <Link
            to="/"
            search={{ view: "favorites" }}
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-background"
          >
            <Heart className="size-4" /> Favoris
          </Link>
          <Link
            to="/"
            search={{ coupons: "open" }}
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-background"
          >
            <TicketPercent className="size-4" /> Bons d’achat
          </Link>
          <Link
            to="/parametres"
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-background"
          >
            <Settings className="size-4" /> Paramètres
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : isError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-background p-5 text-sm text-destructive"
          >
            Impossible de vérifier l’accès à votre espace client. Veuillez réessayer.
          </p>
        ) : data?.isCustomer ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-7 text-center">
            <UserRound className="mx-auto size-10 text-accent" />
            <h1 className="mt-4 font-display text-xl font-bold">Espace client indisponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connectez-vous avec un compte client ou créez-en un pour retrouver vos achats.
            </p>
            <Button className="mt-5" variant="outline" onClick={() => navigate({ to: "/auth" })}>
              Retour à la connexion
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
