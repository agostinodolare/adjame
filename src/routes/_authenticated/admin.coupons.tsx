import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({
    meta: [
      { title: "Bons d’achat — Administration Mon Djassaman" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CouponsPage,
});

type Coupon = Tables<"coupons">;
type DiscountType = "percentage" | "fixed";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary";

function CouponsPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const coupons = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Session administrateur introuvable.");
      const { error } = await supabase.from("coupons").insert({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: authData.user.id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setCode("");
      setDiscountValue("");
      setExpiresAt("");
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      await queryClient.invalidateQueries({ queryKey: ["available-coupons"] });
    },
    onError: (error: Error) => {
      setErrorMessage(
        error.message.includes("duplicate key")
          ? "Ce code existe déjà. Choisissez-en un autre."
          : error.message,
      );
    },
  });

  const toggleCoupon = useMutation({
    mutationFn: async (coupon: Coupon) => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      await queryClient.invalidateQueries({ queryKey: ["available-coupons"] });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    createCoupon.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Bons d’achat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Créez des codes promo utilisables une fois par client sur le montant des articles.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-4 rounded-lg border border-border bg-background p-5 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="space-y-2">
          <Label htmlFor="coupon-code">Code</Label>
          <Input
            id="coupon-code"
            className={inputClass}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s+/g, ""))}
            minLength={3}
            maxLength={40}
            pattern="[A-Z0-9_-]{3,40}"
            required
            placeholder="BIENVENUE10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coupon-type">Type de réduction</Label>
          <select
            id="coupon-type"
            className={inputClass}
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as DiscountType)}
          >
            <option value="percentage">Pourcentage</option>
            <option value="fixed">Montant fixe (FCFA)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="coupon-value">
            Valeur {discountType === "percentage" ? "(%)" : "(FCFA)"}
          </Label>
          <Input
            id="coupon-value"
            className={inputClass}
            type="number"
            min="1"
            max={discountType === "percentage" ? "100" : undefined}
            step="1"
            value={discountValue}
            onChange={(event) => setDiscountValue(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coupon-expiry">Date d’expiration (facultative)</Label>
          <Input
            id="coupon-expiry"
            className={inputClass}
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="h-10 w-full" disabled={createCoupon.isPending}>
            {createCoupon.isPending ? "Création…" : "Créer le code"}
          </Button>
        </div>
        {errorMessage && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-5">
            {errorMessage}
          </p>
        )}
      </form>

      <section className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-secondary text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Réduction</th>
              <th className="px-4 py-3 font-semibold">Expiration</th>
              <th className="px-4 py-3 font-semibold">État</th>
              <th className="px-4 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coupons.data?.map((coupon) => (
              <tr key={coupon.id}>
                <td className="px-4 py-3 font-bold">{coupon.code}</td>
                <td className="px-4 py-3">
                  {coupon.discount_type === "percentage"
                    ? `${coupon.discount_value}%`
                    : `${new Intl.NumberFormat("fr-FR").format(coupon.discount_value)} F`}
                </td>
                <td className="px-4 py-3">
                  {coupon.expires_at
                    ? new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(coupon.expires_at))
                    : "Sans expiration"}
                </td>
                <td className="px-4 py-3">{coupon.is_active ? "Actif" : "Désactivé"}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={toggleCoupon.isPending}
                    onClick={() => toggleCoupon.mutate(coupon)}
                  >
                    {coupon.is_active ? "Désactiver" : "Activer"}
                  </Button>
                </td>
              </tr>
            ))}
            {coupons.isLoading && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  Chargement des bons d’achat…
                </td>
              </tr>
            )}
            {coupons.isError && (
              <tr>
                <td className="px-4 py-6 text-center text-destructive" colSpan={5}>
                  Impossible de charger les bons d’achat.
                </td>
              </tr>
            )}
            {!coupons.isLoading && !coupons.isError && coupons.data?.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  Aucun code promo créé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
