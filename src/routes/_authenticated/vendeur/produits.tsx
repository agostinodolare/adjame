import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Loader2, PackagePlus, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categorySubcategories } from "@/lib/catalog-categories";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/vendeur/produits")({
  component: ProduitsPage,
});

const productCategories = [
  "Supermarché",
  "Maison & Bureau",
  "Téléphonie & Tablettes",
  "Electronique",
  "Beauté & Hygiène",
  "Produits pour bébés",
  "Agriculture & Élevage",
  "Informatique",
  "Mode Femme",
  "Mode Homme",
  "Jeux vidéos & Consoles",
  "Articles de sport",
  "Jeux & Jouets",
  "Voiture",
  "Femme",
  "Homme",
  "Enfant",
  "Chaussures",
  "Accessoires",
  "Téléphones",
  "Divers",
];
const imageBucket = "product-images";
const maxImageSize = 6 * 1024 * 1024;
const maxAdditionalImages = 5;

type Product = Tables<"products">;
type ProductForm = {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: string;
  stock: string;
  is_active: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  category: "Divers",
  subcategory: "",
  price: "",
  stock: "0",
  is_active: true,
};

function productImageUrl(path: string | null) {
  return path ? supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl : null;
}

function ProduitsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [retainedAdditionalImagePaths, setRetainedAdditionalImagePaths] = useState<string[]>([]);

  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorIsError,
    error: vendorError,
    refetch: refetchVendor,
  } = useQuery({
    queryKey: ["vendor-products-owner"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Session vendeur introuvable.");

      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const {
    data: products = [],
    isLoading: productsLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      if (!vendor?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  useEffect(() => {
    const previewUrls = additionalImageFiles.map((file) => URL.createObjectURL(file));
    setAdditionalImagePreviews(previewUrls);
    return () => previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, [additionalImageFiles]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!vendor?.id) throw new Error("Boutique vendeur introuvable.");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Session vendeur introuvable.");

      let imagePath = editingProduct?.image_path ?? null;
      const uploadedImagePaths: string[] = [];
      if (imageFile) {
        const extension = imageFile.type === "image/jpeg" ? "jpg" : imageFile.type.split("/")[1];
        const uploadedImagePath = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(imageBucket)
          .upload(uploadedImagePath, imageFile, { contentType: imageFile.type });
        if (uploadError) throw uploadError;
        uploadedImagePaths.push(uploadedImagePath);
        imagePath = uploadedImagePath;
      }

      const additionalImagePaths = [...retainedAdditionalImagePaths];
      try {
        for (const file of additionalImageFiles) {
          const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
          const uploadedImagePath = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from(imageBucket)
            .upload(uploadedImagePath, file, { contentType: file.type });
          if (uploadError) throw uploadError;
          uploadedImagePaths.push(uploadedImagePath);
          additionalImagePaths.push(uploadedImagePath);
        }
      } catch (uploadError) {
        if (uploadedImagePaths.length) {
          const { error: cleanupError } = await supabase.storage
            .from(imageBucket)
            .remove(uploadedImagePaths);
          if (cleanupError)
            console.error(
              "Impossible de nettoyer les images après un échec d’envoi.",
              cleanupError,
            );
        }
        throw uploadError;
      }

      const productValues = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        subcategory: form.subcategory.trim() || null,
        price: Number(form.price),
        stock: Number(form.stock),
        is_active: form.is_active,
        image_path: imagePath,
        additional_image_paths: additionalImagePaths,
      };

      try {
        if (editingProduct) {
          const { error: updateError } = await supabase
            .from("products")
            .update(productValues)
            .eq("id", editingProduct.id)
            .eq("vendor_id", vendor.id)
            .select("id")
            .single();
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("products")
            .insert({ ...productValues, vendor_id: vendor.id });
          if (insertError) throw insertError;
        }
      } catch (saveError) {
        if (uploadedImagePaths.length) {
          const { error: cleanupError } = await supabase.storage
            .from(imageBucket)
            .remove(uploadedImagePaths);
          if (cleanupError)
            console.error(
              "Impossible de supprimer les images importées après l’échec.",
              cleanupError,
            );
        }
        throw saveError;
      }

      const removedImagePaths = [
        ...(imageFile && editingProduct?.image_path ? [editingProduct.image_path] : []),
        ...(editingProduct?.additional_image_paths ?? []).filter(
          (path) => !retainedAdditionalImagePaths.includes(path),
        ),
      ];
      if (removedImagePaths.length) {
        const { error: cleanupError } = await supabase.storage
          .from(imageBucket)
          .remove(removedImagePaths);
        if (cleanupError)
          return "L’article a été enregistré, mais certaines anciennes photos n’ont pas pu être supprimées.";
      }
      return null;
    },
    onSuccess: (warning) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      queryClient.invalidateQueries({ queryKey: ["public-products"] });
      if (warning) toast.error(warning);
      else
        toast.success(editingProduct ? "Produit mis à jour." : "Produit ajouté à votre catalogue.");
      closeForm();
    },
    onError: (saveError) => {
      toast.error(`Impossible d’enregistrer le produit : ${saveError.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!vendor?.id) throw new Error("Boutique vendeur introuvable.");
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("vendor_id", vendor.id)
        .select("id")
        .single();
      if (deleteError) throw deleteError;

      const imagePaths = [
        ...(product.image_path ? [product.image_path] : []),
        ...product.additional_image_paths,
      ];
      if (imagePaths.length) {
        const { error: storageError } = await supabase.storage.from(imageBucket).remove(imagePaths);
        if (storageError)
          return "Produit supprimé, mais certaines photos n’ont pas pu être supprimées.";
      }
      return null;
    },
    onSuccess: (warning) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      queryClient.invalidateQueries({ queryKey: ["public-products"] });
      if (warning) toast.error(warning);
      else toast.success("Produit supprimé.");
    },
    onError: (deleteError) => {
      toast.error(`Impossible de supprimer le produit : ${deleteError.message}`);
    },
  });

  function closeForm() {
    setFormOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setImageFile(null);
    setAdditionalImageFiles([]);
    setRetainedAdditionalImagePaths([]);
  }

  function startCreate() {
    setEditingProduct(null);
    setForm(emptyForm);
    setImageFile(null);
    setAdditionalImageFiles([]);
    setRetainedAdditionalImagePaths([]);
    setFormOpen(true);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      subcategory: product.subcategory ?? "",
      price: String(product.price),
      stock: String(product.stock),
      is_active: product.is_active,
    });
    setImageFile(null);
    setAdditionalImageFiles([]);
    setRetainedAdditionalImagePaths(product.additional_image_paths ?? []);
    setFormOpen(true);
  }

  function handleImageChange(file: File | undefined) {
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choisissez une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > maxImageSize) {
      toast.error("La photo doit peser 6 Mo maximum.");
      return;
    }
    setImageFile(file);
  }

  function handleAdditionalImagesChange(files: FileList | null) {
    if (!files) return;

    const availableSlots = maxAdditionalImages - retainedAdditionalImagePaths.length;
    const selectedFiles = Array.from(files);
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name} : choisissez une image JPG, PNG ou WebP.`);
        continue;
      }
      if (file.size > maxImageSize) {
        toast.error(`${file.name} : la photo doit peser 6 Mo maximum.`);
        continue;
      }
      if (additionalImageFiles.length + validFiles.length >= availableSlots) {
        toast.error(`Vous pouvez ajouter jusqu’à ${maxAdditionalImages} photos supplémentaires.`);
        break;
      }
      validFiles.push(file);
    }

    if (validFiles.length) setAdditionalImageFiles((current) => [...current, ...validFiles]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  const availableSubcategories =
    categorySubcategories[form.category]?.flatMap((section) => section.items) ?? [];

  if (vendorLoading || (vendor && productsLoading)) {
    return <p className="text-sm text-muted-foreground">Chargement de vos produits…</p>;
  }

  if (vendorIsError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-destructive">
          <p>Impossible de charger votre boutique : {vendorError.message}</p>
          <Button variant="outline" onClick={() => refetchVendor()}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!vendor) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Votre compte n’est pas associé à une boutique.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Mes produits</h1>
          <p className="text-sm text-muted-foreground">
            Ajoutez vos marchandises avec leur photo, leur prix et leur stock.
          </p>
        </div>
        {!formOpen && (
          <Button onClick={startCreate}>
            <Plus className="mr-2 size-4" />
            Ajouter un produit
          </Button>
        )}
      </div>

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? "Modifier le produit" : "Ajouter un produit"}</CardTitle>
            <CardDescription>
              Les produits actifs d’une boutique vérifiée peuvent être présentés aux clients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Nom du produit</Label>
                  <Input
                    id="product-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    maxLength={120}
                    required
                    placeholder="Ex. Baskets urbaines"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-category">Catégorie</Label>
                  <select
                    id="product-category"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value, subcategory: "" })
                    }
                  >
                    {productCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {availableSubcategories.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="product-subcategory">Sous-catégorie</Label>
                    <select
                      id="product-subcategory"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.subcategory}
                      onChange={(event) => setForm({ ...form, subcategory: event.target.value })}
                    >
                      <option value="">Sélectionner une sous-catégorie</option>
                      {[...new Set(availableSubcategories)].map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="product-price">Prix (FCFA)</Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="1"
                    step="1"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    required
                    placeholder="Ex. 15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-stock">Quantité en stock</Label>
                  <Input
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(event) => setForm({ ...form, stock: event.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  maxLength={2000}
                  placeholder="Décrivez votre produit, sa matière, sa taille ou ses particularités."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-image">Photo du produit</Label>
                  <Input
                    id="product-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handleImageChange(event.target.files?.[0])}
                    className="h-auto py-2 file:mr-3"
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · 6 Mo maximum</p>
                </div>
                <div className="flex items-center gap-3">
                  {imagePreview || editingProduct?.image_path ? (
                    <img
                      src={
                        imagePreview ?? productImageUrl(editingProduct?.image_path ?? null) ?? ""
                      }
                      alt="Aperçu du produit"
                      className="size-20 rounded-md border object-cover"
                    />
                  ) : (
                    <span className="grid size-20 place-items-center rounded-md border border-dashed text-muted-foreground">
                      <ImagePlus className="size-6" />
                    </span>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                      className="size-4 accent-primary"
                    />
                    Produit actif
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="product-additional-images">
                    Autres photos{" "}
                    {retainedAdditionalImagePaths.length + additionalImageFiles.length}/
                    {maxAdditionalImages}
                  </Label>
                  <Input
                    id="product-additional-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={
                      retainedAdditionalImagePaths.length + additionalImageFiles.length >=
                      maxAdditionalImages
                    }
                    onChange={(event) => {
                      handleAdditionalImagesChange(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                    className="h-auto py-2 file:mr-3"
                    aria-describedby="product-additional-images-help"
                  />
                  <p id="product-additional-images-help" className="text-xs text-muted-foreground">
                    Ajoutez jusqu’à 5 photos en plus de la photo principale. JPG, PNG ou WebP · 6 Mo
                    maximum par photo.
                  </p>
                </div>
                {(retainedAdditionalImagePaths.length > 0 || additionalImageFiles.length > 0) && (
                  <div className="flex flex-wrap gap-3">
                    {retainedAdditionalImagePaths.map((path, index) => (
                      <div key={path} className="relative">
                        <img
                          src={productImageUrl(path) ?? ""}
                          alt={`Photo supplémentaire ${index + 1} du produit`}
                          className="size-20 rounded-md border object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 size-7 rounded-full"
                          onClick={() =>
                            setRetainedAdditionalImagePaths((current) =>
                              current.filter((currentPath) => currentPath !== path),
                            )
                          }
                          aria-label={`Retirer la photo supplémentaire ${index + 1}`}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    {additionalImagePreviews.map((previewUrl, index) => (
                      <div key={previewUrl} className="relative">
                        <img
                          src={previewUrl}
                          alt={`Aperçu de la photo supplémentaire ${index + 1}`}
                          className="size-20 rounded-md border object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 size-7 rounded-full"
                          onClick={() =>
                            setAdditionalImageFiles((current) =>
                              current.filter((_, fileIndex) => fileIndex !== index),
                            )
                          }
                          aria-label={`Retirer la nouvelle photo supplémentaire ${index + 1}`}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={saveMutation.isPending}
                >
                  <X className="mr-2 size-4" />
                  Annuler
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <PackagePlus className="mr-2 size-4" />
                  )}
                  {saveMutation.isPending ? "Enregistrement…" : "Enregistrer le produit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Votre catalogue</CardTitle>
          <CardDescription>
            {products.length} produit{products.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="space-y-3 text-sm text-destructive">
              <p>Impossible de charger les produits : {error.message}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Tags className="mx-auto size-9 text-muted-foreground" />
              <h2 className="mt-3 font-semibold">Votre catalogue est vide</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez votre premier produit pour commencer à présenter vos marchandises.
              </p>
              {!formOpen && (
                <Button className="mt-4" variant="outline" onClick={startCreate}>
                  <Plus className="mr-2 size-4" />
                  Ajouter un produit
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  {product.image_path ? (
                    <img
                      src={productImageUrl(product.image_path) ?? ""}
                      alt={product.name}
                      className="size-24 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="grid size-24 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
                      <ImagePlus className="size-7" />
                    </div>
                  )}
                  {product.additional_image_paths.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      +{product.additional_image_paths.length} photo
                      {product.additional_image_paths.length === 1 ? "" : "s"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{product.name}</h2>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Actif" : "Masqué"}
                      </Badge>
                      <Badge variant="outline">{product.subcategory ?? product.category}</Badge>
                    </div>
                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-semibold">
                      {new Intl.NumberFormat("fr-FR").format(product.price)} FCFA
                      <span className="ml-3 font-normal text-muted-foreground">
                        Stock : {product.stock}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button variant="outline" size="sm" onClick={() => startEdit(product)}>
                      <Pencil className="mr-2 size-4" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Supprimer « ${product.name} » ?`)) {
                          deleteMutation.mutate(product);
                        }
                      }}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 size-4" />
                      )}
                      Supprimer
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
