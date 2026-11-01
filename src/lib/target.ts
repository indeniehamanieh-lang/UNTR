// "app"   = application Android des membres (sans back-office)
// "admin" = site web du back-office (réservé aux responsables)
// vide    = tout est actif (développement)
const t = import.meta.env["VITE_BUILD_TARGET"] as string | undefined;
export const IS_APP = t === "app";
export const IS_ADMIN_SITE = t === "admin";
