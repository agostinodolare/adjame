import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Store, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vendeur/")({
  component: VendeurDashboard,
});

function VendeurDashboard() {
  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: vendor, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      
      if (error || !vendor) {
        return null;
      }
      return vendor;
    },
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["vendor-orders"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("vendor_id", vendorData?.id ?? "")
        .order("created_at", { ascending: false });
      
      if (error) {
        return [];
      }
      return orders;
    },
    enabled: !!vendorData?.id,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["vendor-stats"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      
      if (vendorError || !vendor) {
        return { totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0 };
      }
      
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("status,items_total,delivery_fee")
        .eq("vendor_id", vendor.id);
      
      if (ordersError) {
        return { totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0 };
      }
      
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === "nouvelle" || o.status === "confirmee").length;
      const completedOrders = orders.filter(o => o.status === "livree").length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.items_total || 0), 0);
      
      return { totalOrders, pendingOrders, completedOrders, totalRevenue };
    },
  });

  if (vendorLoading || ordersLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Tableau de bord</h1>
        </div>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-7 text-center">
        <Store className="mx-auto size-10 text-accent" />
        <h1 className="mt-4 font-display text-xl font-bold">Profil vendeur introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n’est pas associé à une boutique. Contactez l’administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Bienvenue, {vendorData.shop_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Catégorie: {vendorData.category}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/vendeur/boutique">Gérer ma boutique</Link>
          </Button>
          <Button asChild>
            <Link to="/vendeur/produits">Gérer mes produits</Link>
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Commandes totales</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.totalOrders || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.pendingOrders || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Livrées</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.completedOrders || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
            <Store className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.totalRevenue?.toLocaleString()} FCFA</div>
          </CardContent>
        </Card>
      </div>

      {/* Informations boutique */}
      <Card>
        <CardHeader>
          <CardTitle>Ma boutique</CardTitle>
          <CardDescription>
            Informations de votre espace vendeur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Nom de la boutique</p>
              <p className="text-sm text-muted-foreground">{vendorData.shop_name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Catégorie</p>
              <p className="text-sm text-muted-foreground">{vendorData.category}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Téléphone</p>
              <p className="text-sm text-muted-foreground">{vendorData.phone || "Non renseigné"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Emplacement</p>
              <p className="text-sm text-muted-foreground">{vendorData.stall || "Non renseigné"}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Statut</p>
            <Badge variant={vendorData.verified ? "default" : "secondary"}>
              {vendorData.verified ? "Vérifié ✓" : "En attente de vérification"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Commandes récentes */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Commandes récentes</CardTitle>
            <CardDescription>
              Les dernières commandes passées à votre boutique
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link to="/vendeur/commandes">Voir toutes les commandes</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {ordersData && ordersData.length > 0 ? (
            <div className="space-y-4">
              {ordersData.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{order.reference}</p>
                    <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{(order.items_total || 0).toLocaleString()} FCFA</p>
                    <Badge variant={order.status === "livree" ? "default" : "outline"}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune commande pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
