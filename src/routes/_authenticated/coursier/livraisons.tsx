import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, CheckCircle, Clock, MapPin, Package, XCircle } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/coursier/livraisons")({
  component: LivraisonsPage,
});

const orderStatuses = [
  { value: "confirmee", label: "À récupérer", icon: Clock },
  { value: "en_livraison", label: "En livraison", icon: Package },
  { value: "livree", label: "Livrée", icon: CheckCircle },
  { value: "annulee", label: "Annulée", icon: XCircle },
];

function LivraisonsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: courierData } = useQuery({
    queryKey: ["courier-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: courier } = await supabase
        .from("couriers")
        .select("id,zone")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      return courier;
    },
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["courier-orders", statusFilter, searchTerm],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: courier } = await supabase
        .from("couriers")
        .select("id")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      
      if (!courier) return [];
      
      let query = supabase
        .from("orders")
        .select("*")
        .eq("courier_id", courier.id)
        .order("created_at", { ascending: false });
      
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
      
      const { data: orders, error } = await query;
      
      if (error) throw error;
      
      // Filtrer par terme de recherche
      if (searchTerm) {
        return orders.filter(order => 
          order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.commune.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return orders;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-orders"] });
      toast.success("Statut de la livraison mis à jour");
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
      case "confirmee":
        return <Badge variant="secondary">À récupérer</Badge>;
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

  if (!courierData) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-7 text-center">
        <Bike className="mx-auto size-10 text-accent" />
        <h1 className="mt-4 font-display text-xl font-bold">Profil livreur introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n’est pas associé à un profil livreur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Mes livraisons</h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos livraisons dans la zone {courierData.zone}
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par référence, client ou commune..."
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

      {/* Liste des livraisons */}
      <Card>
        <CardHeader>
          <CardTitle>Livraisons</CardTitle>
          <CardDescription>
            {ordersData?.length || 0} livraisons trouvées
          </CardDescription>
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
                        <MapPin className="inline size-3 mr-1" />
                        {order.commune} - {order.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Client: {order.customer_name}
                        {order.customer_phone && ` - ${order.customer_phone}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vendeur: {order.vendor_id ? "Boutique associée" : "Non spécifié"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="font-medium">
                          {(order.delivery_fee || 0).toLocaleString()} FCFA
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Livraison
                        </p>
                      </div>
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value)}
                        disabled={updateStatusMutation.isPending || order.status === "annulee"}
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
                    {new Date(order.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto size-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Aucune livraison trouvée
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
