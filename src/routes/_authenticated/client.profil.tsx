import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { communes } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/client/profil")({
  component: ClientProfilePage,
});

const inputClass =
  "h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary";

function ClientProfilePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    commune: "Adjamé",
    address: "",
  });

  const profile = useQuery({
    queryKey: ["customer-profile"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Connexion client requise.");

      const { data, error } = await supabase
        .from("customer_profiles")
        .select("user_id, full_name, phone, commune, address")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (error) throw error;

      return {
        userId: userData.user.id,
        email: userData.user.email ?? "",
        profile: data,
      };
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      full_name: profile.data.profile?.full_name ?? "",
      phone: profile.data.profile?.phone ?? "",
      commune: profile.data.profile?.commune ?? "Adjamé",
      address: profile.data.profile?.address ?? "",
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!profile.data?.userId) throw new Error("Session client introuvable.");
      const { error } = await supabase.from("customer_profiles").upsert({
        user_id: profile.data.userId,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        commune: form.commune,
        address: form.address.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast.success("Profil mis à jour.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Mon profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos coordonnées pourront être proposées lors de vos prochains achats.
        </p>
      </div>
      {profile.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement du profil…</p>
      ) : profile.isError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-background p-5 text-sm text-destructive"
        >
          Impossible de charger votre profil. Veuillez réessayer.
        </p>
      ) : (
        <form
          className="space-y-4 rounded-lg border border-border bg-background p-5"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div>
            <label htmlFor="client-email" className="mb-1.5 block text-sm font-semibold">
              Adresse e-mail
            </label>
            <input
              id="client-email"
              className={inputClass}
              value={profile.data?.email ?? ""}
              disabled
            />
          </div>
          <div>
            <label htmlFor="client-name" className="mb-1.5 block text-sm font-semibold">
              Nom et prénom
            </label>
            <input
              id="client-name"
              className={inputClass}
              required
              minLength={2}
              maxLength={80}
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="client-phone" className="mb-1.5 block text-sm font-semibold">
              Téléphone (WhatsApp)
            </label>
            <input
              id="client-phone"
              className={inputClass}
              required
              minLength={8}
              maxLength={30}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="client-commune" className="mb-1.5 block text-sm font-semibold">
              Commune habituelle
            </label>
            <select
              id="client-commune"
              className={inputClass}
              value={form.commune}
              onChange={(event) => setForm({ ...form, commune: event.target.value })}
            >
              {communes.map((commune) => (
                <option key={commune} value={commune}>
                  {commune}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="client-address" className="mb-1.5 block text-sm font-semibold">
              Quartier ou repère
            </label>
            <input
              id="client-address"
              className={inputClass}
              maxLength={200}
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer mon profil"}
          </Button>
        </form>
      )}
    </div>
  );
}
