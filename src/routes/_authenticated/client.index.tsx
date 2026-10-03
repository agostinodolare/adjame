import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, PackageCheck, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/client/")({
  component: ClientDashboard,
});

function ClientDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["client-orders-summary"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Connexion client requise.");
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, status, items_total, delivery_fee, created_at")
        .eq("customer_id", authData.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeOrders = (data ?? []).filter(
    (order) => !["livree", "annulee"].includes(order.status),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-primary p-6 text-primary-foreground sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-primary-foreground/75">
          Bienvenue sur Mon Djassaman
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">
          Le marché d’Adjamé, à portée de main.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80">
          Découvrez les trouvailles des vendeurs, commandez simplement et suivez vos achats depuis
          votre espace.
        </p>
        <Button asChild variant="secondary" className="mt-5">
          <Link to="/">
            <ShoppingBag /> Découvrir les produits
          </Link>
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-secondary text-primary">
              <ClipboardList className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Commandes passées</p>
              <p className="font-display text-2xl font-bold">
                {isLoading ? "…" : isError ? "—" : (data?.length ?? 0)}
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-lg border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-secondary text-primary">
              <PackageCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">En cours</p>
              <p className="font-display text-2xl font-bold">
                {isLoading ? "…" : isError ? "—" : activeOrders.length}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Vos achats</h2>
            <p className="text-sm text-muted-foreground">
              Consultez l’état de vos commandes récentes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/client/commandes">
              Tout l’historique <ArrowRight />
            </Link>
          </Button>
        </div>
        {isError ? (
          <p role="alert" className="mt-5 text-sm text-destructive">
            Impossible de charger vos commandes pour le moment.
          </p>
        ) : isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">Chargement des commandes…</p>
        ) : data?.length ? (
          <ul className="mt-5 divide-y divide-border">
            {data.slice(0, 3).map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{order.reference}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                      new Date(order.created_at),
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
                  {statusLabel(order.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-md bg-secondary/60 p-5 text-center">
            <p className="font-semibold">Vous n’avez pas encore de commande.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Parcourez les produits et faites votre première découverte.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    nouvelle: "Nouvelle",
    confirmee: "Confirmée",
    en_livraison: "En livraison",
    livree: "Livrée",
    annulee: "Annulée",
  };
  return labels[status] ?? status;
}
