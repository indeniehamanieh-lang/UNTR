// Adresse publique utilisée dans les liens (QR code de la carte, e-mails).
// Dans l'application Android, window.location.origin vaut "https://localhost",
// il faut donc fournir l'adresse du site public via VITE_PUBLIC_URL.
export const PUBLIC_URL: string =
  (import.meta.env["VITE_PUBLIC_URL"] as string | undefined)?.replace(/\/+$/, "") ||
  window.location.origin;
