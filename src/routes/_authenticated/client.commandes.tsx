import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PackageCheck, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/client/commandes")({
  component: ClientOrdersPage,
});

const statusLabels: Record<string, string> = {
  nouvelle: "Nouvelle",
  confirmee: "Confirmée",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

function ClientOrdersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["client-orders"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Connexion client requise.");
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "id, reference, status, commune, items_total, discount_total, delivery_fee, created_at, courier_id",
        )
        .eq("customer_id", authData.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!orders?.length) return [];

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("id, order_id, product_id, product_name, quantity, unit_price, line_total")
        .in(
          "order_id",
          orders.map((order) => order.id),
        );
      if (itemsError) throw itemsError;

      const itemIds = (items ?? []).map((item) => item.id);
      const { data: productReviews, error: productReviewsError } = itemIds.length
        ? await supabase
            .from("product_reviews")
            .select("order_item_id, rating")
            .in("order_item_id", itemIds)
        : { data: [], error: null };
      if (productReviewsError) throw productReviewsError;

      const orderIds = orders.map((order) => order.id);
      const { data: courierReviews, error: courierReviewsError } = await supabase
        .from("courier_reviews")
        .select("order_id, rating")
        .in("order_id", orderIds);
      if (courierReviewsError) throw courierReviewsError;

      return orders.map((order) => ({
        ...order,
        items: (items ?? [])
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            rating:
              productReviews?.find((review) => review.order_item_id === item.id)?.rating ?? null,
          })),
        courierRating:
          courierReviews?.find((review) => review.order_id === order.id)?.rating ?? null,
      }));
    },
  });

  const submitRating = useMutation({
    mutationFn: async (
      input:
        | { kind: "product"; orderItemId: string; productId: string; rating: number }
        | { kind: "courier"; orderId: string; courierId: string; rating: number },
    ) => {
      const result =
        input.kind === "product"
          ? await supabase.from("product_reviews").insert({
              order_item_id: input.orderItemId,
              product_id: input.productId,
              rating: input.rating,
            })
          : await supabase.from("courier_reviews").insert({
              order_id: input.orderId,
              courier_id: input.courierId,
              rating: input.rating,
            });
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["public-products"] }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Mes commandes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Retrouvez vos achats, leur contenu et leur état de livraison.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des commandes…</p>
      ) : isError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-background p-5 text-sm text-destructive"
        >
          Impossible de charger votre historique. Veuillez réessayer.
        </p>
      ) : data?.length ? (
        <div className="space-y-4">
          {data.map((order) => (
            <article key={order.id} className="rounded-lg border border-border bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{order.reference}</h2>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(order.created_at))}{" "}
                    · {order.commune}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">
                  <PackageCheck className="size-4 text-primary" />
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>
              <ul className="mt-4 space-y-4 border-t border-border pt-4">
                {order.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>
                      <span className="font-semibold">
                        {new Intl.NumberFormat("fr-FR").format(item.line_total)} F
                      </span>
                    </div>
                    {order.status === "livree" && item.product_id && (
                      <RatingControl
                        label={`Notez le produit ${item.product_name}`}
                        value={item.rating}
                        disabled={submitRating.isPending || item.rating !== null}
                        onRate={(rating) =>
                          submitRating.mutate({
                            kind: "product",
                            orderItemId: item.id,
                            productId: item.product_id!,
                            rating,
                          })
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
              {order.status === "livree" && order.courier_id && (
                <div className="mt-4 border-t border-border pt-4">
                  <RatingControl
                    label="Notez l’efficacité du livreur"
                    value={order.courierRating}
                    disabled={submitRating.isPending || order.courierRating !== null}
                    onRate={(rating) =>
                      submitRating.mutate({
                        kind: "courier",
                        orderId: order.id,
                        courierId: order.courier_id!,
                        rating,
                      })
                    }
                  />
                </div>
              )}
              {submitRating.isError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {submitRating.error.message.includes("duplicate key")
                    ? "Cette note a déjà été enregistrée."
                    : "La note n’a pas pu être enregistrée. Vérifiez votre connexion et réessayez."}
                </p>
              )}
              <div className="mt-4 flex justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  Articles {new Intl.NumberFormat("fr-FR").format(order.items_total)} F
                  {order.discount_total > 0 &&
                    ` · Réduction -${new Intl.NumberFormat("fr-FR").format(order.discount_total)} F`}
                  {" · Livraison "}
                  {new Intl.NumberFormat("fr-FR").format(order.delivery_fee)} F
                </span>
                <strong>
                  {new Intl.NumberFormat("fr-FR").format(
                    order.items_total - order.discount_total + order.delivery_fee,
                  )}{" "}
                  F
                </strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background p-8 text-center">
          <PackageCheck className="mx-auto size-10 text-primary" />
          <h2 className="mt-3 font-display text-xl font-bold">Aucun achat pour le moment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos commandes liées à votre compte apparaîtront ici.
          </p>
        </div>
      )}
    </div>
  );
}

function RatingControl({
  label,
  value,
  disabled,
  onRate,
}: {
  label: string;
  value: number | null;
  disabled: boolean;
  onRate: (rating: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            aria-label={`${rating} sur 5`}
            aria-pressed={value === rating}
            disabled={disabled || value !== null}
            onClick={() => onRate(rating)}
            className="rounded p-1 text-amber-500 transition hover:scale-110 disabled:cursor-default disabled:opacity-80"
          >
            <Star
              className="size-5"
              fill={value !== null && rating <= value ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      {value !== null && (
        <span className="text-xs text-muted-foreground">Merci pour votre avis.</span>
      )}
    </div>
  );
}
