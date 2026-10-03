import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Shield, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { assignManagedRole, listManagedUsers, removeManagedRole } from "@/lib/users.functions";
import type { AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  head: () => ({
    meta: [
      { title: "Utilisateurs — Administration Mon Djassaman" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

const inputClass =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary";

const roles: AppRole[] = ["admin", "staff", "vendeur", "livreur", "client"];
const roleLabels: Record<AppRole, string> = {
  admin: "Administrateur",
  staff: "Équipe",
  vendeur: "Vendeur",
  livreur: "Livreur",
  client: "Client",
};

function UsersPage() {
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("vendeur");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Récupérer tous les utilisateurs avec leurs rôles
  const {
    data: users,
    isLoading,
    isError,
    error: usersError,
  } = useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Session administrateur introuvable.");
      return listManagedUsers({ data: { accessToken } });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
  };

  // Filtrer les utilisateurs selon la recherche
  const filteredUsers = users?.filter((user) =>
    user.email.toLowerCase().includes(searchEmail.toLowerCase()),
  );

  // Attribuer un rôle à un utilisateur
  const assignRole = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("Aucun utilisateur sélectionné");
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Session administrateur introuvable.");
      await assignManagedRole({
        data: { accessToken, userId: selectedUser.id, role: selectedRole },
      });
    },
    onSuccess: () => {
      setSuccess(`Rôle "${roleLabels[selectedRole]}" attribué à ${selectedUser?.email}`);
      setSelectedUser(null);
      setSelectedRole("vendeur");
      invalidate();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => setError(err.message),
  });

  // Supprimer un rôle d'un utilisateur
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Session administrateur introuvable.");
      await removeManagedRole({
        data: { accessToken, userId, role },
      });
    },
    onSuccess: () => {
      setSuccess("Rôle supprimé");
      invalidate();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les comptes et attribuez les rôles (admin, équipe, vendeur, livreur).
        </p>
      </div>

      {/* Formulaire d'attribution de rôle */}
      <div className="rounded-lg border border-border bg-background p-5 space-y-4">
        <h2 className="font-semibold">Attribuer un rôle</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Utilisateur</label>
            <select
              className={inputClass}
              value={selectedUser?.id ?? ""}
              onChange={(e) => {
                const user = users?.find((u) => u.id === e.target.value);
                setSelectedUser(user ?? null);
              }}
            >
              <option value="">Sélectionnez un utilisateur</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Rôle</label>
            <select
              className={inputClass}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AppRole)}
              disabled={!selectedUser}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => assignRole.mutate()}
          disabled={!selectedUser || assignRole.isPending}
        >
          <Plus /> Attribuer le rôle
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-mint font-medium">{success}</p>}
      </div>

      {/* Recherche */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold">Rechercher</label>
        <input
          type="email"
          className={inputClass}
          placeholder="Rechercher par e-mail..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
        />
      </div>

      {/* Liste des utilisateurs */}
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border bg-secondary text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="px-4 py-3 font-semibold">Rôles</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Chargement...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-destructive">
                  Impossible de charger les utilisateurs : {usersError.message}
                </td>
              </tr>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {roleLabels[role]}
                            <button
                              type="button"
                              onClick={() => removeRole.mutate({ userId: user.id, role })}
                              className="hover:text-destructive transition"
                              aria-label={`Retirer le rôle ${roleLabels[role]}`}
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Aucun rôle</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedUser(user);
                        // Si l'utilisateur a déjà des rôles, sélectionner le premier
                        if (user.roles.length > 0 && user.roles[0]) {
                          setSelectedRole(user.roles[0]);
                        }
                      }}
                      aria-label={`Modifier les rôles de ${user.email}`}
                    >
                      <Shield className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-border/50 bg-secondary/50 p-4 text-sm text-muted-foreground">
        <p>
          <strong>Conseil :</strong> Les utilisateurs sans rôle ne peuvent pas accéder à la
          plateforme. Attribuez-leur un rôle pour leur permettre de se connecter.
        </p>
      </div>
    </div>
  );
}
