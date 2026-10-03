import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, ShieldCheck, Store, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { registerVendorApplication, vendorSignupCategories } from "@/lib/signup.functions";

type Mode = "signin" | "signup";
type Profile = "vendeur" | "livreur" | "equipe";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { mode?: "signup"; role?: "vendeur" } => ({
    ...(search['mode'] === "signup" ? { mode: "signup" as const } : {}),
    ...(search['role'] === "vendeur" ? { role: "vendeur" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Connexion et création de compte — MarchéGo" },
      {
        name: "description",
        content:
          "Créez votre compte vendeur d’Adjamé ou connectez-vous à l’espace de gestion MarchéGo.",
      },
      { property: "og:title", content: "Espace pro MarchéGo" },
      {
        property: "og:description",
        content: "Compte vendeur ou accès équipe pour gérer boutiques, commandes et livraisons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm sm:h-11 sm:px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [profile, setProfile] = useState<Profile>(search.role ?? "equipe");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shop, setShop] = useState({
    name: "",
    shop_name: "",
    category: "",
    phone: "",
    stall: "",
  });
  const [courier, setCourier] = useState({
    name: "",
    phone: "",
    vehicle: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Vérifier les rôles de l'utilisateur
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        
        if (rolesData && rolesData.length > 0) {
          const roles = rolesData.map((row) => row.role as "admin" | "staff" | "vendeur" | "livreur");
          const order: ("admin" | "staff" | "vendeur" | "livreur")[] = ["admin", "staff", "livreur", "vendeur"];
          const primaryRole = order.find((role) => roles.includes(role));
          
          if (primaryRole) {
            const roleHomeMap = {
              admin: "/admin",
              staff: "/admin",
              vendeur: "/",
              livreur: "/",
            };
            navigate({ to: roleHomeMap[primaryRole], replace: true });
            return;
          }
        }
        // Si pas de rôle, ne pas déconnecter, juste informer
        // L'utilisateur verra le formulaire avec un message
        setError("Votre compte n'a pas encore été activé. Un administrateur doit vous attribuer un rôle pour accéder à la plateforme.");
      }
    });
  }, [navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setMessage(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });

      if (signUpError) {
        setError(traduire(signUpError.message));
        setLoading(false);
        return;
      }

      if (profile === "vendeur" && data.user) {
        try {
          await registerVendorApplication({
            data: {
              user_id: data.user.id,
              name: shop.name,
              shop_name: shop.shop_name,
              category: shop.category,
              phone: shop.phone,
              stall: shop.stall,
            },
          });
        } catch {
          setError(
            "Votre compte est créé mais la boutique n'a pas pu être enregistrée. Contactez l'équipe MarchéGo.",
          );
          setLoading(false);
          return;
        }
      } else if (profile === "livreur" && data.user) {
        try {
          // TODO: Implémenter registerCourierApplication avec l'API
          // await registerCourierApplication({ data: { user_id: data.user.id, ...courier } });
        } catch {
          setError(
            "Votre compte est créé mais l'inscription au programme de livreur n'a pas pu être finalisée. Contactez l'équipe MarchéGo.",
          );
          setLoading(false);
          return;
        }
      }

      if (data.session) navigate({ to: "/admin", replace: true });
      else if (profile === "vendeur")
        setMessage(
          "Demande envoyée ! Ouvrez l’e-mail de confirmation, puis un agent MarchéGo vérifie votre boutique avant sa mise en ligne.",
        );
      else if (profile === "livreur")
        setMessage(
          "Inscription complétée ! Ouvrez l'e-mail de confirmation pour activer votre compte livreur.",
        );
      else setMessage("Compte créé. Ouvrez l'e-mail de confirmation pour activer l'accès.");
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(traduire(signInError.message));
      } else if (signInData.user) {
        // Vérifier les rôles de l'utilisateur directement avec son ID
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signInData.user.id);
        
        if (rolesError || !rolesData || rolesData.length === 0) {
          // Utilisateur connecté mais sans rôle attribué
          setError("Votre compte n'a pas encore été activé. Un administrateur doit vous attribuer un rôle pour accéder à la plateforme.");
        } else {
          // Déterminer le rôle principal
          const roles = rolesData.map((row) => row.role as "admin" | "staff" | "vendeur" | "livreur");
          const order: ("admin" | "staff" | "vendeur" | "livreur")[] = ["admin", "staff", "livreur", "vendeur"];
          const primaryRole = order.find((role) => roles.includes(role)) ?? null;
          
          // Rediriger vers la page appropriée selon le rôle
          if (primaryRole) {
            const roleHomeMap = {
              admin: "/admin",
              staff: "/admin",
              vendeur: "/",
              livreur: "/",
            };
            navigate({ to: roleHomeMap[primaryRole], replace: true });
          } else {
            setError("Rôle invalide. Contactez l'administrateur.");
          }
        }
      } else {
        setError("Erreur de connexion. Veuillez réessayer.");
      }
    }

    setLoading(false);
  };

  const isVendorSignup = mode === "signup" && profile === "vendeur";
  const isCourierSignup = mode === "signup" && profile === "livreur";

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-3 py-8 sm:px-4 sm:py-12">
      <div className="w-full max-w-[90vw] max-w-md rounded-lg border border-border bg-background p-4 shadow-soft sm:p-6 md:p-7">
        <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground">
          {isVendorSignup ? <Store className="size-6" /> : isCourierSignup ? <Truck className="size-6" /> : <ShieldCheck className="size-6" />}
        </span>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`h-10 rounded-sm text-sm font-bold transition ${mode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`h-10 rounded-sm text-sm font-bold transition ${mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Créer un compte
          </button>
        </div>

        <h1 className="mt-5 font-display text-2xl font-extrabold">
          {mode === "signin"
            ? "Espace pro MarchéGo"
            : isVendorSignup
              ? "Créer mon compte vendeur"
              : isCourierSignup
                ? "Rejoindre l'équipe de livreurs"
                : "Créer un accès équipe"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Vendeurs, livreurs et équipe MarchéGo : connectez-vous pour gérer votre activité."
            : isVendorSignup
              ? "Inscrivez votre boutique d'Adjamé. Un agent vérifie vos informations avant la mise en ligne."
              : isCourierSignup
                ? "Devenez livreur MarchéGo et gagnez en livrant à Abidjan."
                : "Pour les agents et administrateurs MarchéGo."}
        </p>

        {(
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(
              [
                ["vendeur", "Vendeur"],
                ["livreur", "Livreur"],
                ["equipe", "Équipe"],
              ] as [Profile, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setProfile(value)}
                className={`h-11 rounded-md border px-3 text-sm font-semibold transition ${
                  profile === value
                    ? "border-primary bg-mint text-primary"
                    : "border-input bg-secondary text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {isVendorSignup && (
            <div className="space-y-3 rounded-md border border-border bg-secondary/60 p-3">
              <input
                required
                minLength={2}
                aria-label="Votre nom"
                placeholder="Votre nom et prénom"
                value={shop.name}
                onChange={(event) => setShop({ ...shop, name: event.target.value })}
                className={inputClass}
              />
              <input
                required
                minLength={2}
                aria-label="Nom de la boutique"
                placeholder="Nom de la boutique"
                value={shop.shop_name}
                onChange={(event) => setShop({ ...shop, shop_name: event.target.value })}
                className={inputClass}
              />
              <select
                aria-label="Sexe"
                value={shop.category}
                onChange={(event) => setShop({ ...shop, category: event.target.value })}
                className={inputClass}
              >
                <option value="">Sélectionnez votre sexe</option>
                {vendorSignupCategories.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
              <input
                required
                minLength={8}
                aria-label="Téléphone de la boutique"
                placeholder="Téléphone (WhatsApp)"
                value={shop.phone}
                onChange={(event) => setShop({ ...shop, phone: event.target.value })}
                className={inputClass}
              />
              <input
                aria-label="Emplacement au marché"
                placeholder="Emplacement au marché (facultatif)"
                value={shop.stall}
                onChange={(event) => setShop({ ...shop, stall: event.target.value })}
                className={inputClass}
              />
            </div>
          )}
          {isCourierSignup && (
            <div className="space-y-3 rounded-md border border-border bg-secondary/60 p-3">
              <input
                required
                minLength={2}
                aria-label="Votre nom"
                placeholder="Votre nom et prénom"
                value={courier.name}
                onChange={(event) => setCourier({ ...courier, name: event.target.value })}
                className={inputClass}
              />
              <input
                required
                minLength={8}
                aria-label="Téléphone"
                placeholder="Téléphone (WhatsApp)"
                value={courier.phone}
                onChange={(event) => setCourier({ ...courier, phone: event.target.value })}
                className={inputClass}
              />
              <select
                aria-label="Moyen de transport"
                value={courier.vehicle}
                onChange={(event) => setCourier({ ...courier, vehicle: event.target.value })}
                className={inputClass}
              >
                <option value="">Sélectionnez votre moyen de transport</option>
                <option value="velo">Vélo</option>
                <option value="moto">Moto</option>
                <option value="tricycle">Tricycle</option>
                <option value="voiture">Voiture</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="vous@marchego.ci"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-md bg-mint px-3 py-2 text-sm font-medium text-primary">{message}</p>
          )}

          <Button type="submit" className="h-12 w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {mode === "signin" ? "Se connecter" : "Créer le compte"}
          </Button>
        </form>

        <Link to="/" className="mt-5 block text-center text-sm text-muted-foreground hover:underline">
          Retour à la boutique
        </Link>
      </div>
    </main>
  );
}

function traduire(message: string) {
  if (/invalid login credentials/i.test(message)) return "E-mail ou mot de passe incorrect.";
  if (/already registered/i.test(message)) return "Un compte existe déjà avec cet e-mail.";
  if (/email not confirmed/i.test(message)) return "Confirmez votre e-mail avant de vous connecter.";
  if (/not allowed|invalid email/i.test(message))
    return "Cette adresse e-mail n’est pas acceptée. Utilisez une adresse réelle qui peut recevoir l’e-mail de confirmation.";
  if (/password/i.test(message)) return "Mot de passe trop court (6 caractères minimum).";
  return message;
}
