import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Clock, MapPin, Package, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/coursier/")({
  component: CoursierDashboard,
});

function CoursierDashboard() {
  const { data: courierData, isLoading: courierLoading } = useQuery({
    queryKey: ["courier-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: courier, error } = await supabase
        .from("couriers")
        .select("*")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      
      if (error || !courier) {
        return null;
      }
      return courier;
    },
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["courier-orders"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: courier } = await supabase
        .from("couriers")
        .select("id")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      
      if (!courier) return [];
      
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("courier_id", courier.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        return [];
      }
      return orders;
    },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["courier-stats"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: courier } = await supabase
        .from("couriers")
        .select("id")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      
      if (!courier) {
        return { totalDeliveries: 0, pendingDeliveries: 0, completedDeliveries: 0, totalEarnings: 0 };
      }
      
      const { data: orders, error } = await supabase
        .from("orders")
        .select("status,delivery_fee")
        .eq("courier_id", courier.id);
      
      if (error) {
        return { totalDeliveries: 0, pendingDeliveries: 0, completedDeliveries: 0, totalEarnings: 0 };
      }
      
      const totalDeliveries = orders.length;
      const pendingDeliveries = orders.filter(o => o.status === "confirmee" || o.status === "en_livraison").length;
      const completedDeliveries = orders.filter(o => o.status === "livree").length;
      const totalEarnings = orders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
      
      return { totalDeliveries, pendingDeliveries, completedDeliveries, totalEarnings };
    },
  });

  if (courierLoading || ordersLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Tableau de bord</h1>
        </div>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!courierData) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-7 text-center">
        <Bike className="mx-auto size-10 text-accent" />
        <h1 className="mt-4 font-display text-xl font-bold">Profil livreur introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n’est pas associé à un profil livreur. Contactez l’administrateur.
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
            Bonjour, {courierData.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Zone: {courierData.zone}
          </p>
        </div>
        <Button asChild>
          <a href="https://wa.me/" target="_blank">
            Contact support
          </a>
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Livraisons totales</CardTitle>
            <Bike className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.totalDeliveries || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.pendingDeliveries || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Terminées</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.completedDeliveries || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Gains totaux</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.totalEarnings?.toLocaleString()} FCFA</div>
          </CardContent>
        </Card>
      </div>

      {/* Informations profil */}
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
          <CardDescription>
            Informations de votre profil livreur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Nom</p>
              <p className="text-sm text-muted-foreground">{courierData.name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Téléphone</p>
              <p className="text-sm text-muted-foreground">{courierData.phone || "Non renseigné"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Zone de livraison</p>
              <p className="text-sm text-muted-foreground">{courierData.zone}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Disponibilité</p>
              <Badge variant={courierData.availability === "disponible" ? "default" : "secondary"}>
                {courierData.availability}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Livraisons récentes */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Livraisons récentes</CardTitle>
            <CardDescription>
              Vos dernières livraisons attribuées
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link to="/coursier/livraisons">Voir toutes les livraisons</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {ordersData && ordersData.length > 0 ? (
            <div className="space-y-4">
              {ordersData.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{order.reference}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <MapPin className="inline size-3 mr-1" />
                      {order.commune} - {order.customer_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{(order.delivery_fee || 0).toLocaleString()} FCFA</p>
                    <Badge variant={order.status === "livree" ? "default" : "outline"} className="mt-1">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune livraison attribuée pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
