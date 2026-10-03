import { supabase } from "@/integrations/supabase/client";

export type Vendor = {
  id: string;
  name: string;
  shop_name: string;
  category: string;
  phone: string | null;
  stall: string | null;
  status: string;
  verified: boolean;
  created_at: string;
};

export type Courier = {
  id: string;
  name: string;
  phone: string | null;
  zone: string;
  availability: string;
  created_at: string;
};

export type Order = {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string | null;
  commune: string;
  address: string | null;
  items_total: number;
  discount_total: number;
  delivery_fee: number;
  status: string;
  vendor_id: string | null;
  courier_id: string | null;
  created_at: string;
};

export const orderStatuses = [
  "nouvelle",
  "confirmee",
  "en_livraison",
  "livree",
  "annulee",
] as const;

export const orderStatusLabels: Record<string, string> = {
  nouvelle: "Nouvelle",
  confirmee: "Confirmée",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

export const courierAvailabilities = ["disponible", "en livraison", "hors ligne"] as const;
export const vendorStatuses = ["actif", "suspendu"] as const;
export const vendorCategories = ["Femme", "Homme", "Enfant", "Chaussures", "Téléphones", "Divers"];

export function courierCoversCommune(zone: string, commune: string) {
  const normalizedCommune = commune.trim().toLocaleLowerCase("fr");
  return zone
    .split(/[/,;|]/)
    .map((coveredZone) => coveredZone.trim().toLocaleLowerCase("fr"))
    .some(
      (coveredZone) =>
        coveredZone === normalizedCommune ||
        (coveredZone === "abidjan" && normalizedCommune !== "intérieur du pays"),
    );
}

export const formatPrice = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " F";

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );

export const relativeTime = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 60) return `il y a ${Math.max(minutes, 1)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
};

export async function fetchVendors() {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Vendor[];
}

export async function fetchCouriers() {
  const { data, error } = await supabase
    .from("couriers")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Courier[];
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}
