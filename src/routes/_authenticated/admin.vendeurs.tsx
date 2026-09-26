import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchVendors, vendorCategories, vendorStatuses } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/vendeurs")({
  head: () => ({
    meta: [
      { title: "Vendeurs — Administration MarchéGo" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VendorsPage,
});

const inputClass =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary";

function VendorsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    shop_name: "",
    category: "Femme",
    phone: "",
    stall: "",
  });
  const [error, setError] = useState<string | null>(null);

  const vendors = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vendors"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error: insertError } = await supabase.from("vendors").insert({
        name: form.name,
        shop_name: form.shop_name,
        category: form.category,
        phone: form.phone || null,
        stall: form.stall || null,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      setForm({ name: "", shop_name: "", category: "Femme", phone: "", stall: "" });
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
      values: { status?: string; verified?: boolean; category?: string };
    }) => {
      const { error: updateError } = await supabase.from("vendors").update(values).eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from("vendors").delete().eq("id", id);
      if (deleteError) throw deleteError;
    },
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Vendeurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Répertoriez les boutiques d’Adjamé et gérez leur statut.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid gap-3 rounded-lg border border-border bg-background p-5 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input
          className={inputClass}
          required
          placeholder="Nom du vendeur"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          className={inputClass}
          required
          placeholder="Nom de la boutique"
          value={form.shop_name}
          onChange={(event) => setForm({ ...form, shop_name: event.target.value })}
        />
        <select
          className={inputClass}
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value })}
        >
          {vendorCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          className={inputClass}
          placeholder="Téléphone"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Emplacement (allée)"
          value={form.stall}
          onChange={(event) => setForm({ ...form, stall: event.target.value })}
        />
        <Button type="submit" disabled={create.isPending}>
          <Plus /> Ajouter
        </Button>
        {error && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-6">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border bg-secondary text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Boutique</th>
              <th className="px-4 py-3 font-semibold">Catégorie</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Vérifié</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(vendors.data ?? []).map((vendor) => (
              <tr key={vendor.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{vendor.shop_name}</p>
                  <p className="text-xs text-muted-foreground">{vendor.name}</p>
                </td>
                <td className="px-4 py-3">{vendor.category}</td>
                <td className="px-4 py-3">
                  <p>{vendor.phone ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{vendor.stall ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant={vendor.verified ? "default" : "outline"}
                    onClick={() =>
                      update.mutate({ id: vendor.id, values: { verified: !vendor.verified } })
                    }
                  >
                    <BadgeCheck /> {vendor.verified ? "Vérifié" : "À vérifier"}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={inputClass}
                    value={vendor.status}
                    onChange={(event) =>
                      update.mutate({ id: vendor.id, values: { status: event.target.value } })
                    }
                  >
                    {vendorStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Supprimer ${vendor.shop_name}`}
                    onClick={() => remove.mutate(vendor.id)}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
