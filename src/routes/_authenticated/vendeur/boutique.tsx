import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ImagePlus, Loader2, Store, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

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

export const Route = createFileRoute("/_authenticated/vendeur/boutique")({
  component: BoutiquePage,
});

const vendorCategories = ["Femme", "Homme", "Enfant", "Chaussures", "Accessoires", "Téléphones", "Divers"];
const vendorImageBucket = "vendor-images";
const maxVendorImageSize = 5 * 1024 * 1024;
const allowedVendorImageTypes = ["image/jpeg", "image/png", "image/webp"];
type VendorImageField = "logo_path" | "banner_path";

function BoutiquePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    shop_name: "",
    category: "",
    phone: "",
    stall: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState<VendorImageField | null>(null);

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

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!vendorData?.id) throw new Error("ID vendeur manquant");
      const { error } = await supabase
        .from("vendors")
        .update({
          name: data.name,
          shop_name: data.shop_name,
          category: data.category,
          phone: data.phone,
          stall: data.stall,
        })
        .eq("id", vendorData.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-profile"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Votre boutique a été mise à jour");
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

  const uploadStoreImage = async (field: VendorImageField, file: File | null) => {
    if (!file || !vendorData?.id) return;
    if (!allowedVendorImageTypes.includes(file.type)) {
      toast.error("Choisissez une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > maxVendorImageSize) {
      toast.error("L’image ne doit pas dépasser 5 Mo.");
      return;
    }

    setSavingImage(field);
    let uploadedImagePath: string | null = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Session vendeur introuvable.");

      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      uploadedImagePath = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(vendorImageBucket)
        .upload(uploadedImagePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const updateValues =
        field === "logo_path"
          ? { logo_path: uploadedImagePath }
          : { banner_path: uploadedImagePath };
      const { error: updateError } = await supabase
        .from("vendors")
        .update(updateValues)
        .eq("id", vendorData.id)
        .select("id")
        .single();
      if (updateError) throw updateError;

      const previousPath = vendorData[field];
      if (previousPath) {
        const { error: removeError } = await supabase.storage
          .from(vendorImageBucket)
          .remove([previousPath]);
        if (removeError) {
          console.error("Impossible de supprimer l’ancienne image de la boutique.", removeError);
          toast.warning("Image mise à jour, mais l’ancienne version n’a pas pu être supprimée.");
        }
      }

      if (field === "logo_path") setLogoFile(null);
      else setBannerFile(null);
      await queryClient.invalidateQueries({ queryKey: ["vendor-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["public-vendor", vendorData.id] });
      toast.success(
        field === "logo_path" ? "Logo de la boutique mis à jour." : "Bannière mise à jour.",
      );
    } catch (error) {
      if (uploadedImagePath) {
        const { error: cleanupError } = await supabase.storage
          .from(vendorImageBucket)
          .remove([uploadedImagePath]);
        if (cleanupError)
          console.error(
            "Impossible de supprimer l’image après l’échec de sa mise à jour.",
            cleanupError,
          );
      }
      console.error("Impossible de mettre à jour l’image de la boutique.", error);
      toast.error("L’image n’a pas pu être enregistrée. Veuillez réessayer.");
    } finally {
      setSavingImage(null);
    }
  };

  useEffect(() => {
    if (vendorData && !isEditing) {
      setFormData({
        name: vendorData.name || "",
        shop_name: vendorData.shop_name || "",
        category: vendorData.category || "",
        phone: vendorData.phone || "",
        stall: vendorData.stall || "",
      });
    }
  }, [vendorData, isEditing]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(bannerFile);
    setBannerPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [bannerFile]);

  if (vendorLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Ma boutique</h1>
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

  const logoImageUrl =
    logoPreview ??
    (vendorData.logo_path
      ? supabase.storage.from(vendorImageBucket).getPublicUrl(vendorData.logo_path).data.publicUrl
      : null);
  const bannerImageUrl =
    bannerPreview ??
    (vendorData.banner_path
      ? supabase.storage.from(vendorImageBucket).getPublicUrl(vendorData.banner_path).data.publicUrl
      : null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Ma boutique</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les informations de votre espace vendeur
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
          <CardTitle>Informations de la boutique</CardTitle>
          <CardDescription>
            Ces informations seront visibles par les clients sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Votre nom</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Votre nom et prénom"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shop_name">Nom de la boutique</Label>
                <Input
                  id="shop_name"
                  value={formData.shop_name}
                  onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  placeholder="Nom de votre boutique"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="stall">Emplacement au marché (optionnel)</Label>
                <Input
                  id="stall"
                  value={formData.stall}
                  onChange={(e) => setFormData({ ...formData, stall: e.target.value })}
                  placeholder="Ex: Allée B - 14"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Votre nom</p>
                <p className="text-sm text-muted-foreground">{vendorData.name || "Non renseigné"}</p>
              </div>
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
                <p className="text-sm font-medium">Emplacement au marché</p>
                <p className="text-sm text-muted-foreground">{vendorData.stall || "Non renseigné"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Statut</p>
                <Badge variant={vendorData.verified ? "default" : "secondary"}>
                  {vendorData.verified ? "Vérifié ✓" : "En attente de vérification"}
                </Badge>
                {!vendorData.verified && (
                  <p className="text-xs text-muted-foreground">
                    Votre boutique sera visible par les clients une fois vérifiée par un administrateur.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images de la boutique</CardTitle>
          <CardDescription>
            Le logo et la bannière seront affichés sur votre page publique. JPG, PNG ou WebP, 5 Mo
            maximum.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="shop-logo">Logo de la boutique</Label>
            <div className="grid size-32 place-items-center overflow-hidden rounded-xl border bg-muted">
              {logoImageUrl ? (
                <img
                  src={logoImageUrl}
                  alt="Aperçu du logo de la boutique"
                  className="size-full object-cover"
                />
              ) : (
                <Store className="size-10 text-muted-foreground" />
              )}
            </div>
            <Input
              id="shop-logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setLogoFile(event.currentTarget.files?.[0] ?? null)}
              aria-describedby="shop-logo-help"
            />
            <p id="shop-logo-help" className="text-xs text-muted-foreground">
              Image carrée conseillée. Elle représentera votre boutique.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={!logoFile || savingImage !== null}
              onClick={() => void uploadStoreImage("logo_path", logoFile)}
            >
              {savingImage === "logo_path" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Enregistrer le logo
            </Button>
          </div>

          <div className="space-y-3">
            <Label htmlFor="shop-banner">Bannière de la boutique</Label>
            <div className="grid h-32 w-full place-items-center overflow-hidden rounded-xl border bg-muted">
              {bannerImageUrl ? (
                <img
                  src={bannerImageUrl}
                  alt="Aperçu de la bannière de la boutique"
                  className="size-full object-cover"
                />
              ) : (
                <ImagePlus className="size-10 text-muted-foreground" />
              )}
            </div>
            <Input
              id="shop-banner"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setBannerFile(event.currentTarget.files?.[0] ?? null)}
              aria-describedby="shop-banner-help"
            />
            <p id="shop-banner-help" className="text-xs text-muted-foreground">
              Une image horizontale est recommandée pour l’en-tête de votre page.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={!bannerFile || savingImage !== null}
              onClick={() => void uploadStoreImage("banner_path", bannerFile)}
            >
              {savingImage === "banner_path" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Enregistrer la bannière
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
