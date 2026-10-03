import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, Clock, Package, XCircle } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vendeur/commandes")({
  component: CommandesPage,
});

const orderStatuses = [
  { value: "nouvelle", label: "Nouvelle", icon: Clock },
  { value: "confirmee", label: "Confirmée", icon: CheckCircle },
  { value: "en_livraison", label: "En livraison", icon: Package },
  { value: "livree", label: "Livrée", icon: CheckCircle },
  { value: "annulee", label: "Annulée", icon: XCircle },
];

function CommandesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: vendorData } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      return vendor;
    },
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["vendor-orders", statusFilter, searchTerm],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();

      if (!vendor) return [];

      let query = supabase
        .from("orders")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      const { data: items, error: itemsError } = orders.length
        ? await supabase
            .from("order_items")
            .select("*")
            .in(
              "order_id",
              orders.map((order) => order.id),
            )
        : { data: [], error: null };
      if (itemsError) throw itemsError;

      // Filtrer par terme de recherche
      const ordersWithItems = orders.map((order) => ({
        ...order,
        items: (items ?? []).filter((item) => item.order_id === order.id),
      }));
      if (searchTerm) {
        return ordersWithItems.filter(
          (order) =>
            order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()),
        );
      }

      return ordersWithItems;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Statut de la commande mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateStatusMutation.mutateAsync({ orderId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "nouvelle":
        return <Badge variant="outline">Nouvelle</Badge>;
      case "confirmee":
        return <Badge variant="secondary">Confirmée</Badge>;
      case "en_livraison":
        return <Badge variant="default">En livraison</Badge>;
      case "livree":
        return <Badge variant="default">Livrée</Badge>;
      case "annulee":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "livree":
        return "text-green-600";
      case "annulee":
        return "text-red-600";
      default:
        return "";
    }
  };

  if (!vendorData) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-7 text-center">
        <Package className="mx-auto size-10 text-accent" />
        <h1 className="mt-4 font-display text-xl font-bold">Boutique introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n’est pas associé à une boutique.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Mes commandes</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les commandes passées à votre boutique
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par référence, client ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                {orderStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des commandes */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes</CardTitle>
          <CardDescription>{ordersData?.length || 0} commandes trouvées</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : ordersData && ordersData.length > 0 ? (
            <div className="space-y-4">
              {ordersData.map((order) => (
                <div key={order.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{order.reference}</p>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Client: {order.customer_name}
                        {order.customer_phone && ` - ${order.customer_phone}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Commande: {order.commune}
                        {order.address && `, ${order.address}`}
                      </p>
                      {order.items.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              {item.quantity} × {item.product_name} —{" "}
                              {item.line_total.toLocaleString()} FCFA
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="font-medium">
                          {(order.items_total || 0).toLocaleString()} FCFA
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Livraison: {(order.delivery_fee || 0).toLocaleString()} FCFA
                        </p>
                      </div>
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-[140px] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orderStatuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(order.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto size-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">Aucune commande trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
