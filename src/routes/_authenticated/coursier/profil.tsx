import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bike, Check, Loader2, MapPin, Phone, User, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/coursier/profil")({
  component: ProfilPage,
});

const availabilityOptions = [
  { value: "disponible", label: "Disponible" },
  { value: "en livraison", label: "En livraison" },
  { value: "hors ligne", label: "Hors ligne" },
  { value: "en pause", label: "En pause" },
];

const zoneOptions = [
  "Adjamé",
  "Plateau",
  "Cocody",
  "Yopougon",
  "Abobo",
  "Marcory",
  "Treichville",
  "Koumassi",
  "Port-Bouët",
  "Anyama",
  "Bingerville",
  "Songon",
  "Intérieur du pays",
];

function ProfilPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    zone: "",
    availability: "",
  });
  const [isLoading, setIsLoading] = useState(false);

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

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!courierData?.id) throw new Error("ID coursier manquant");
      const { error } = await supabase
        .from("couriers")
        .update({
          name: data.name,
          phone: data.phone,
          zone: data.zone,
          availability: data.availability,
        })
        .eq("id", courierData.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-profile"] });
      queryClient.invalidateQueries({ queryKey: ["couriers"] });
      toast.success("Votre profil a été mis à jour");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateMutation.mutateAsync(formData);
    } catch {
      // Error handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  // Initialiser le formulaire avec les données du livreur
  if (courierData && !isEditing) {
    setFormData({
      name: courierData.name || "",
      phone: courierData.phone || "",
      zone: courierData.zone || "",
      availability: courierData.availability || "",
    });
  }

  if (courierLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Mon profil</h1>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Mon profil</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos informations personnelles
          </p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="size-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Check className="size-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>Modifier</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du profil</CardTitle>
          <CardDescription>
            Ces informations seront utilisées pour vous identifier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Votre nom et prénom"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone (WhatsApp)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Votre numéro de téléphone"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zone">Zone de livraison</Label>
                <Select
                  value={formData.zone}
                  onValueChange={(value) => setFormData({ ...formData, zone: value })}
                >
                  <SelectTrigger id="zone">
                    <SelectValue placeholder="Sélectionnez une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneOptions.map((zone) => (
                      <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="availability">Disponibilité</Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value) => setFormData({ ...formData, availability: value })}
                >
                  <SelectTrigger id="availability">
                    <SelectValue placeholder="Sélectionnez un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {availabilityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Nom complet</p>
                <p className="text-sm text-muted-foreground">{courierData.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Téléphone</p>
                <p className="text-sm text-muted-foreground">{courierData.phone || "Non renseigné"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  <MapPin className="inline size-4 mr-2" />
                  Zone de livraison
                </p>
                <p className="text-sm text-muted-foreground">{courierData.zone}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  <User className="inline size-4 mr-2" />
                  Disponibilité
                </p>
                <Badge variant={courierData.availability === "disponible" ? "default" : "secondary"}>
                  {courierData.availability}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
          <CardDescription>
            Votre activité sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Date d'inscription</p>
              <p className="text-sm text-muted-foreground">
                {new Date(courierData.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
