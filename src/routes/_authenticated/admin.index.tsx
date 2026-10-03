import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Clock, PackageCheck, Wallet } from "lucide-react";

import {
  fetchCouriers,
  fetchOrders,
  fetchVendors,
  formatPrice,
  orderStatusLabels,
  relativeTime,
} from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Livraisons en cours — Administration Mon Djassaman" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const couriers = useQuery({ queryKey: ["couriers"], queryFn: fetchCouriers });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });

  const all = orders.data ?? [];
  const ongoing = all.filter((order) => order.status === "en_livraison");
  const toProcess = all.filter(
    (order) => order.status === "nouvelle" || order.status === "confirmee",
  );
  const delivered = all.filter((order) => order.status === "livree");
  const revenue = delivered.reduce(
    (sum, order) => sum + order.items_total - order.discount_total + order.delivery_fee,
    0,
  );
  const availableCouriers = (couriers.data ?? []).filter((c) => c.availability === "disponible");

  const courierName = (id: string | null) =>
    (couriers.data ?? []).find((c) => c.id === id)?.name ?? "Non assigné";
  const vendorName = (id: string | null) =>
    (vendors.data ?? []).find((v) => v.id === id)?.shop_name ?? "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivi des livraisons du jour et de l’activité du marché.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bike} label="Livraisons en cours" value={String(ongoing.length)} />
        <StatCard icon={Clock} label="À traiter" value={String(toProcess.length)} />
        <StatCard
          icon={Bike}
          label="Coursiers disponibles"
          value={`${availableCouriers.length}/${(couriers.data ?? []).length}`}
        />
        <StatCard icon={Wallet} label="Encaissé (livré)" value={formatPrice(revenue)} />
      </div>

      <section className="rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Livraisons en cours</h2>
          <Link
            to="/admin/commandes"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Voir toutes les commandes
          </Link>
        </div>
        {ongoing.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Aucune livraison en cours pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ongoing.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-44 flex-1">
                  <p className="font-semibold">
                    {order.reference} · {order.customer_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.commune} — {order.address ?? "adresse à confirmer"}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{courierName(order.courier_id)}</p>
                  <p className="text-muted-foreground">{vendorName(order.vendor_id)}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">
                    {formatPrice(order.items_total - order.discount_total + order.delivery_fee)}
                  </p>
                  <p className="text-muted-foreground">{relativeTime(order.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Commandes à traiter</h2>
        </div>
        {toProcess.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Tout est à jour, aucune commande en attente.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {toProcess.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <PackageCheck className="size-5 text-accent" />
                <div className="min-w-44 flex-1">
                  <p className="font-semibold">
                    {order.reference} · {order.customer_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.commune} · {orderStatusLabels[order.status]}
                  </p>
                </div>
                <p className="text-sm font-bold">
                  {formatPrice(order.items_total - order.discount_total + order.delivery_fee)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bike;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 font-display text-2xl font-extrabold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
