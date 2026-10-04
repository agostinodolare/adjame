import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { courierAvailabilities, fetchCouriers, fetchOrders } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/coursiers")({
  head: () => ({
    meta: [
      { title: "Coursiers — Administration Mon Djassaman" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CouriersPage,
});

const inputClass =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary";

function getCourierRatingSummary(
  reviews: { courier_id: string; rating: number }[],
  courierId: string,
) {
  const ratings = reviews
    .filter((review) => review.courier_id === courierId)
    .map((review) => review.rating);
  if (!ratings.length) return "Aucune évaluation";
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return `${average.toFixed(1)} / 5 (${ratings.length} avis)`;
}

function CouriersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", zone: "" });
  const [error, setError] = useState<string | null>(null);

  const couriers = useQuery({ queryKey: ["couriers"], queryFn: fetchCouriers });
  const orders = useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
  const reviews = useQuery({
    queryKey: ["courier-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courier_reviews").select("courier_id, rating");
      if (error) throw error;
      return data;
    },
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["couriers"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error: insertError } = await supabase.from("couriers").insert({
        name: form.name,
        phone: form.phone || null,
        zone: form.zone || "Abidjan",
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      setForm({ name: "", phone: "", zone: "" });
      setError(null);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: { availability?: string; zone?: string; name?: string; phone?: string | null };
    }) => {
      const { error: updateError } = await supabase.from("couriers").update(values).eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from("couriers").delete().eq("id", id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const activeCount = (courierId: string) =>
    (orders.data ?? []).filter(
      (order) => order.courier_id === courierId && !["livree", "annulee"].includes(order.status),
    ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Coursiers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez l’équipe de livraison et sa disponibilité par zone.
        </p>
      </div>
      {reviews.isError && (
        <p role="alert" className="text-sm text-destructive">
          Impossible de charger les évaluations des livreurs.
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-background p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          className={inputClass}
          required
          placeholder="Nom du coursier"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Téléphone"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Zone couverte"
          value={form.zone}
          onChange={(event) => setForm({ ...form, zone: event.target.value })}
        />
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
          Indiquez les communes séparées par « / », par exemple Adjamé / Plateau. « Abidjan » couvre
          les communes d’Abidjan, mais pas l’intérieur du pays.
        </p>
        <Button type="submit" disabled={create.isPending}>
          <Plus /> Ajouter
        </Button>
        {error && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-4">{error}</p>}
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(couriers.data ?? []).map((courier) => (
          <div key={courier.id} className="rounded-lg border border-border bg-background p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold">{courier.name}</p>
                <p className="text-sm text-muted-foreground">{courier.phone ?? "—"}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Supprimer ${courier.name}`}
                onClick={() => remove.mutate(courier.id)}
              >
                <Trash2 />
              </Button>
            </div>
            <p className="mt-3 text-sm">
              Zone : <strong>{courier.zone}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {activeCount(courier.id)} livraison(s) en cours
            </p>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber-500 text-amber-500" />
              {getCourierRatingSummary(reviews.data ?? [], courier.id)}
            </p>
            <select
              className={`${inputClass} mt-4`}
              value={courier.availability}
              onChange={(event) =>
                update.mutate({ id: courier.id, values: { availability: event.target.value } })
              }
            >
              {courierAvailabilities.map((availability) => (
                <option key={availability} value={availability}>
                  {availability}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
