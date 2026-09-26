import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCouriers,
  fetchOrders,
  fetchVendors,
  formatDateTime,
  formatPrice,
  orderStatusLabels,
  orderStatuses,
} from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/commandes")({
  head: () => ({
    meta: [
      { title: "Commandes — Administration MarchéGo" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const selectClass =
  "h-10 rounded-md border border-input bg-secondary px-2 text-sm outline-none focus:border-primary";

function OrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("tout");

  const orders = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const couriers = useQuery({ queryKey: ["couriers"], queryFn: fetchCouriers });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });

  const update = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: { status?: string; courier_id?: string | null };
    }) => {
      const { error } = await supabase.from("orders").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const rows = (orders.data ?? []).filter((order) => filter === "tout" || order.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Commandes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assignez un coursier et faites avancer chaque commande.
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["tout", ...orderStatuses].map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              onClick={() => setFilter(status)}
              className="shrink-0"
            >
              {status === "tout" ? "Toutes" : orderStatusLabels[status]}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-secondary text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Référence</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Vendeur</th>
              <th className="px-4 py-3 font-semibold">Montant</th>
              <th className="px-4 py-3 font-semibold">Coursier</th>
              <th className="px-4 py-3 font-semibold">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{order.reference}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.commune} · {order.customer_phone ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {(vendors.data ?? []).find((v) => v.id === order.vendor_id)?.shop_name ?? "—"}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {formatPrice(order.items_total + order.delivery_fee)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    dont {formatPrice(order.delivery_fee)} de livraison
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={selectClass}
                    value={order.courier_id ?? ""}
                    onChange={(event) =>
                      update.mutate({
                        id: order.id,
                        values: { courier_id: event.target.value || null },
                      })
                    }
                  >
                    <option value="">Non assigné</option>
                    {(couriers.data ?? []).map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={selectClass}
                    value={order.status}
                    onChange={(event) =>
                      update.mutate({ id: order.id, values: { status: event.target.value } })
                    }
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {orderStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune commande dans cette vue.
          </p>
        )}
      </div>
    </div>
  );
}
