import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  registerVendorApplication,
  registerCourierApplication,
  vendorSignupCategories,
} from "@/lib/signup.functions";
import { registerCurrentCustomer } from "@/lib/roles";

type Mode = "signin" | "signup" | "forgot-password" | "update-password";
type Profile = "vendeur" | "livreur" | "client" | "equipe";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode; role?: Profile } => ({
    ...(search["mode"] === "signup" ||
    search["mode"] === "forgot-password" ||
    search["mode"] === "update-password"
      ? { mode: search["mode"] as Mode }
      : {}),
    ...(search["role"] === "vendeur" ? { role: "vendeur" as const } : {}),
    ...(search["role"] === "livreur" ? { role: "livreur" as const } : {}),
    ...(search["role"] === "client" ? { role: "client" as const } : {}),
    ...(search["role"] === "equipe" ? { role: "equipe" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Connexion et création de compte — Mon Djassaman" },
      {
        name: "description",
        content:
          "Créez votre espace client ou vendeur, découvrez les produits d’Adjamé et suivez vos commandes sur Mon Djassaman.",
      },
      { property: "og:title", content: "Connexion — Mon Djassaman" },
      {
        property: "og:description",
        content: "Connectez-vous à votre espace client, vendeur ou équipe Mon Djassaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "h-11 w-full rounded-md border border-input bg-secondary px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [profile, setProfile] = useState<Profile>(
    search.mode === "signup" && search.role === "equipe"
      ? "client"
      : (search.role ?? (search.mode === "signup" ? "client" : "equipe")),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
    let cancelled = false;

    const restoreSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        setError("Impossible de vérifier la session. Veuillez réessayer.");
        return;
      }

      if (search.mode === "update-password") {
        if (!data.session) {
          setError("Ce lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau.");
        }
        return;
      }

      if (!data.session) {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const oauthError = params.get("error_description") ?? hashParams.get("error_description");
        if (oauthError) setError(traduire(oauthError));
        return;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      if (cancelled) return;
      if (rolesError) {
        setError("Impossible de vérifier vos rôles. Veuillez réessayer.");
        return;
      }

      const roles = (rolesData ?? []).map(
        (row) => row.role as "admin" | "staff" | "vendeur" | "livreur" | "client",
      );

      if (search.role) {
        if (search.role === "client" && !roles.includes("client")) {
          try {
            await registerCurrentCustomer(data.session.user.id);
            roles.push("client");
          } catch (registrationError) {
            if (!cancelled) {
              setError(
                registrationError instanceof Error
                  ? `Impossible d’activer votre espace client : ${traduire(registrationError.message)}`
                  : "Impossible d’activer votre espace client. Veuillez réessayer.",
              );
            }
            return;
          }
        }

        const requestedRole =
          search.role === "equipe"
            ? (["admin", "staff"] as const).find((role) => roles.includes(role))
            : search.role;
        if (!requestedRole || !roles.includes(requestedRole)) {
          setError("Ce compte Google ne possède pas le profil sélectionné.");
          return;
        }

        const roleHomeMap = {
          admin: "/admin",
          staff: "/admin",
          vendeur: "/vendeur",
          livreur: "/coursier",
          client: "/client",
        } as const;
        navigate({ to: roleHomeMap[requestedRole], replace: true });
        return;
      }

      const order: ("admin" | "staff" | "vendeur" | "livreur" | "client")[] = [
        "admin",
        "staff",
        "livreur",
        "vendeur",
        "client",
      ];
      const primaryRole = order.find((role) => roles.includes(role));
      if (primaryRole) {
        const roleHomeMap = {
          admin: "/admin",
          staff: "/admin",
          vendeur: "/vendeur",
          livreur: "/coursier",
          client: "/client",
        };
        navigate({ to: roleHomeMap[primaryRole], replace: true });
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [navigate, search.mode, search.role]);

  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === "signup" && profile === "equipe") setProfile("client");
    setError(null);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
    if (next === "signup") setAcceptedTerms(false);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const redirectUrl = new URL("/auth", window.location.origin);
    redirectUrl.searchParams.set("role", profile);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl.toString() },
      });
      if (oauthError) setError(traduire(oauthError.message));
    } catch (oauthError) {
      setError(
        oauthError instanceof Error
          ? traduire(oauthError.message)
          : "La connexion avec Google a échoué. Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "forgot-password") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/auth?mode=update-password", window.location.origin).toString(),
      });
      if (resetError) {
        setError(traduire(resetError.message));
      } else {
        setMessage(
          "Si un compte correspond à cette adresse, un lien de réinitialisation lui sera envoyé.",
        );
      }
      setLoading(false);
      return;
    }

    if (mode === "update-password") {
      if (password !== confirmPassword) {
        setError("Les deux mots de passe ne correspondent pas.");
        setLoading(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(traduire(updateError.message));
        setLoading(false);
        return;
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(
          `Le mot de passe a été modifié, mais la déconnexion a échoué : ${traduire(signOutError.message)}`,
        );
        setLoading(false);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setMode("signin");
      setMessage("Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(traduire(signUpError.message));
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Erreur lors de la création du compte.");
        setLoading(false);
        return;
      }

      if (profile === "vendeur") {
        try {
          await registerVendorApplication({
            data: {
              user_id: data.user.id,
              name: shop.name || email.split("@")[0],
              shop_name: shop.shop_name || "Ma Boutique",
              category: shop.category || "Divers",
              phone: shop.phone || "+225 00 00 00 00",
              stall: shop.stall || "",
            },
          });
        } catch (err: unknown) {
          console.error("Erreur enregistrement vendeur:", err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Erreur inconnue lors de l'enregistrement du vendeur";
          setError(
            `Compte créé, mais l'enregistrement en tant que vendeur a échoué: ${traduire(errorMessage)}`,
          );
          setLoading(false);
          return;
        }
      } else if (profile === "livreur") {
        try {
          await registerCourierApplication({
            data: {
              user_id: data.user.id,
              name: courier.name || email.split("@")[0],
              phone: courier.phone || "+225 00 00 00 00",
              zone: courier.vehicle || "Adjamé",
            },
          });
        } catch (err: unknown) {
          console.error("Erreur enregistrement livreur:", err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Erreur inconnue lors de l'enregistrement du livreur";
          setError(
            `Compte créé, mais l'enregistrement en tant que livreur a échoué: ${traduire(errorMessage)}`,
          );
          setLoading(false);
          return;
        }
      }

      // Avec l'auto-confirmation, signUp renvoie normalement une session. Le
      // second appel couvre les projets dont la configuration n'est pas encore synchronisée.
      if (!data.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(traduire(signInError.message));
          setLoading(false);
          return;
        }
        if (signInData.session) {
          data.session = signInData.session;
        }
      }

      if (!data.session) {
        setError(
          "Compte créé, mais la connexion automatique n'est pas disponible. Réessayez de vous connecter.",
        );
        setLoading(false);
        return;
      }

      const { data: currentSessionData, error: currentSessionError } =
        await supabase.auth.getSession();
      if (currentSessionError) {
        setError(`Impossible de vérifier la session : ${traduire(currentSessionError.message)}`);
        setLoading(false);
        return;
      }

      if (currentSessionData.session?.user.id !== data.user.id) {
        const { error: restoreSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (restoreSessionError) {
          setError(`Impossible d'ouvrir votre session : ${traduire(restoreSessionError.message)}`);
          setLoading(false);
          return;
        }
      }

      if (profile === "client") {
        try {
          await registerCurrentCustomer(data.user.id);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Erreur lors de la création de l’espace client.";
          setError(
            `Compte créé, mais l’espace client n’a pas pu être activé : ${traduire(errorMessage)}`,
          );
          setLoading(false);
          return;
        }
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (rolesError) {
        setError("Compte créé, mais le rôle n'a pas pu être vérifié. Réessayez.");
        setLoading(false);
        return;
      }

      const roles = (rolesData ?? []).map(
        (row) => row.role as "admin" | "staff" | "vendeur" | "livreur" | "client",
      );
      const primaryRole = (["admin", "staff", "livreur", "vendeur", "client"] as const).find(
        (role) => roles.includes(role),
      );
      const roleHomeMap = {
        admin: "/admin",
        staff: "/admin",
        vendeur: "/vendeur",
        livreur: "/coursier",
        client: "/client",
      } as const;

      if (!primaryRole) {
        setError(
          "Votre espace n’a pas pu être activé automatiquement. Réessayez ou contactez le support.",
        );
        setLoading(false);
        return;
      }

      navigate({ to: roleHomeMap[primaryRole], replace: true });
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(traduire(signInError.message));
      } else if (signInData.user) {
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signInData.user.id);

        if (rolesError) {
          setError("Impossible de vérifier vos rôles. Veuillez réessayer.");
          setLoading(false);
          return;
        }

        // Vérifier que l'utilisateur a bien le rôle correspondant au profil sélectionné
        const userRoles =
          rolesData?.map(
            (row) => row.role as "admin" | "staff" | "vendeur" | "livreur" | "client",
          ) || [];

        if (profile === "client" && !userRoles.includes("client") && signInData.session) {
          try {
            await registerCurrentCustomer(signInData.user.id);
            userRoles.push("client");
          } catch (error) {
            setError(
              error instanceof Error
                ? `Impossible d’activer votre espace client : ${traduire(error.message)}`
                : "Impossible d’activer votre espace client. Veuillez réessayer.",
            );
            setLoading(false);
            return;
          }
        }

        // Si un profil est sélectionné, utiliser celui-ci (s'il est valide)
        // Mapper "equipe" à "admin" car ce rôle n'existe pas dans la base
        const effectiveProfile: "admin" | "staff" | "vendeur" | "livreur" | "client" =
          profile === "equipe"
            ? "admin"
            : (profile as "admin" | "staff" | "vendeur" | "livreur" | "client");

        let targetRole: "admin" | "staff" | "vendeur" | "livreur" | "client" | null = null;

        if (mode === "signin" && effectiveProfile && userRoles.includes(effectiveProfile)) {
          // L'utilisateur a sélectionné un profil et possède ce rôle
          targetRole = effectiveProfile;
        } else if (userRoles.length > 0) {
          // Utiliser la priorité par défaut si aucun profil n'est sélectionné
          const order: ("admin" | "staff" | "vendeur" | "livreur" | "client")[] = [
            "admin",
            "staff",
            "livreur",
            "vendeur",
            "client",
          ];
          targetRole = order.find((role) => userRoles.includes(role)) || null;
        }

        if (targetRole) {
          const roleHomeMap: Record<
            "admin" | "staff" | "vendeur" | "livreur" | "client" | "equipe",
            string
          > = {
            admin: "/admin",
            staff: "/admin",
            equipe: "/admin",
            vendeur: "/vendeur",
            livreur: "/coursier",
            client: "/client",
          };
          navigate({ to: roleHomeMap[targetRole as keyof typeof roleHomeMap], replace: true });
        } else {
          setError(
            "Votre compte n'a pas le rôle sélectionné. Sélectionnez un rôle que vous possédez.",
          );
          setLoading(false);
          return;
        }
      } else {
        setError("Erreur de connexion. Veuillez réessayer.");
      }
    }

    setLoading(false);
  };

  const isVendorSignup = mode === "signup" && profile === "vendeur";
  const isCourierSignup = mode === "signup" && profile === "livreur";
  const isCustomerSignup = mode === "signup" && profile === "client";
  const isRecoveryMode = mode === "forgot-password" || mode === "update-password";
  const availableProfiles: [Profile, string][] = [
    ["vendeur", "Vendeur"],
    ["livreur", "Livreur"],
    ["client", "Client"],
  ];
  if (mode !== "signup") availableProfiles.push(["equipe", "Équipe"]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-7 shadow-soft">
        <BrandLogo variant="secondary" className="size-16 object-contain" />

        {!isRecoveryMode && (
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
        )}

        <h1 className="mt-5 font-display text-2xl font-extrabold">
          {mode === "forgot-password"
            ? "Mot de passe oublié"
            : mode === "update-password"
              ? "Choisir un nouveau mot de passe"
              : mode === "signin"
                ? profile === "client"
                  ? "Espace client Mon Djassaman"
                  : "Espace pro Mon Djassaman"
                : isVendorSignup
                  ? "Créer mon compte vendeur"
                  : isCourierSignup
                    ? "Rejoindre l'équipe de livreurs"
                    : isCustomerSignup
                      ? "Créer mon espace client"
                      : "Créer un accès équipe"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "forgot-password"
            ? "Saisissez l’adresse e-mail associée à votre compte pour recevoir un lien de réinitialisation."
            : mode === "update-password"
              ? "Choisissez un nouveau mot de passe pour sécuriser votre compte."
              : mode === "signin"
                ? "Clients, vendeurs et équipe Mon Djassaman : connectez-vous à votre espace."
                : isVendorSignup
                  ? "Inscrivez votre boutique d'Adjamé. Un agent vérifie vos informations avant la mise en ligne."
                  : isCourierSignup
                    ? "Devenez livreur Mon Djassaman et gagnez en livrant à Abidjan."
                    : isCustomerSignup
                      ? "Découvrez les produits, commandez et retrouvez le suivi de vos achats."
                      : "Pour les agents et administrateurs Mon Djassaman."}
        </p>

        {!isRecoveryMode && (
          <div
            className={`mt-5 grid gap-2 ${mode === "signup" ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}
          >
            {availableProfiles.map(([value, label]) => (
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

          {mode !== "update-password" && (
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
                placeholder="vous@exemple.ci"
              />
            </div>
          )}
          {mode !== "forgot-password" && (
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                {mode === "update-password" ? "Nouveau mot de passe" : "Mot de passe"}
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
                  placeholder="6 caractères minimum"
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
          )}
          {mode === "update-password" && (
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
                placeholder="Répétez le nouveau mot de passe"
              />
            </div>
          )}
          {(mode === "signin" || mode === "signup") && (
            <button
              type="button"
              onClick={() => switchMode("forgot-password")}
              className="block text-sm font-semibold text-primary underline underline-offset-4"
            >
              Mot de passe oublié ?
            </button>
          )}
          {mode === "signup" && (
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-primary"
              />
              <span>
                J’accepte les{" "}
                <Link to="/conditions-utilisation" className="font-semibold text-primary underline">
                  conditions d’utilisation
                </Link>{" "}
                et reconnais avoir lu la{" "}
                <Link to="/confidentialite" className="font-semibold text-primary underline">
                  politique de confidentialité
                </Link>
                .
              </span>
            </label>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-md bg-mint px-3 py-2 text-sm font-medium text-primary">
              {message}
            </p>
          )}

          <Button type="submit" className="h-12 w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {mode === "signin"
              ? "Se connecter"
              : mode === "signup"
                ? "Créer le compte"
                : mode === "forgot-password"
                  ? "Envoyer le lien"
                  : "Enregistrer le nouveau mot de passe"}
          </Button>
        </form>

        {mode === "signin" && (
          <div className="mt-5">
            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>ou continuer avec</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              disabled={loading}
              onClick={() => void signInWithGoogle()}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <span aria-hidden="true" className="font-bold text-blue-600">
                  G
                </span>
              )}
              Se connecter avec Google
            </Button>
          </div>
        )}

        {isRecoveryMode ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="mt-5 block w-full text-center text-sm font-semibold text-primary underline"
          >
            Retour à la connexion
          </button>
        ) : (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Consultez nos{" "}
            <Link to="/conditions-utilisation" className="font-semibold text-primary underline">
              conditions d’utilisation
            </Link>{" "}
            et notre{" "}
            <Link to="/confidentialite" className="font-semibold text-primary underline">
              politique de confidentialité
            </Link>
            .
          </p>
        )}

        <Link
          to="/"
          className="mt-5 block text-center text-sm text-muted-foreground hover:underline"
        >
          Retour à la boutique
        </Link>
      </div>
    </main>
  );
}

function traduire(message: string) {
  if (/unsupported provider|provider is not enabled/i.test(message))
    return "La connexion Google n’est pas encore activée dans les paramètres Supabase.";
  if (/invalid login credentials/i.test(message)) return "E-mail ou mot de passe incorrect.";
  if (/already registered/i.test(message)) return "Un compte existe déjà avec cet e-mail.";
  if (/email not confirmed/i.test(message))
    return "Confirmez votre e-mail avant de vous connecter.";
  if (/not allowed|invalid email/i.test(message))
    return "Cette adresse e-mail n’est pas acceptée. Utilisez une adresse réelle qui peut recevoir l’e-mail de confirmation.";
  if (/password/i.test(message)) return "Mot de passe trop court (6 caractères minimum).";
  if (/invalid input value for enum|is not in enum/i.test(message))
    return "Type de rôle non valide. Contactez l'administrateur.";
  if (/violation of unique constraint/i.test(message))
    return "Ce rôle est déjà attribué à cet utilisateur.";
  return message;
}
