import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Baby,
  Bike,
  Bookmark,
  Car,
  Check,
  ChevronRight,
  CircleUserRound,
  CircleHelp,
  ClipboardList,
  Dumbbell,
  Gamepad2,
  Heart,
  House,
  LayoutGrid,
  Leaf,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Minus,
  Monitor,
  Package,
  Plus,
  Search,
  Settings,
  Share2,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TicketPercent,
  Zap,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import heroImage from "@/assets/adjame-market-hero.jpg";
import { BrandLogo } from "@/components/brand-logo";
import { categorySubcategories, requestedCategories } from "@/lib/catalog-categories";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  communes,
  deliveryFeeFor,
  listAvailableCoupons,
  previewCoupon,
  requestDelivery,
} from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { product?: string; view?: "favorites"; coupons?: "open"; inbox?: "open" } => ({
    ...(typeof search["product"] === "string" ? { product: search["product"] } : {}),
    ...(search["view"] === "favorites" ? { view: "favorites" as const } : {}),
    ...(search["coupons"] === "open" ? { coupons: "open" as const } : {}),
    ...(search["inbox"] === "open" ? { inbox: "open" as const } : {}),
  }),
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mon Djassaman — Les bonnes affaires d’Adjamé, livrées chez vous" },
      {
        name: "description",
        content:
          "Découvrez les vendeurs d’Adjamé, choisissez vos articles et faites-vous livrer partout à Abidjan.",
      },
      { property: "og:title", content: "Mon Djassaman — Adjamé chez vous" },
      {
        property: "og:description",
        content:
          "Les meilleurs vendeurs d’Adjamé réunis en un seul endroit, avec livraison à Abidjan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      /* Optimisation mobile Android */
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" },
      { name: "HandheldFriendly", content: "True" },
      { name: "MobileOptimized", content: "320" },
      { name: "theme-color", content: "oklch(0.39 0.12 157)" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    link: [
      { rel: "apple-touch-icon", href: "/favicon.ico" },
    ],
  }),
  component: Index,
});

const legacyCategories = [
  "Femme",
  "Homme",
  "Enfant",
  "Chaussures",
  "Accessoires",
  "Téléphones",
  "Divers",
];
const defaultCategories = ["Tout", ...requestedCategories, ...legacyCategories];
const imageBucket = "product-images";

const categoryIcons: Record<string, LucideIcon> = {
  Tout: LayoutGrid,
  Supermarché: ShoppingBag,
  "Maison & Bureau": House,
  "Téléphonie & Tablettes": Monitor,
  Electronique: Monitor,
  "Beauté & Hygiène": Sparkles,
  "Produits pour bébés": Baby,
  "Agriculture & Élevage": Leaf,
  Informatique: Package,
  "Mode Femme": Shirt,
  "Mode Homme": Shirt,
  "Jeux vidéos & Consoles": Gamepad2,
  "Articles de sport": Dumbbell,
  "Jeux & Jouets": Gamepad2,
  Voiture: Car,
  Femme: Shirt,
  Homme: Shirt,
  Enfant: Baby,
  Chaussures: ShoppingBag,
  Accessoires: Sparkles,
  Téléphones: Monitor,
  Divers: Package,
};

type CatalogProduct = {
  id: string;
  vendor_id: string;
  name: string;
  sellerName: string;
  seller: string;
  sellerStall: string | null;
  sellerVerified: boolean;
  category: string;
  subcategory: string | null;
  description: string | null;
  price: number;
  stock: number;
  image: string | null;
  additionalImages: string[];
  rating: number | null;
  ratingCount: number;
};

const emptyCatalogProducts: CatalogProduct[] = [];

const orderStatusLabels: Record<string, string> = {
  nouvelle: "Nouvelle commande",
  confirmee: "Commande confirmée",
  en_livraison: "Commande en livraison",
  livree: "Commande livrée",
  annulee: "Commande annulée",
};

const formatPrice = (price: number) => new Intl.NumberFormat("fr-FR").format(price) + " F";

