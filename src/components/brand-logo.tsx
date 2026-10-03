import primaryLogo from "@/assets/logo-djassaman-principal.png";
import secondaryLogo from "@/assets/logo-djassaman-secondaire.png";

type BrandLogoProps = {
  variant?: "primary" | "secondary";
  className?: string;
};

export function BrandLogo({ variant = "primary", className }: BrandLogoProps) {
  const isPrimary = variant === "primary";

  return (
    <img
      src={isPrimary ? primaryLogo : secondaryLogo}
      alt={isPrimary ? "Mon Djassaman — l’esprit du marché directement chez vous" : "Mon Djassaman"}
      className={className}
    />
  );
}
