import { SITE_URL } from "@/config";

// Adresse publique du site (liens du QR code des cartes, e-mails).
// Dans l'application Android, window.location vaut "https://localhost" : il faut donc SITE_URL (voir config.ts).
export const PUBLIC_URL: string = (
  (import.meta.env["VITE_PUBLIC_URL"] as string | undefined) ||
  SITE_URL ||
  window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "")
).replace(/\/+$/, "");