function Index() {
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const didPrefillCustomer = useRef(false);
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string>(
    requestedCategories[0] ?? "Tout",
  );
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(search.inbox === "open");
  const [couponsOpen, setCouponsOpen] = useState(search.coupons === "open");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountTotal: number;
  } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<
    | {
        reference: string;
        vendor_name: string;
        items_total: number;
        delivery_fee: number;
        discount_total: number;
        coupon_code: string | null;
      }[]
    | null
  >(null);
  const [sending, setSending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    commune: "Adjamé",
    address: "",
  });

  useEffect(() => {
    if (search.inbox === "open") setInboxOpen(true);
    if (search.coupons === "open") setCouponsOpen(true);
  }, [search.coupons, search.inbox]);

  const {
    data: productRows,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: ["public-products"],
    queryFn: async (): Promise<CatalogProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, vendor_id, name, description, category, subcategory, price, stock, image_path, additional_image_paths, vendors(name, shop_name, stall, verified)",
        )
        .eq("is_active", true)
        .gt("stock", 0)
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
          id: product.id,
          vendor_id: product.vendor_id,
          name: product.name,
          sellerName: product.vendors.name,
          seller: product.vendors.shop_name,
          sellerStall: product.vendors.stall,
          sellerVerified: product.vendors.verified,
          category: product.category,
          subcategory: product.subcategory,
          description: product.description,
          price: product.price,
          stock: product.stock,
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

  const customerProfile = useQuery({
    queryKey: ["checkout-customer-profile"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) return null;

      const { data, error } = await supabase
        .from("customer_profiles")
        .select("full_name, phone, commune, address")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const accountRoles = useQuery({
    queryKey: ["homepage-account-roles", isAuthenticated],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id);
      if (error) throw error;
      return data.map(({ role }) => role);
    },
  });

  const inboxOrders = useQuery({
    queryKey: ["homepage-inbox-orders", currentUserId],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user)
        throw new Error("Connexion requise pour consulter la boîte de réception.");

      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, status, updated_at")
        .eq("customer_id", authData.user.id)
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
  const productActions = useQuery({
    queryKey: ["product-actions", currentUserId],
    enabled: Boolean(currentUserId),
    queryFn: async () => {
      if (!currentUserId) throw new Error("Connexion requise pour charger vos favoris.");
      const { data, error } = await supabase
        .from("product_actions")
        .select("product_id, liked, favorite")
        .eq("user_id", currentUserId);
      if (error) throw error;
      return data;
    },
  });
  const availableCoupons = useQuery({
    queryKey: ["available-coupons", currentUserId],
    enabled: couponsOpen && Boolean(currentUserId),
    queryFn: async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session)
        throw new Error("Connexion requise pour consulter les bons d’achat.");
      return listAvailableCoupons({ data: { accessToken: sessionData.session.access_token } });
    },
  });
  const likedProducts = useMemo(
    () =>
      new Set(
        productActions.data?.filter((action) => action.liked).map((action) => action.product_id),
      ),
    [productActions.data],
  );
  const favoriteProducts = useMemo(
    () =>
      new Set(
        productActions.data?.filter((action) => action.favorite).map((action) => action.product_id),
      ),
    [productActions.data],
  );

  const settingsHref = "/parametres";
  const accountHref = accountRoles.data?.includes("client")
    ? "/client"
    : accountRoles.data?.includes("vendeur")
      ? "/vendeur"
      : accountRoles.data?.includes("livreur")
        ? "/coursier"
        : accountRoles.data?.includes("admin") || accountRoles.data?.includes("staff")
          ? "/admin"
          : "/client";
  const ordersHref = accountRoles.data?.includes("client")
    ? "/client/commandes"
    : accountRoles.data?.includes("vendeur")
      ? "/vendeur/commandes"
      : accountRoles.data?.includes("livreur")
        ? "/coursier/livraisons"
        : accountRoles.data?.includes("admin") || accountRoles.data?.includes("staff")
          ? "/admin/commandes"
          : "/client/commandes";

  useEffect(() => {
    let active = true;
    const syncAuth = (user: { id: string; user_metadata: Record<string, unknown> } | null) => {
      if (!active) return;
      const authenticated = Boolean(user);
      setIsAuthenticated(authenticated);
      setCurrentUserId(user?.id ?? null);
      const storedAvatarPath = user?.user_metadata["avatar_path"];
      const avatarPath =
        user && typeof storedAvatarPath === "string" && storedAvatarPath.startsWith(`${user.id}/`)
          ? storedAvatarPath
          : null;
      setProfilePhotoUrl(
        avatarPath
          ? supabase.storage.from("profile-avatars").getPublicUrl(avatarPath).data.publicUrl
          : null,
      );
    };
    void supabase.auth.getUser().then(({ data }) => syncAuth(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuth(session?.user ?? null);
    });
    const onAvatarUpdated = (event: Event) => {
      const url = (event as CustomEvent<string>).detail;
      if (typeof url === "string") setProfilePhotoUrl(url);
    };
    window.addEventListener("profile-avatar-updated", onAvatarUpdated);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("profile-avatar-updated", onAvatarUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const profile = customerProfile.data;
    if (!profile || didPrefillCustomer.current) return;
    didPrefillCustomer.current = true;
    setForm((current) => ({
      customer_name: current.customer_name || profile.full_name,
      customer_phone: current.customer_phone || profile.phone,
      commune: profile.commune,
      address: current.address || profile.address || "",
    }));
  }, [customerProfile.data, isAuthenticated]);

  const products = productRows ?? emptyCatalogProducts;
  const selectedProduct = products.find((product) => product.id === search.product) ?? null;
  const categories = [
    ...new Set([...defaultCategories, ...products.map((product) => product.category)]),
  ];
  const primaryCategories = categories.filter((category) => category !== "Tout").slice(0, 6);
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 7);
  const categoryMenuItems = [...requestedCategories, "Autres catégories"].map((category) => ({
    category,
    icon: categoryIcons[category] ?? Package,
  }));

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = activeCategory === "Tout" || product.category === activeCategory;
      const subcategoryMatch =
        activeSubcategory === null || product.subcategory === activeSubcategory;
      const favoritesMatch = search.view !== "favorites" || favoriteProducts.has(product.id);
      const searchMatch =
        `${product.name} ${product.seller} ${product.description ?? ""} ${product.category} ${product.subcategory ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return categoryMatch && subcategoryMatch && favoritesMatch && searchMatch;
    });
  }, [products, activeCategory, activeSubcategory, query, search.view, favoriteProducts]);

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const selectedProducts = products.filter((product) => cart[product.id]);
  const selectedVendorCount = new Set(selectedProducts.map((product) => product.vendor_id)).size;
  const deliveryTotal = selectedVendorCount * deliveryFeeFor(form.commune);
  const cartTotal = products.reduce(
    (sum, product) => sum + product.price * (cart[product.id] ?? 0),
    0,
  );

  const updateCart = (id: string, change: number) => {
    setOrdered(null);
    setAppliedCoupon(null);
    setCouponError(null);
    setCart((current) => {
      const product = products.find((item) => item.id === id);
      const quantity = Math.min(product?.stock ?? 0, Math.max(0, (current[id] ?? 0) + change));
      const next = { ...current, [id]: quantity };
      if (quantity === 0) delete next[id];
      return next;
    });
  };

  const applyCoupon = async () => {
    setCouponError(null);
    if (!couponCode.trim()) {
      setCouponError("Saisissez un code promo.");
      return;
    }
    if (cartTotal <= 0) {
      setCouponError("Ajoutez un article au panier avant d’appliquer un code promo.");
      return;
    }

    setCouponChecking(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        void navigate({ to: "/auth" });
        return;
      }
      const result = await previewCoupon({
        data: {
          accessToken: sessionData.session.access_token,
          code: couponCode,
          itemsTotal: cartTotal,
        },
      });
      setCouponCode(result.code);
      setAppliedCoupon({ code: result.code, discountTotal: result.discountTotal });
    } catch (error) {
      console.error("Could not apply coupon.", error);
      setCouponError(
        error instanceof Error ? error.message : "Ce code promo n’a pas pu être appliqué.",
      );
    } finally {
      setCouponChecking(false);
    }
  };

  const openProduct = (productId: string) => {
    setShareMessage(null);
    void navigate({
      search: (previous) => ({ ...previous, product: productId }),
      replace: false,
    });
  };

  const closeProduct = () => {
    setShareMessage(null);
    void navigate({
      search: (previous) => {
        const { product: _closed, ...rest } = previous;
        return rest;
      },
      replace: true,
    });
  };

  const shareProduct = async (product: CatalogProduct) => {
    const url = new URL(window.location.href);
    url.searchParams.set("product", product.id);
    url.hash = "catalogue";
    const shareData = {
      title: product.name,
      text: `${product.name} — ${formatPrice(product.price)} chez ${product.seller}.`,
      url: url.toString(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShareMessage("Produit partagé.");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Could not share product.", error);
        setShareMessage("Le partage a échoué. Vous pouvez copier le lien du produit.");
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareMessage("Lien du produit copié.");
    } catch (error) {
      console.error("Could not copy product link.", error);
      window.prompt("Copiez ce lien pour partager le produit :", shareData.url);
    }
  };

  const toggleProductAction = async (productId: string, action: "liked" | "favorite") => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      toast.error("Impossible de vérifier votre connexion. Réessayez.");
      console.error("Could not verify the current user before saving a product action.", authError);
      return;
    }
    if (!authData.user) {
      void navigate({ to: "/auth" });
      return;
    }

    try {
      const { data: actions, error: actionsError } = await supabase
        .from("product_actions")
        .select("liked, favorite")
        .eq("user_id", authData.user.id)
        .eq("product_id", productId)
        .maybeSingle();
      if (actionsError) throw actionsError;

      const nextLiked = action === "liked" ? !actions?.liked : Boolean(actions?.liked);
      const nextFavorite = action === "favorite" ? !actions?.favorite : Boolean(actions?.favorite);
      const result =
        nextLiked || nextFavorite
          ? await supabase.from("product_actions").upsert(
              {
                user_id: authData.user.id,
                product_id: productId,
                liked: nextLiked,
                favorite: nextFavorite,
              },
              { onConflict: "user_id,product_id" },
            )
          : await supabase
              .from("product_actions")
              .delete()
              .eq("user_id", authData.user.id)
              .eq("product_id", productId);
      if (result.error) throw result.error;

      const refreshedActions = await productActions.refetch();
      if (refreshedActions.error) throw refreshedActions.error;
    } catch (error) {
      console.error("Could not save product action.", error);
      toast.error("Votre action n’a pas pu être enregistrée. Réessayez.");
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Could not sign out.", error);
      return;
    }
    setIsAuthenticated(false);
    setProfilePhotoUrl(null);
  };

  const browse = () => document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="border-b border-border/60 bg-secondary/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 text-[10px] font-semibold sm:px-6 sm:text-xs lg:px-8 md:h-11">
          <span className="flex shrink-0 items-center gap-1.5 text-foreground">
            <CircleHelp className="size-3.5 text-primary" />
            Centre d'aide
          </span>
          <div className="flex min-w-0 max-w-[76%] flex-col items-end gap-1 text-right leading-tight text-muted-foreground">
            <span className="inline-flex items-start gap-1 text-primary">
              <MapPin className="mt-px size-3.5 shrink-0 text-primary" />
              Livraison disponible à Abidjan et à l'intérieur
            </span>
            <a
              href="https://wa.me/2250586552033"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 py-1.5 font-bold text-foreground hover:text-primary"
              aria-label="Contacter le 05 86 55 20 33 sur WhatsApp"
            >
              <WhatsAppIcon className="size-4" />
              <span>+225 05 86 55 20 33</span>
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <DropdownMenu open={categoryMenuOpen} onOpenChange={setCategoryMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={categoryMenuOpen ? "Fermer les catégories" : "Ouvrir les catégories"}
                  title="Catégories"
                  className="group h-10 w-10 sm:h-11 sm:w-11 border-0 bg-transparent p-0 text-foreground shadow-none transition-colors duration-200 hover:bg-transparent hover:text-accent focus-visible:ring-0"
                >
                  {categoryMenuOpen ? (
                    <X className="size-5 sm:size-6 transition-transform duration-200 group-hover:scale-110" />
                  ) : (
                    <Menu className="size-5 sm:size-6 transition-transform duration-200 group-hover:scale-110" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={4}
                className="w-[min(calc(100vw-1rem),72rem)] overflow-hidden p-0 sm:side-offset-8"
              >
                <div className="grid h-[min(75dvh,var(--radix-dropdown-menu-content-available-height),42rem)] min-h-0 grid-cols-[minmax(6rem,35%)_1fr] sm:grid-cols-[minmax(7.5rem,35%)_1fr] md:grid-cols-[16rem_1fr]">
                  <nav
                    aria-label="Catégories principales"
                    className="min-h-0 overflow-y-auto overscroll-contain border-r border-border bg-background py-2"
                  >
                    {categoryMenuItems.map(({ category, icon: Icon }) => (
                      <DropdownMenuItem
                        key={category}
                        onPointerMove={() => setActiveMenuCategory(category)}
                        onFocus={() => setActiveMenuCategory(category)}
                        onSelect={(event) => {
                          setActiveMenuCategory(category);
                          event.preventDefault();
                        }}
                        className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-none px-3 py-2 text-xs sm:text-sm ${
                          activeMenuCategory === category
                            ? "bg-accent/10 font-semibold text-primary"
                            : "text-foreground"
                        }`}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="min-w-0">{category}</span>
                        <ChevronRight className="ml-auto size-3 shrink-0" />
                      </DropdownMenuItem>
                    ))}
                  </nav>

                  <div className="grid min-h-0 content-start grid-cols-1 gap-x-4 gap-y-3 overflow-y-auto overscroll-contain p-2 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-5 sm:p-5 xl:grid-cols-3">
                    <DropdownMenuItem
                      onSelect={() => {
                        setActiveCategory(
                          activeMenuCategory === "Autres catégories" ? "Tout" : activeMenuCategory,
                        );
                        setActiveSubcategory(null);
                        setQuery("");
                        setCategoryMenuOpen(false);
                        browse();
                      }}
                      className="col-span-full cursor-pointer border-b border-border px-0 pb-2 text-sm font-semibold text-primary"
                    >
                      Voir tous les produits de « {activeMenuCategory} »
                    </DropdownMenuItem>
                    {(categorySubcategories[activeMenuCategory] ?? []).map((section) => (
                      <section key={section.title} className="min-w-0">
                        <h3 className="border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wide text-foreground sm:text-xs">
                          {section.title}
                        </h3>
                        <ul className="mt-2 space-y-1">
                          {section.items.map((item) => (
                            <li key={item}>
                              <DropdownMenuItem
                                onSelect={() => {
                                  const isLegacyCategory =
                                    activeMenuCategory === "Autres catégories" &&
                                    legacyCategories.includes(item);
                                  setActiveCategory(
                                    isLegacyCategory
                                      ? item
                                      : activeMenuCategory === "Autres catégories"
                                        ? "Tout"
                                        : activeMenuCategory,
                                  );
                                  setActiveSubcategory(isLegacyCategory ? null : item);
                                  setQuery("");
                                  setCategoryMenuOpen(false);
                                  browse();
                                }}
                                className="cursor-pointer px-0 py-1 text-xs text-muted-foreground hover:text-primary sm:text-sm"
                              >
                                {item}
                              </DropdownMenuItem>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <a
              href="#top"
              className="flex shrink-0 items-center gap-2"
              aria-label="Accueil Mon Djassaman"
            >
              <BrandLogo variant="primary" className="h-10 w-20 object-contain sm:h-14 sm:w-28 lg:w-36" />
            </a>
          </div>

          <div className="relative hidden min-w-0 flex-1 md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={browse}
              aria-label="Rechercher un produit ou un vendeur"
              placeholder="Que cherchez-vous à Adjamé ?"
              className="h-10 w-full rounded-md border border-input bg-secondary pl-10 pr-28 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 md:h-11"
            />
            <Button
              type="button"
              size="sm"
              onClick={browse}
              className="absolute right-1 top-1 h-8 bg-accent px-3 text-xs text-accent-foreground hover:bg-accent/90 md:h-9 md:px-4 md:text-sm"
            >
              Rechercher
            </Button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              className="relative h-10 w-10 sm:h-11 sm:w-auto sm:px-3"
              onClick={() => setCartOpen(true)}
              aria-label={cartCount > 0 ? `Panier avec ${cartCount} articles` : "Mon panier"}
            >
              <ShoppingBag className="size-5 sm:size-5" />
              <span className="hidden sm:inline">Mon panier</span>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground sm:size-5 sm:text-[11px]">
                  {cartCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Ouvrir le menu du profil"
                  title="Profil et compte"
                  className="h-10 w-10 sm:h-11 sm:w-11"
                >
                  <Avatar className="size-7 sm:size-8">
                    <AvatarImage src={profilePhotoUrl ?? undefined} alt="" />
                    <AvatarFallback>
                      <CircleUserRound className="size-4 sm:size-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 sm:w-72">
                <DropdownMenuLabel>
                  {isAuthenticated ? "Mon espace" : "Mon compte"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={isAuthenticated ? accountHref : "/auth"}>
                    <UserRound className="size-4" /> Votre compte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={isAuthenticated ? ordersHref : "/auth"}>
                    <ClipboardList className="size-4" /> Vos commandes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (isAuthenticated) {
                      setInboxOpen(true);
                      void inboxOrders.refetch();
                    } else {
                      void navigate({ to: "/auth" });
                    }
                  }}
                >
                  <Mail className="size-4" /> Boîte de réception
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (isAuthenticated) void navigate({ to: "/", search: { view: "favorites" } });
                    else void navigate({ to: "/auth" });
                  }}
                >
                  <Bookmark className="size-4" /> Favoris
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (isAuthenticated) setCouponsOpen(true);
                    else void navigate({ to: "/auth" });
                  }}
                >
                  <TicketPercent className="size-4" /> Bons d’achat
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={isAuthenticated ? settingsHref : "/auth"}>
                    <Settings className="size-4" /> Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAuthenticated ? (
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="size-4" /> Déconnexion
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/auth" search={{}}>
                      <LogIn className="size-4" /> Connexion
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div
        className="border-b border-accent/20 bg-accent text-accent-foreground"
        role="region"
        aria-label="Codes promotionnels et flash promos"
      >
        <p className="sr-only">Codes promotionnels, flash promos et bons d’achat.</p>
        <div className="overflow-hidden py-2" aria-hidden="true">
          <div className="promotion-marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-8 px-4 text-sm font-bold">
                <span className="inline-flex items-center gap-2">
                  <TicketPercent className="size-4" /> Codes promotionnels
                </span>
                <span className="text-accent-foreground/60">✦</span>
                <span className="inline-flex items-center gap-2">
                  <Zap className="size-4" /> Flash promos
                </span>
                <span className="text-accent-foreground/60">✦</span>
                <span>Découvrez les offres et bons d’achat disponibles</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog
        open={inboxOpen}
        onOpenChange={(open) => {
          setInboxOpen(open);
          if (!open && search.inbox === "open") {
            void navigate({
              to: "/",
              search: (previous) => {
                const { inbox: _closed, coupons: _coupons, ...rest } = previous;
                return rest;
              },
            });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Boîte de réception</DialogTitle>
            <DialogDescription>
              Suivez les dernières mises à jour de vos commandes et livraisons.
            </DialogDescription>
          </DialogHeader>
          {inboxOrders.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des mises à jour…</p>
          ) : inboxOrders.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Impossible de charger vos mises à jour. Réessayez dans un instant.
            </p>
          ) : inboxOrders.data?.length ? (
            <ul className="space-y-3">
              {inboxOrders.data.map((order) => (
                <li
                  key={order.id}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <Package className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {orderStatusLabels[order.status] ?? order.status}
                    </p>
                    <p className="text-sm text-muted-foreground">Commande {order.reference}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(order.updated_at))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-secondary p-4 text-sm text-muted-foreground">
              Aucune mise à jour pour le moment. Les nouvelles commandes et évolutions de livraison
              apparaîtront ici.
            </p>
          )}
          <Button asChild variant="outline" onClick={() => setInboxOpen(false)}>
            <Link to={ordersHref}>Voir mes commandes</Link>
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={couponsOpen}
        onOpenChange={(open) => {
          setCouponsOpen(open);
          if (!open && search.coupons === "open") {
            void navigate({
              to: "/",
              search: (previous) => {
                const { coupons: _closed, ...rest } = previous;
                return rest;
              },
            });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mes bons d’achat</DialogTitle>
            <DialogDescription>
              Chaque code peut être utilisé une fois et s’applique au montant des articles, hors
              livraison.
            </DialogDescription>
          </DialogHeader>
          {availableCoupons.isLoading ? (
            <p className="text-sm text-muted-foreground">Recherche des bons disponibles…</p>
          ) : availableCoupons.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {availableCoupons.error.message}
            </p>
          ) : availableCoupons.data?.length ? (
            <ul className="space-y-3">
              {availableCoupons.data.map((coupon) => (
                <li
                  key={coupon.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-bold">{coupon.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}% de réduction`
                        : `${formatPrice(coupon.discount_value)} de réduction`}
                    </p>
                    {coupon.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Valable jusqu’au{" "}
                        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                          new Date(coupon.expires_at),
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCouponCode(coupon.code);
                      setAppliedCoupon(null);
                      setCouponError(null);
                      setCouponsOpen(false);
                      setCartOpen(true);
                    }}
                  >
                    Utiliser
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-secondary p-4 text-sm text-muted-foreground">
              Aucun bon d’achat disponible pour le moment.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <div
        className="sticky top-16 z-30 border-b border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur sm:px-6 md:hidden"
      >
        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher un produit ou un vendeur"
              placeholder="Rechercher à Adjamé"
              className="h-11 w-full rounded-md border border-input bg-secondary pl-11 pr-28 text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={browse}
              className="absolute right-0 top-0 h-11 bg-accent px-3 text-accent-foreground hover:bg-accent/90"
            >
              Rechercher
            </Button>
          </div>
        </div>
      </div>

      <section id="top" className="relative min-h-[620px] overflow-hidden md:min-h-[690px]">
        <img
          src={heroImage}
          alt="Des clients découvrent les boutiques du marché d’Adjamé"
          width={1600}
          height={1000}
          className="absolute inset-0 size-full object-cover object-[66%_center] max-md:scale-110"
        />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-16 sm:px-6 md:min-h-[690px] lg:px-8">
          <div className="max-w-2xl text-primary-foreground">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-background/92 px-4 py-2 text-sm font-bold text-foreground shadow-lg">
              <MapPin className="size-4 text-accent" /> Le grand marché, maintenant chez vous
            </span>
            <h1 className="font-display text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              Tout Adjamé,
              <br />
              sans la foule.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
              Trouvez les bons vendeurs, commandez au prix du marché et recevez vos articles partout
              à Abidjan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={browse}
                className="h-13 bg-accent px-6 text-accent-foreground shadow-xl hover:bg-accent/90"
              >
                Explorer le marché <ArrowRight />
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-highlight" /> Vendeurs vérifiés
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-highlight" /> Livraison suivie
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-highlight" /> Paiement à la livraison
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-border px-4 py-6 sm:px-6 lg:px-8">
          <div className="px-2 text-center sm:px-8">
            <strong className="block font-display text-xl text-primary sm:text-2xl">120+</strong>
            <span className="text-xs text-muted-foreground sm:text-sm">vendeurs locaux</span>
          </div>
          <div className="px-2 text-center sm:px-8">
            <strong className="block font-display text-xl text-primary sm:text-2xl">
              12 communes
            </strong>
            <span className="text-xs text-muted-foreground sm:text-sm">desservies</span>
          </div>
          <div className="px-2 text-center sm:px-8">
            <strong className="block font-display text-xl text-primary sm:text-2xl">4,8/5</strong>
            <span className="text-xs text-muted-foreground sm:text-sm">clients satisfaits</span>
          </div>
        </div>
      </section>

      <section id="catalogue" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-bold uppercase text-accent">Trouvailles du moment</p>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                Le marché vient à vous
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Articles proposés par des commerçants d’Adjamé. Le coursier confirme la disponibilité
              avant de partir.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
              Nos catégories
            </h3>
            {categories.length > 7 && (
              <Button
                type="button"
                variant="link"
                onClick={() => setShowAllCategories((current) => !current)}
                className="h-auto px-0 font-semibold text-primary"
              >
                {showAllCategories ? "Voir moins" : "Voir plus"}
              </Button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleCategories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                onClick={() => {
                  setActiveCategory(category);
                  setActiveSubcategory(null);
                }}
                className="h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left"
              >
                {category}
              </Button>
            ))}
          </div>
          {activeSubcategory && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Sous-catégorie : <strong className="text-foreground">{activeSubcategory}</strong>
              </span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() => setActiveSubcategory(null)}
              >
                Effacer
              </Button>
            </div>
          )}

          <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-3">
            {visibleProducts.map((product, index) => (
              <article
                key={product.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-brand"
              >
                <button
                  type="button"
                  onClick={() => openProduct(product.id)}
                  aria-label={`Voir les détails de ${product.name}`}
                  className={`relative block aspect-square w-full overflow-hidden text-left ${index % 3 === 0 ? "bg-sun" : index % 3 === 1 ? "bg-mint" : "bg-lemon"}`}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      width={912}
                      height={912}
                      loading="lazy"
                      className="size-full object-cover transition duration-500 group-hover:scale-110 motion-reduce:transition-none"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-primary/50">
                      <ShoppingBag className="size-16" />
                    </span>
                  )}
                  <span className="absolute left-3 top-3 rounded-sm bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm">
                    {product.subcategory ?? product.category}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-3 top-3 z-10 rounded-full shadow-md"
                  aria-label={
                    likedProducts.has(product.id)
                      ? `Ne plus aimer ${product.name}`
                      : `Aimer ${product.name}`
                  }
                  aria-pressed={likedProducts.has(product.id)}
                  onClick={() => void toggleProductAction(product.id, "liked")}
                >
                  <Heart
                    className={
                      likedProducts.has(product.id) ? "size-4 fill-current text-primary" : "size-4"
                    }
                  />
                </Button>
                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Link
                      to="/boutique/$vendorId"
                      params={{ vendorId: product.vendor_id }}
                      aria-label={`Voir la boutique ${product.seller}`}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Store className="size-4" /> {product.seller}
                      {product.sellerVerified && <BadgeCheck className="size-4" />}
                    </Link>
                    <span className="text-xs text-muted-foreground">{product.stock} en stock</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openProduct(product.id)}
                    className="text-left font-display text-lg font-bold hover:text-primary"
                  >
                    {product.name}
                  </button>
                  {typeof product.rating === "number" && (
                    <p
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                      aria-label={`Note moyenne ${product.rating.toFixed(1)} sur 5, ${product.ratingCount} avis`}
                    >
                      <Star className="size-3.5 fill-amber-500 text-amber-500" />
                      {product.rating.toFixed(1)} ({product.ratingCount} avis)
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {product.description ||
                      "Voir la fiche pour découvrir les informations du produit."}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <strong className="block text-lg">{formatPrice(product.price)}</strong>
                    {cart[product.id] ? (
                      <div className="flex h-10 items-center rounded-md border border-primary">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateCart(product.id, -1)}
                          aria-label={`Retirer un ${product.name}`}
                        >
                          <Minus />
                        </Button>
                        <span className="w-7 text-center text-sm font-bold">
                          {cart[product.id]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={(cart[product.id] ?? 0) >= product.stock}
                          onClick={() => updateCart(product.id, 1)}
                          aria-label={`Ajouter un ${product.name}`}
                        >
                          <Plus />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        onClick={() => updateCart(product.id, 1)}
                        aria-label={`Ajouter ${product.name} au panier`}
                      >
                        <Plus />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {productsLoading && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Chargement des produits…
            </p>
          )}
          {productsError && (
            <p role="alert" className="mt-8 text-center text-sm text-destructive">
              Le catalogue n’a pas pu être chargé. Veuillez actualiser la page.
            </p>
          )}
          {visibleProducts.length === 0 && !productsLoading && !productsError && (
            <div className="mt-8 border-y border-border py-16 text-center">
              <p className="font-display text-xl font-bold">Aucun article trouvé</p>
              <Button
                variant="link"
                onClick={() => {
                  setQuery("");
                  setActiveCategory("Tout");
                  setActiveSubcategory(null);
                }}
              >
                Voir tout le marché
              </Button>
            </div>
          )}
        </div>
      </section>

      <Dialog
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => {
          if (!open) closeProduct();
        }}
      >
        {selectedProduct && (
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative min-h-64 bg-secondary md:min-h-[28rem]">
                <ProductImageGallery
                  images={[selectedProduct.image, ...selectedProduct.additionalImages]}
                  productName={selectedProduct.name}
                  className="space-y-2 p-3"
                  imageClassName="aspect-square"
                  hoverZoom
                />
                <span className="absolute left-4 top-4 rounded-sm bg-background px-3 py-1.5 text-xs font-bold shadow-sm">
                  {selectedProduct.subcategory ?? selectedProduct.category}
                </span>
              </div>

              <div className="space-y-5 p-6 sm:p-8">
                <DialogHeader className="space-y-2 pr-7 text-left">
                  <DialogTitle className="font-display text-2xl font-extrabold">
                    {selectedProduct.name}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedProduct.description ||
                      "Aucune description supplémentaire n’a été fournie pour cet article."}
                  </DialogDescription>
                </DialogHeader>

                <strong className="block font-display text-2xl text-primary">
                  {formatPrice(selectedProduct.price)}
                </strong>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="font-semibold">
                    {selectedProduct.stock} article{selectedProduct.stock === 1 ? "" : "s"}{" "}
                    disponible
                    {selectedProduct.stock === 1 ? "" : "s"}
                  </span>
                  {typeof selectedProduct.rating === "number" && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Star className="size-4 fill-amber-500 text-amber-500" />
                      {selectedProduct.rating.toFixed(1)} ({selectedProduct.ratingCount} avis)
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vendeur
                  </p>
                  <Link
                    to="/boutique/$vendorId"
                    params={{ vendorId: selectedProduct.vendor_id }}
                    className="mt-2 flex items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-primary">
                      <Store className="size-5" />
                    </span>
                    <span>
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        {selectedProduct.sellerName}
                        {selectedProduct.sellerVerified && (
                          <BadgeCheck
                            className="size-4 text-primary"
                            aria-label="Vendeur vérifié"
                          />
                        )}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {selectedProduct.seller}
                      </span>
                      {selectedProduct.sellerStall && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Emplacement : {selectedProduct.sellerStall}
                        </span>
                      )}
                      <span className="mt-1 block text-xs font-semibold text-primary">
                        Voir la boutique et ses articles
                      </span>
                    </span>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={likedProducts.has(selectedProduct.id) ? "default" : "outline"}
                    aria-pressed={likedProducts.has(selectedProduct.id)}
                    onClick={() => void toggleProductAction(selectedProduct.id, "liked")}
                  >
                    <Heart
                      className={
                        likedProducts.has(selectedProduct.id) ? "size-4 fill-current" : "size-4"
                      }
                    />
                    J’aime
                  </Button>
                  <Button
                    type="button"
                    variant={favoriteProducts.has(selectedProduct.id) ? "default" : "outline"}
                    aria-pressed={favoriteProducts.has(selectedProduct.id)}
                    onClick={() => void toggleProductAction(selectedProduct.id, "favorite")}
                  >
                    <Bookmark
                      className={
                        favoriteProducts.has(selectedProduct.id) ? "size-4 fill-current" : "size-4"
                      }
                    />
                    Favori
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void shareProduct(selectedProduct)}
                  >
                    <Share2 className="size-4" />
                    Partager
                  </Button>
                </div>
                {shareMessage && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {shareMessage}
                  </p>
                )}

                <Button
                  type="button"
                  className="h-12 w-full"
                  onClick={() => {
                    updateCart(selectedProduct.id, 1);
                    closeProduct();
                    setCartOpen(true);
                  }}
                >
                  <ShoppingBag className="size-4" />
                  Acheter ce produit
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  La disponibilité et le prix seront confirmés par le vendeur avant la livraison.
                </p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <section id="livraison" className="bg-secondary py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-2 text-sm font-bold uppercase text-accent">Simple comme bonjour</p>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                Du marché à votre porte
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Un service humain, pensé pour les réalités d’Abidjan.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                [Store, "01", "Choisissez", "Parcourez les offres des vendeurs vérifiés."],
                [BadgeCheck, "02", "Confirmez", "Un agent vérifie le prix et la disponibilité."],
                [Bike, "03", "Recevez", "Un coursier récupère et livre votre commande."],
              ].map(([Icon, number, title, text]) => {
                const StepIcon = Icon as typeof Store;
                return (
                  <div key={String(number)} className="border-l-2 border-primary bg-background p-5">
                    <div className="flex items-center justify-between">
                      <StepIcon className="size-6 text-primary" />
                      <span className="font-display text-2xl font-black text-border">
                        {String(number)}
                      </span>
                    </div>
                    <h3 className="mt-8 font-display text-lg font-bold">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {String(text)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-foreground py-10 text-background">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <BrandLogo variant="primary" className="h-16 w-32 object-contain" />
            <p className="mt-1 text-sm text-background/65">Adjamé à portée de main.</p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-background/75">
            <a href="#catalogue">Catalogue</a>
            <a href="#livraison">Livraison</a>
            <Link to="/auth" search={{ mode: "signup", role: "vendeur" }}>
              Devenir vendeur
            </Link>
            <Link to="/auth" search={{}}>
              Espace pro
            </Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/conditions-utilisation">Conditions d’utilisation</Link>
            <span>Abidjan, Côte d’Ivoire</span>
          </div>
        </div>
      </footer>

      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/45"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setCartOpen(false);
          }}
        >
          <aside
            className="ml-auto flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Mon panier"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-xl font-bold">Mon panier</h2>
                <p className="text-xs text-muted-foreground">
                  {cartCount} article{cartCount > 1 ? "s" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCartOpen(false)}
                aria-label="Fermer le panier"
              >
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {ordered ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="grid size-16 place-items-center rounded-full bg-mint text-primary">
                    <Check className="size-8" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-bold">Demande envoyée !</h3>
                  <div className="mt-3 space-y-2">
                    {ordered.map((order) => (
                      <div key={order.reference} className="rounded-md bg-secondary p-3 text-sm">
                        <p className="font-semibold">
                          {order.vendor_name} · {order.reference}
                        </p>
                        <p className="text-muted-foreground">
                          Articles : {formatPrice(order.items_total)}
                          {order.discount_total > 0 &&
                            ` · Réduction : -${formatPrice(order.discount_total)}`}
                          {" · Livraison : "}
                          {formatPrice(order.delivery_fee)}
                          {" · Total : "}
                          {formatPrice(
                            order.items_total - order.discount_total + order.delivery_fee,
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Un agent Mon Djassaman vous appelle au {form.customer_phone} pour confirmer la
                    disponibilité de chaque commande.
                  </p>
                </div>
              ) : cartCount === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="size-12 text-muted-foreground" />
                  <h3 className="mt-4 font-display text-xl font-bold">Votre panier est vide</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ajoutez une trouvaille du marché.
                  </p>
                  <Button
                    className="mt-5"
                    onClick={() => {
                      setCartOpen(false);
                      browse();
                    }}
                  >
                    Voir les articles
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex gap-4 border-b border-border pb-5">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          className="size-20 rounded-md object-cover"
                        />
                      ) : (
                        <span className="grid size-20 place-items-center rounded-md bg-secondary text-primary">
                          <ShoppingBag />
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {product.seller} · {formatPrice(product.price)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => updateCart(product.id, -1)}
                          >
                            <Minus />
                          </Button>
                          <span className="w-5 text-center text-sm font-bold">
                            {cart[product.id]}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            disabled={(cart[product.id] ?? 0) >= product.stock}
                            onClick={() => updateCart(product.id, 1)}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!ordered && cartCount > 0 && (
              <form
                className="space-y-3 border-t border-border p-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    const { data: authData, error: authError } = await supabase.auth.getUser();
                    if (authError) throw authError;
                    if (!authData.user) {
                      void navigate({ to: "/auth" });
                      return;
                    }
                    setSending(true);
                    setOrderError(null);
                    const { data: sessionData, error: sessionError } =
                      await supabase.auth.getSession();
                    if (sessionError) throw sessionError;
                    const result = await requestDelivery({
                      data: {
                        customer_name: form.customer_name,
                        customer_phone: form.customer_phone,
                        commune: form.commune,
                        address: form.address,
                        accessToken: sessionData.session?.access_token ?? "",
                        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
                        items: selectedProducts.map((product) => ({
                          product_id: product.id,
                          quantity: cart[product.id],
                        })),
                      },
                    });
                    setOrdered(result);
                    setCart({});
                    setCouponCode("");
                    setAppliedCoupon(null);
                    setCouponError(null);
                  } catch (error) {
                    const message = error instanceof Error ? error.message.toLowerCase() : "";
                    const couponMessage =
                      error instanceof Error && message.includes("promo") ? error.message : null;
                    setOrderError(
                      couponMessage ??
                        (message.includes("stock") || message.includes("disponible")
                          ? "Un ou plusieurs articles ne sont plus disponibles ou le stock est insuffisant. Corrigez votre panier puis réessayez."
                          : "Impossible d’envoyer la demande. Vérifiez vos informations et réessayez."),
                    );
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <div className="flex justify-between font-bold">
                  <span>Sous-total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value.toUpperCase());
                        setAppliedCoupon(null);
                        setCouponError(null);
                      }}
                      aria-label="Code promo"
                      placeholder="Code promo"
                      maxLength={40}
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-secondary px-3 text-sm uppercase outline-none focus:border-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={couponChecking || !couponCode.trim()}
                      onClick={() => void applyCoupon()}
                    >
                      {couponChecking ? "Vérification…" : "Appliquer"}
                    </Button>
                  </div>
                  {couponError && (
                    <p role="alert" className="text-xs text-destructive">
                      {couponError}
                    </p>
                  )}
                  {appliedCoupon && (
                    <p role="status" className="text-xs font-semibold text-primary">
                      Code {appliedCoupon.code} appliqué : -
                      {formatPrice(appliedCoupon.discountTotal)}
                    </p>
                  )}
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm font-semibold text-primary">
                    <span>Réduction</span>
                    <span>-{formatPrice(appliedCoupon.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Livraison ({form.commune}, {selectedVendorCount} boutique
                    {selectedVendorCount > 1 ? "s" : ""})
                  </span>
                  <span>{formatPrice(deliveryTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>Total à payer</span>
                  <span>
                    {formatPrice(cartTotal - (appliedCoupon?.discountTotal ?? 0) + deliveryTotal)}
                  </span>
                </div>
                <input
                  required
                  minLength={2}
                  placeholder="Votre nom"
                  aria-label="Votre nom"
                  value={form.customer_name}
                  onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
                  className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                />
                {customerProfile.isError && (
                  <p role="status" className="text-xs text-muted-foreground">
                    Vos coordonnées enregistrées n’ont pas pu être chargées; vous pouvez les saisir
                    manuellement.
                  </p>
                )}
                <input
                  required
                  minLength={8}
                  placeholder="Téléphone (WhatsApp)"
                  aria-label="Téléphone"
                  value={form.customer_phone}
                  onChange={(event) => setForm({ ...form, customer_phone: event.target.value })}
                  className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                />
                <select
                  aria-label="Commune de livraison"
                  value={form.commune}
                  onChange={(event) => setForm({ ...form, commune: event.target.value })}
                  className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                >
                  {communes.map((commune) => (
                    <option key={commune} value={commune}>
                      {commune}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Quartier, repère (facultatif)"
                  aria-label="Adresse"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                />
                {orderError && <p className="text-sm text-destructive">{orderError}</p>}
                <Button type="submit" disabled={sending} className="h-12 w-full">
                  {sending ? "Envoi en cours…" : "Demander la livraison"} <ChevronRight />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Paiement à la livraison ou Mobile Money, après confirmation du vendeur.
                </p>
                <p className="text-xs text-muted-foreground">
                  Créez un{" "}
                  <Link
                    to="/auth"
                    search={{ mode: "signup", role: "client" }}
                    className="font-semibold text-primary underline"
                  >
                    espace client
                  </Link>{" "}
                  pour retrouver vos commandes et leur suivi.
                </p>
              </form>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#25D366"
        d="M12.04 2C6.52 2 2.03 6.48 2.03 12c0 1.77.46 3.5 1.34 5.03L2 22l5.1-1.33A10 10 0 1 0 12.04 2Z"
      />
      <path
        fill="#fff"
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.29-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.47-2.4-1.49-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.49.71.3 1.27.48 1.7.62.72.23 1.37.2 1.88.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"
      />
    </svg>
  );
}
