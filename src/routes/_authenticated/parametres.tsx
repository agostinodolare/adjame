import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Bell,
  ChevronRight,
  ClipboardList,
  Heart,
  KeyRound,
  LogOut,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const avatarBucket = "profile-avatars";
const avatarMaxSize = 5 * 1024 * 1024;
const cropSize = 320;

type CropOffset = { x: number; y: number };

function imageSizeAtZoom(image: HTMLImageElement, zoom: number) {
  const scale = Math.max(cropSize / image.naturalWidth, cropSize / image.naturalHeight) * zoom;
  return { width: image.naturalWidth * scale, height: image.naturalHeight * scale };
}

function clampCropOffset(offset: CropOffset, width: number, height: number): CropOffset {
  return {
    x: Math.min(0, Math.max(cropSize - width, offset.x)),
    y: Math.min(0, Math.max(cropSize - height, offset.y)),
  };
}

function AvatarCropDialog({
  file,
  onCancel,
  onCrop,
}: {
  file: File;
  onCancel: () => void;
  onCrop: (croppedFile: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number; offset: CropOffset } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropOffset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const sourceImage = new Image();
    sourceImage.onload = () => setImage(sourceImage);
    sourceImage.onerror = () => setError("Cette image ne peut pas être ouverte.");
    sourceImage.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!image) return;
    const size = imageSizeAtZoom(image, zoom);
    setOffset({ x: (cropSize - size.width) / 2, y: (cropSize - size.height) / 2 });
  }, [image, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !image) return;

    const size = imageSizeAtZoom(image, zoom);
    const centeredOffset = { x: (cropSize - size.width) / 2, y: (cropSize - size.height) / 2 };
    const drawOffset = clampCropOffset(offset ?? centeredOffset, size.width, size.height);
    context.clearRect(0, 0, cropSize, cropSize);
    context.drawImage(image, drawOffset.x, drawOffset.y, size.width, size.height);
  }, [image, zoom, offset]);

  const confirmCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Le recadrage a échoué. Choisissez une autre image.");
          return;
        }
        onCrop(new File([blob], "photo-de-profil.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recadrer la photo de profil</DialogTitle>
          <DialogDescription>
            Déplacez la photo dans le carré et réglez le zoom avant de la publier.
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto overflow-hidden rounded-lg bg-secondary">
          <canvas
            ref={canvasRef}
            width={cropSize}
            height={cropSize}
            aria-label="Aperçu du recadrage de la photo de profil"
            className="size-72 touch-none cursor-move sm:size-80"
            onPointerDown={(event) => {
              if (!image || !offset) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragStart.current = { x: event.clientX, y: event.clientY, offset };
            }}
            onPointerMove={(event) => {
              if (!image || !dragStart.current) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = cropSize / rect.width;
              const size = imageSizeAtZoom(image, zoom);
              setOffset(
                clampCropOffset(
                  {
                    x: dragStart.current.offset.x + (event.clientX - dragStart.current.x) * ratio,
                    y: dragStart.current.offset.y + (event.clientY - dragStart.current.y) * ratio,
                  },
                  size.width,
                  size.height,
                ),
              );
            }}
            onPointerUp={() => {
              dragStart.current = null;
            }}
            onPointerCancel={() => {
              dragStart.current = null;
            }}
          />
        </div>
        <label className="space-y-2 text-sm font-medium">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" disabled={!image} onClick={confirmCrop}>
            Recadrer et publier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres du compte — Mon Djassaman" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type SettingsPath =
  | "/client/profil"
  | "/client/commandes"
  | "/vendeur/boutique"
  | "/vendeur/commandes"
  | "/coursier/profil"
  | "/coursier/livraisons"
  | "/admin"
  | "/admin/commandes"
  | "/auth"
  | "/";

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const account = useQuery({
    queryKey: ["settings-account"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Connexion requise.");

      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id);
      if (rolesError) throw rolesError;

      const avatarPath = authData.user.user_metadata["avatar_path"];

      return {
        userId: authData.user.id,
        email: authData.user.email ?? "Adresse e-mail indisponible",
        roles: roleRows.map(({ role }) => role),
        avatarPath:
          typeof avatarPath === "string" && avatarPath.startsWith(`${authData.user.id}/`)
            ? avatarPath
            : null,
      };
    },
  });

  const currentAvatarUrl = account.data?.avatarPath
    ? supabase.storage.from(avatarBucket).getPublicUrl(account.data.avatarPath).data.publicUrl
    : null;

  const uploadAvatar = async (file: File) => {
    setAvatarMessage(null);
    setAvatarError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Choisissez une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > avatarMaxSize) {
      setAvatarError("La photo doit faire 5 Mo maximum.");
      return;
    }

    setAvatarBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Reconnectez-vous pour modifier votre photo.");

      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const newPath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(avatarBucket)
        .upload(newPath, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { avatar_path: newPath },
      });
      if (metadataError) {
        await supabase.storage.from(avatarBucket).remove([newPath]);
        throw metadataError;
      }

      const previousPath = account.data?.avatarPath;
      if (previousPath && previousPath !== newPath) {
        const { error: removeError } = await supabase.storage
          .from(avatarBucket)
          .remove([previousPath]);
        if (removeError)
          console.error("Could not remove the previous profile avatar.", removeError);
      }

      const newAvatarUrl = supabase.storage.from(avatarBucket).getPublicUrl(newPath).data.publicUrl;
      setAvatarUrl(newAvatarUrl);
      window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: newAvatarUrl }));
      setAvatarMessage("Votre photo de profil a été mise à jour.");
      await queryClient.invalidateQueries({ queryKey: ["settings-account"] });
    } catch (error) {
      console.error("Could not upload profile avatar.", error);
      setAvatarError("La photo n’a pas pu être enregistrée. Réessayez.");
    } finally {
      setAvatarBusy(false);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  };

  const roles = account.data?.roles ?? [];
  const profileHref = roles.includes("client")
    ? "/client/profil"
    : roles.includes("vendeur")
      ? "/vendeur/boutique"
      : roles.includes("livreur")
        ? "/coursier/profil"
        : "/admin";
  const ordersHref = roles.includes("client")
    ? "/client/commandes"
    : roles.includes("vendeur")
      ? "/vendeur/commandes"
      : roles.includes("livreur")
        ? "/coursier/livraisons"
        : "/admin/commandes";

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) return;
    await navigate({ to: "/", replace: true });
  };

  const SettingLink = ({
    to,
    icon: Icon,
    title,
    description,
    onClick,
  }: {
    to: SettingsPath;
    icon: typeof UserRound;
    title: string;
    description: string;
    onClick?: () => void;
  }) => (
    <Link
      to={to}
      onClick={(event) => {
        if (!onClick) return;
        event.preventDefault();
        onClick();
      }}
      className="flex items-center gap-4 rounded-lg border border-border p-4 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );

  return (
    <main className="min-h-screen bg-secondary px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="font-display text-3xl font-extrabold">Paramètres</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gérez les informations, la sécurité et les préférences de votre compte.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
            <CardDescription>
              Cette photo apparaîtra aussi dans l’icône de profil de la barre de navigation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="size-20 border border-border">
              <AvatarImage src={avatarUrl ?? currentAvatarUrl ?? undefined} alt="Photo de profil" />
              <AvatarFallback>
                <UserRound className="size-8" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={avatarInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Choisir une photo de profil"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  setAvatarMessage(null);
                  setAvatarError(null);
                  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                    setAvatarError("Choisissez une image JPG, PNG ou WebP.");
                  } else if (file.size > avatarMaxSize) {
                    setAvatarError("La photo doit faire 5 Mo maximum.");
                  } else {
                    setCropFile(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={avatarBusy}
                onClick={() => avatarInput.current?.click()}
              >
                <Camera className="size-4" />
                {avatarBusy ? "Envoi en cours…" : "Choisir une photo"}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · 5 Mo maximum</p>
              {avatarMessage && (
                <p role="status" className="text-sm text-primary">
                  {avatarMessage}
                </p>
              )}
              {avatarError && (
                <p role="alert" className="text-sm text-destructive">
                  {avatarError}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
            <CardDescription>Vos coordonnées et votre activité sur Mon Djassaman.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SettingLink
              to={profileHref}
              icon={UserRound}
              title="Profil et coordonnées"
              description="Nom, téléphone et informations de votre espace."
            />
            <SettingLink
              to={ordersHref}
              icon={ClipboardList}
              title="Commandes et activité"
              description="Retrouvez vos commandes, missions ou ventes."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sécurité du compte</CardTitle>
            <CardDescription>Protégez l’accès à votre compte.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SettingLink
              to="/auth"
              icon={KeyRound}
              title="Mot de passe et récupération"
              description="Ouvrez la connexion et choisissez « Mot de passe oublié »."
              onClick={() => void navigate({ to: "/auth", search: { mode: "forgot-password" } })}
            />
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Connexion actuelle</span>
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  {account.data?.email ?? "Chargement du compte…"}
                </span>
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut className="size-4" />
                <span className="sr-only sm:not-sr-only">Déconnexion</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Préférences</CardTitle>
            <CardDescription>
              Personnalisez votre expérience et vos habitudes de commande.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SettingLink
              to={profileHref}
              icon={MapPin}
              title="Préférences de livraison"
              description="Mettez à jour votre commune et votre adresse habituelles."
            />
            <SettingLink
              to="/"
              icon={Heart}
              title="Articles favoris"
              description="Consultez les articles que vous avez enregistrés."
              onClick={() => void navigate({ to: "/", search: { view: "favorites" } })}
            />
            <div className="flex items-center gap-4 rounded-lg border border-border p-4 sm:col-span-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Bell className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">Notifications</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Les préférences de notification seront disponibles prochainement.
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      {cropFile && (
        <AvatarCropDialog
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onCrop={(croppedFile) => {
            setCropFile(null);
            void uploadAvatar(croppedFile);
          }}
        />
      )}
    </main>
  );
}
