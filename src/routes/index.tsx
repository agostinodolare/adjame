import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Check,
  ChevronRight,
  MapPin,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import heroImage from "@/assets/adjame-market-hero.jpg";
import basketsImage from "@/assets/product-baskets.jpg";
import phoneImage from "@/assets/product-phone.jpg";
import sneakersImage from "@/assets/product-sneakers.jpg";
import { Button } from "@/components/ui/button";
import { communes, deliveryFeeFor, requestDelivery } from "@/lib/orders.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarchéGo — Les bonnes affaires d’Adjamé, livrées chez vous" },
      {
        name: "description",
        content:
          "Découvrez les vendeurs d’Adjamé, choisissez vos articles et faites-vous livrer partout à Abidjan.",
      },
      { property: "og:title", content: "MarchéGo — Adjamé chez vous" },
      {
        property: "og:description",
        content: "Les meilleurs vendeurs d’Adjamé réunis en un seul endroit, avec livraison à Abidjan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const categories = ["Tout", "Femme", "Homme", "Enfant", "Chaussures", "Téléphones"];

const products = [
  {
    id: 1,
    name: "Paniers tressés artisanaux",
    seller: "Chez Awa Créations",
    category: "Femme",
    price: 8500,
    oldPrice: 10000,
    image: basketsImage,
    tone: "bg-sun",
    badge: "Populaire",
  },
  {
    id: 2,
    name: "Baskets urbaines Kalo",
    seller: "Bamba Shoes",
    category: "Chaussures",
    price: 15000,
    oldPrice: 18000,
    image: sneakersImage,
    tone: "bg-mint",
    badge: "Nouveau",
  },
  {
    id: 3,
    name: "Smartphone Nexo A15",
    seller: "Adjamé Digital",
    category: "Téléphones",
    price: 79500,
    oldPrice: 85000,
    image: phoneImage,
    tone: "bg-lemon",
    badge: "Bon prix",
  },
];

const formatPrice = (price: number) => new Intl.NumberFormat("fr-FR").format(price) + " F";

function Index() {
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ordered, setOrdered] = useState<{ reference: string; delivery_fee: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    commune: "Adjamé",
    address: "",
  });

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = activeCategory === "Tout" || product.category === activeCategory;
      const searchMatch = `${product.name} ${product.seller}`.toLowerCase().includes(query.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, query]);

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartTotal = products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0);

  const updateCart = (id: number, change: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[id] ?? 0) + change);
      const next = { ...current, [id]: quantity };
      if (quantity === 0) delete next[id];
      return next;
    });
  };

  const browse = () => document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex shrink-0 items-center gap-2.5" aria-label="Accueil MarchéGo">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-brand">
              <ShoppingBag className="size-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-xl font-extrabold">Marché<span className="text-primary">Go</span></span>
          </a>

          <div className="relative hidden max-w-lg flex-1 md:block">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={browse}
              aria-label="Rechercher un produit ou un vendeur"
              placeholder="Que cherchez-vous à Adjamé ?"
              className="h-11 w-full rounded-md border border-input bg-secondary pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <nav className="ml-auto hidden items-center gap-6 lg:flex" aria-label="Navigation principale">
            <a href="#catalogue" className="text-sm font-semibold hover:text-primary">Boutiques</a>
            <a href="#livraison" className="text-sm font-semibold hover:text-primary">Comment ça marche</a>
            <Link to="/auth" search={{ mode: "signup", role: "vendeur" }} className="text-sm font-semibold hover:text-primary">
              Devenir vendeur
            </Link>
            <Link to="/auth" search={{}} className="text-sm font-semibold text-muted-foreground hover:text-primary">
              Espace pro
            </Link>
          </nav>

          <Button variant="outline" className="relative ml-auto h-11 px-3 lg:ml-0" onClick={() => setCartOpen(true)}>
            <ShoppingBag />
            <span className="hidden sm:inline">Mon panier</span>
            {cartCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                {cartCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
            <div className="relative mb-4 md:hidden">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher à Adjamé" className="h-11 w-full rounded-md border border-input bg-secondary pl-11 pr-4 text-sm" />
            </div>
            <a href="#catalogue" onClick={() => setMenuOpen(false)} className="block py-2 font-semibold">Boutiques</a>
            <a href="#livraison" onClick={() => setMenuOpen(false)} className="block py-2 font-semibold">Comment ça marche</a>
            <Link to="/auth" search={{ mode: "signup", role: "vendeur" }} onClick={() => setMenuOpen(false)} className="block py-2 font-semibold text-primary">Devenir vendeur</Link>
            <Link to="/auth" search={{}} onClick={() => setMenuOpen(false)} className="block py-2 font-semibold text-muted-foreground">Espace pro (connexion)</Link>
          </div>
        )}
      </header>

      <section id="top" className="relative min-h-[620px] md:min-h-[690px]">
        <img src={heroImage} alt="Des clients découvrent les boutiques du marché d’Adjamé" width={1600} height={1000} className="absolute inset-0 size-full object-cover object-[66%_center]" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-16 sm:px-6 md:min-h-[690px] lg:px-8">
          <div className="max-w-2xl text-primary-foreground">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-background/92 px-4 py-2 text-sm font-bold text-foreground shadow-lg">
              <MapPin className="size-4 text-accent" /> Le grand marché, maintenant chez vous
            </span>
            <h1 className="font-display text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              Tout Adjamé,<br />sans la foule.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
              Trouvez les bons vendeurs, commandez au prix du marché et recevez vos articles partout à Abidjan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={browse} className="h-13 bg-accent px-6 text-accent-foreground shadow-xl hover:bg-accent/90">
                Explorer le marché <ArrowRight />
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
              <span className="flex items-center gap-2"><Check className="size-4 text-highlight" /> Vendeurs vérifiés</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-highlight" /> Livraison suivie</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-highlight" /> Paiement à la livraison</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-border px-4 py-6 sm:px-6 lg:px-8">
          <div className="px-2 text-center sm:px-8"><strong className="block font-display text-xl text-primary sm:text-2xl">120+</strong><span className="text-xs text-muted-foreground sm:text-sm">vendeurs locaux</span></div>
          <div className="px-2 text-center sm:px-8"><strong className="block font-display text-xl text-primary sm:text-2xl">10 communes</strong><span className="text-xs text-muted-foreground sm:text-sm">desservies</span></div>
          <div className="px-2 text-center sm:px-8"><strong className="block font-display text-xl text-primary sm:text-2xl">4,8/5</strong><span className="text-xs text-muted-foreground sm:text-sm">clients satisfaits</span></div>
        </div>
      </section>

      <section id="catalogue" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-bold uppercase text-accent">Trouvailles du moment</p>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Le marché vient à vous</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Articles proposés par des commerçants d’Adjamé. Le coursier confirme la disponibilité avant de partir.</p>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-3 scrollbar-none">
            {categories.map((category) => (
              <Button key={category} variant={activeCategory === category ? "default" : "outline"} onClick={() => setActiveCategory(category)} className="shrink-0">
                {category}
              </Button>
            ))}
          </div>

          <div className="mt-7 grid gap-6 md:grid-cols-3">
            {visibleProducts.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-lg border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-brand">
                <div className={`relative aspect-square overflow-hidden ${product.tone}`}>
                  <img src={product.image} alt={product.name} width={912} height={912} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <span className="absolute left-3 top-3 rounded-sm bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm">{product.badge}</span>
                </div>
                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary"><BadgeCheck className="size-4" /> {product.seller}</span>
                    <span className="flex items-center gap-1 text-xs font-bold"><Star className="size-3 fill-highlight text-highlight" /> 4,8</span>
                  </div>
                  <h3 className="font-display text-lg font-bold">{product.name}</h3>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div><strong className="block text-lg">{formatPrice(product.price)}</strong><span className="text-xs text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span></div>
                    {cart[product.id] ? (
                      <div className="flex h-10 items-center rounded-md border border-primary">
                        <Button variant="ghost" size="icon" onClick={() => updateCart(product.id, -1)} aria-label={`Retirer un ${product.name}`}><Minus /></Button>
                        <span className="w-7 text-center text-sm font-bold">{cart[product.id]}</span>
                        <Button variant="ghost" size="icon" onClick={() => updateCart(product.id, 1)} aria-label={`Ajouter un ${product.name}`}><Plus /></Button>
                      </div>
                    ) : (
                      <Button size="icon" onClick={() => updateCart(product.id, 1)} aria-label={`Ajouter ${product.name} au panier`}><Plus /></Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {visibleProducts.length === 0 && (
            <div className="mt-8 border-y border-border py-16 text-center"><p className="font-display text-xl font-bold">Aucun article trouvé</p><Button variant="link" onClick={() => { setQuery(""); setActiveCategory("Tout"); }}>Voir tout le marché</Button></div>
          )}
        </div>
      </section>

      <section id="livraison" className="bg-secondary py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-2 text-sm font-bold uppercase text-accent">Simple comme bonjour</p>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Du marché à votre porte</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">Un service humain, pensé pour les réalités d’Abidjan.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [Store, "01", "Choisissez", "Parcourez les offres des vendeurs vérifiés."],
                [BadgeCheck, "02", "Confirmez", "Un agent vérifie le prix et la disponibilité."],
                [Bike, "03", "Recevez", "Un coursier récupère et livre votre commande."],
              ].map(([Icon, number, title, text]) => {
                const StepIcon = Icon as typeof Store;
                return (
                  <div key={String(number)} className="border-l-2 border-primary bg-background p-5">
                    <div className="flex items-center justify-between"><StepIcon className="size-6 text-primary" /><span className="font-display text-2xl font-black text-border">{String(number)}</span></div>
                    <h3 className="mt-8 font-display text-lg font-bold">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{String(text)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-foreground py-10 text-background">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div><span className="font-display text-xl font-extrabold">MarchéGo</span><p className="mt-1 text-sm text-background/65">Adjamé à portée de main.</p></div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-background/75"><a href="#catalogue">Catalogue</a><a href="#livraison">Livraison</a><Link to="/auth" search={{ mode: "signup", role: "vendeur" }}>Devenir vendeur</Link><Link to="/auth" search={{}}>Espace pro</Link><span>Abidjan, Côte d’Ivoire</span></div>
        </div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/45" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCartOpen(false); }}>
          <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-background shadow-2xl" role="dialog" aria-modal="true" aria-label="Mon panier">
            <div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-display text-xl font-bold">Mon panier</h2><p className="text-xs text-muted-foreground">{cartCount} article{cartCount > 1 ? "s" : ""}</p></div><Button variant="ghost" size="icon" onClick={() => setCartOpen(false)} aria-label="Fermer le panier"><X /></Button></div>
            <div className="flex-1 overflow-y-auto p-5">
              {ordered ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="grid size-16 place-items-center rounded-full bg-mint text-primary"><Check className="size-8" /></span>
                  <h3 className="mt-5 font-display text-2xl font-bold">Demande envoyée !</h3>
                  <p className="mt-2 font-semibold">Commande {ordered.reference}</p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Livraison à {form.commune} : {formatPrice(ordered.delivery_fee)}. Un agent MarchéGo vous appelle au {form.customer_phone} pour confirmer la disponibilité chez le vendeur.
                  </p>
                </div>
              ) : cartCount === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center"><ShoppingBag className="size-12 text-muted-foreground" /><h3 className="mt-4 font-display text-xl font-bold">Votre panier est vide</h3><p className="mt-2 text-sm text-muted-foreground">Ajoutez une trouvaille du marché.</p><Button className="mt-5" onClick={() => { setCartOpen(false); browse(); }}>Voir les articles</Button></div>
              ) : (
                <div className="space-y-5">
                  {products.filter((product) => cart[product.id]).map((product) => (
                    <div key={product.id} className="flex gap-4 border-b border-border pb-5"><img src={product.image} alt="" className="size-20 rounded-md object-cover" /><div className="flex-1"><p className="font-semibold">{product.name}</p><p className="mt-1 text-sm text-muted-foreground">{formatPrice(product.price)}</p><div className="mt-2 flex items-center gap-2"><Button variant="outline" size="icon" className="size-8" onClick={() => updateCart(product.id, -1)}><Minus /></Button><span className="w-5 text-center text-sm font-bold">{cart[product.id]}</span><Button variant="outline" size="icon" className="size-8" onClick={() => updateCart(product.id, 1)}><Plus /></Button></div></div></div>
                  ))}
                </div>
              )}
            </div>
            {!ordered && cartCount > 0 && (
              <form
                className="space-y-3 border-t border-border p-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setSending(true);
                  setOrderError(null);
                  try {
                    const firstSeller = products.find((product) => cart[product.id])?.seller;
                    const result = await requestDelivery({
                      data: {
                        customer_name: form.customer_name,
                        customer_phone: form.customer_phone,
                        commune: form.commune,
                        address: form.address,
                        items_total: cartTotal,
                        shop_name: firstSeller,
                      },
                    });
                    setOrdered(result);
                    setCart({});
                  } catch {
                    setOrderError("Impossible d’envoyer la demande. Vérifiez vos informations et réessayez.");
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <div className="flex justify-between font-bold"><span>Sous-total</span><span>{formatPrice(cartTotal)}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Livraison ({form.commune})</span><span>{formatPrice(deliveryFeeFor(form.commune))}</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-bold"><span>Total à payer</span><span>{formatPrice(cartTotal + deliveryFeeFor(form.commune))}</span></div>
                <input required minLength={2} placeholder="Votre nom" aria-label="Votre nom" value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary" />
                <input required minLength={8} placeholder="Téléphone (WhatsApp)" aria-label="Téléphone" value={form.customer_phone} onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary" />
                <select aria-label="Commune de livraison" value={form.commune} onChange={(event) => setForm({ ...form, commune: event.target.value })} className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary">
                  {communes.map((commune) => (
                    <option key={commune} value={commune}>{commune}</option>
                  ))}
                </select>
                <input placeholder="Quartier, repère (facultatif)" aria-label="Adresse" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary" />
                {orderError && <p className="text-sm text-destructive">{orderError}</p>}
                <Button type="submit" disabled={sending} className="h-12 w-full">
                  {sending ? "Envoi en cours…" : "Demander la livraison"} <ChevronRight />
                </Button>
                <p className="text-xs text-muted-foreground">Paiement à la livraison ou Mobile Money, après confirmation du vendeur.</p>
              </form>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}