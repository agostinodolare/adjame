import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Minus, Plus, ShoppingBag, Star, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { Button } from "@/components/ui/button";
import { communes, deliveryFeeFor, requestDelivery } from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/boutique/$vendorId")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" },
      { name: "HandheldFriendly", content: "True" },
      { name: "MobileOptimized", content: "320" },
      { name: "theme-color", content: "oklch(0.39 0.12 157)" },
    ],
  }),
  component: VendorStorePage,
});

const imageBucket = "product-images";
const vendorImageBucket = "vendor-images";
const formatPrice = (price: number) => new Intl.NumberFormat("fr-FR").format(price) + " F";

type StoreProduct = {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  image: string | null;
  additionalImages: string[];
  created_at: string;
  rating: number | null;
  ratingCount: number;
};

function VendorStorePage() {
  const navigate = useNavigate();
  const { vendorId } = Route.useParams();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [commune, setCommune] = useState("Adjamé");
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<string | null>(null);

  const vendorQuery = useQuery({
    queryKey: ["public-vendor", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select(
          "id, name, shop_name, category, stall, verified, created_at, logo_path, banner_path",
        )
        .eq("id", vendorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const productsQuery = useQuery({
    queryKey: ["public-vendor-products", vendorId],
    enabled: Boolean(vendorQuery.data),
    queryFn: async (): Promise<StoreProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, vendor_id, name, description, category, price, stock, image_path, additional_image_paths, created_at",
        )
        .eq("vendor_id", vendorId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const productIds = data.map((product) => product.id);
      const { data: ratings, error: ratingsError } = productIds.length
        ? await supabase
            .from("product_reviews")
            .select("product_id, rating")
            .in("product_id", productIds)
        : { data: [], error: null };
      if (ratingsError) throw ratingsError;

      const ratingsByProduct = new Map<string, number[]>();
      for (const { product_id, rating } of ratings ?? []) {
        const productRatings = ratingsByProduct.get(product_id) ?? [];
        productRatings.push(rating);
        ratingsByProduct.set(product_id, productRatings);
      }

      return data.map((product) => {
        const productRatings = ratingsByProduct.get(product.id) ?? [];
        return {
          ...product,
          image: product.image_path
            ? supabase.storage.from(imageBucket).getPublicUrl(product.image_path).data.publicUrl
            : null,
          additionalImages: product.additional_image_paths.map(
            (path) => supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl,
          ),
          rating: productRatings.length
            ? productRatings.reduce((sum, rating) => sum + rating, 0) / productRatings.length
            : null,
          ratingCount: productRatings.length,
        };
      });
    },
  });

  const products = productsQuery.data ?? [];
  const selectedProducts = products.filter((product) => cart[product.id]);
  const itemCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const subtotal = selectedProducts.reduce(
    (total, product) => total + product.price * (cart[product.id] ?? 0),
    0,
  );
  const deliveryFee = itemCount ? deliveryFeeFor(commune) : 0;
  const total = subtotal + deliveryFee;

  const publicationDate = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const prefillCustomer = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) return;

      const { data, error } = await supabase
        .from("customer_profiles")
        .select("full_name, phone, commune, address")
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();
      if (error) throw error;
      if (cancelled || !data) return;

      setCustomerName((current) => current || data.full_name);
      setCustomerPhone((current) => current || data.phone);
      setCommune(data.commune);
      setAddress((current) => current || data.address || "");
    };

    void prefillCustomer().catch((error: unknown) => {
      if (!cancelled) {
        console.error("Could not prefill checkout details for the vendor store.", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateCart = (product: StoreProduct, change: number) => {
    setCart((current) => {
      const quantity = Math.min(product.stock, Math.max(0, (current[product.id] ?? 0) + change));
      const next = { ...current, [product.id]: quantity };
      if (quantity === 0) delete next[product.id];
      return next;
    });
    setErrorMessage(null);
    setOrderConfirmation(null);
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setErrorMessage(null);
    setOrderConfirmation(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        void navigate({ to: "/auth" });
        return;
      }

      const orders = await requestDelivery({
        data: {
          customer_name: customerName,
          customer_phone: customerPhone,
          commune,
          address,
          accessToken: sessionData.session.access_token,
          items: selectedProducts.map((product) => ({
            product_id: product.id,
            quantity: cart[product.id],
          })),
        },
      });

      setCart({});
      setOrderConfirmation(
        `Votre demande a été envoyée. Référence${orders.length > 1 ? "s" : ""} : ${orders.map((order) => order.reference).join(", ")}.`,
      );
    } catch (error) {
      console.error("Could not place an order from the vendor store.", error);
      setErrorMessage(
        "La commande n’a pas pu être envoyée. Vérifiez vos coordonnées et le stock, puis réessayez.",
      );
    } finally {
      setSending(false);
    }
  };

  const vendor = vendorQuery.data;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Retour à l’accueil">
            <BrandLogo variant="primary" className="h-10 w-20 object-contain sm:h-14 sm:w-28 lg:w-36" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Retour au marché
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        {vendorQuery.isLoading && (
          <p className="py-20 text-center text-muted-foreground">Chargement de la boutique…</p>
        )}

        {vendorQuery.isError && (
          <div role="alert" className="rounded-lg border border-destructive/30 p-6 text-center">
            <p className="font-semibold text-destructive">La boutique n’a pas pu être chargée.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vérifiez votre connexion, puis actualisez la page.
            </p>
          </div>
        )}

        {!vendorQuery.isLoading && !vendorQuery.isError && !vendor && (
          <div className="rounded-lg border border-border p-10 text-center">
            <Store className="mx-auto size-10 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold">Boutique introuvable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cette boutique n’est pas disponible ou n’est pas encore publiée.
            </p>
            <Button asChild className="mt-5">
              <Link to="/">Retourner au marché</Link>
            </Button>
          </div>
        )}

        {vendor && (
          <>
            <section className="overflow-hidden rounded-xl border border-border bg-secondary">
              <div className="relative h-36 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary sm:h-56">
                {vendor.banner_path && (
                  <img
                    src={
                      supabase.storage.from(vendorImageBucket).getPublicUrl(vendor.banner_path).data
                        .publicUrl
                    }
                    alt={`Bannière de ${vendor.shop_name}`}
                    className="size-full object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
                <span className="-mt-10 grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-secondary bg-background text-primary shadow-sm sm:size-24">
                  {vendor.logo_path ? (
                    <img
                      src={
                        supabase.storage.from(vendorImageBucket).getPublicUrl(vendor.logo_path).data
                          .publicUrl
                      }
                      alt={`Logo de ${vendor.shop_name}`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Store className="size-9" />
                  )}
                </span>
                <div className="min-w-0 flex-1 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-3xl font-extrabold">{vendor.shop_name}</h1>
                    {vendor.verified && (
                      <BadgeCheck className="size-5 text-primary" aria-label="Boutique vérifiée" />
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {vendor.name} · {vendor.category}
                  </p>
                  {vendor.stall && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Emplacement au marché : {vendor.stall}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Membre depuis {publicationDate.format(new Date(vendor.created_at))}
                  </p>
                </div>
                <div className="rounded-lg bg-background px-4 py-3 text-sm">
                  <strong className="block font-display text-xl text-primary">
                    {products.length}
                  </strong>
                  <span className="text-muted-foreground">
                    publication{products.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </section>

            {orderConfirmation && (
              <p
                role="status"
                className="mt-6 rounded-lg bg-mint p-4 text-sm font-semibold text-primary"
              >
                {orderConfirmation}
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 items-start gap-4 sm:mt-10 sm:gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-accent">
                      Historique des publications
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-extrabold">
                      Les articles de la boutique
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Du plus récent au plus ancien</p>
                </div>

                {productsQuery.isLoading && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Chargement des articles…
                  </p>
                )}
                {productsQuery.isError && (
                  <p
                    role="alert"
                    className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive"
                  >
                    Les articles de cette boutique n’ont pas pu être chargés. Veuillez actualiser la
                    page.
                  </p>
                )}
                {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 && (
                  <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Cette boutique n’a actuellement aucune publication visible.
                  </p>
                )}

                <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-lg border border-border bg-card shadow-soft"
                    >
                      <ProductImageGallery
                        images={[product.image, ...product.additionalImages]}
                        productName={product.name}
                        className="space-y-2 p-2"
                        imageClassName="aspect-square rounded-md"
                      />
                      <div className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="rounded bg-secondary px-2 py-1 font-semibold">
                            {product.category}
                          </span>
                          <span
                            className={
                              product.stock > 0
                                ? "text-muted-foreground"
                                : "font-semibold text-destructive"
                            }
                          >
                            {product.stock > 0 ? `${product.stock} en stock` : "Rupture de stock"}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold">{product.name}</h3>
                        {product.description && (
                          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Publié le {publicationDate.format(new Date(product.created_at))}
                        </p>
                        {product.rating !== null && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="size-3.5 fill-amber-500 text-amber-500" />
                            {product.rating.toFixed(1)} ({product.ratingCount} avis)
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                          <strong className="font-display text-lg text-primary">
                            {formatPrice(product.price)}
                          </strong>
                          {cart[product.id] ? (
                            <div className="flex h-10 items-center rounded-md border border-primary">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Retirer un ${product.name}`}
                                onClick={() => updateCart(product, -1)}
                              >
                                <Minus />
                              </Button>
                              <span className="w-7 text-center text-sm font-bold">
                                {cart[product.id]}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Ajouter un ${product.name}`}
                                disabled={(cart[product.id] ?? 0) >= product.stock}
                                onClick={() => updateCart(product, 1)}
                              >
                                <Plus />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={product.stock < 1}
                              onClick={() => updateCart(product, 1)}
                              aria-label={`Ajouter ${product.name} au panier`}
                            >
                              <Plus /> Acheter
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="sticky top-6 rounded-xl border border-border bg-background p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="size-5 text-primary" />
                  <div>
                    <h2 className="font-display text-lg font-bold">Commander à la boutique</h2>
                    <p className="text-xs text-muted-foreground">
                      {itemCount} article{itemCount === 1 ? "" : "s"} sélectionné
                      {itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {selectedProducts.length > 0 ? (
                  <form onSubmit={submitOrder} className="mt-5 space-y-3">
                    <div className="max-h-48 space-y-3 overflow-y-auto border-b border-border pb-3">
                      {selectedProducts.map((product) => (
                        <div key={product.id} className="flex justify-between gap-3 text-sm">
                          <span className="min-w-0">
                            {product.name} × {cart[product.id]}
                          </span>
                          <strong className="shrink-0">
                            {formatPrice(product.price * (cart[product.id] ?? 0))}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sous-total</span>
                      <strong>{formatPrice(subtotal)}</strong>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Livraison ({commune})</span>
                      <span>{formatPrice(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 font-bold">
                      <span>Total estimé</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <input
                      required
                      minLength={2}
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Votre nom"
                      aria-label="Votre nom"
                      className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      required
                      minLength={8}
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      placeholder="Téléphone (WhatsApp)"
                      aria-label="Téléphone"
                      className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                    />
                    <select
                      value={commune}
                      onChange={(event) => setCommune(event.target.value)}
                      aria-label="Commune de livraison"
                      className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm"
                    >
                      {communes.map((deliveryCommune) => (
                        <option key={deliveryCommune} value={deliveryCommune}>
                          {deliveryCommune}
                        </option>
                      ))}
                    </select>
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Quartier, repère (facultatif)"
                      aria-label="Adresse de livraison"
                      className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                    />
                    {errorMessage && (
                      <p role="alert" className="text-sm text-destructive">
                        {errorMessage}
                      </p>
                    )}
                    <Button type="submit" className="h-12 w-full" disabled={sending}>
                      {sending ? "Envoi en cours…" : "Demander la livraison"}
                    </Button>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Paiement à la livraison ou Mobile Money, après confirmation du vendeur.
                    </p>
                  </form>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Choisissez un article pour commencer votre commande.
                  </p>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
