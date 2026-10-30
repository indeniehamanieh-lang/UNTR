import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

(window as unknown as { __started?: boolean }).__started = true;

// Affiche l'erreur à l'écran au lieu d'une page blanche.
function showError(title: string, detail?: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  const text = detail instanceof Error ? `${detail.message}\n${detail.stack ?? ""}` : detail ? String(detail) : "";
  root.textContent = "";
  const box = document.createElement("div");
  box.style.cssText = "padding:24px;font-family:sans-serif;color:#111";
  const h = document.createElement("h2");
  h.textContent = title;
  h.style.cssText = "color:#b00020;margin-bottom:12px";
  const pre = document.createElement("pre");
  pre.textContent = text;
  pre.style.cssText = "white-space:pre-wrap;font-size:12px";
  box.append(h, pre);
  root.append(box);
}

window.addEventListener("error", (e) => showError("Erreur de l'application", e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => showError("Erreur de l'application", e.reason));

async function start() {
  const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || SUPABASE_URL;
  const key = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) || SUPABASE_KEY;
  if (!url.startsWith("http") || !key.startsWith("sb_") && !key.startsWith("eyJ")) {
    showError(
      "Configuration manquante",
      "Les clés Supabase ne sont pas renseignées.\nOuvrez le fichier src/config.ts sur GitHub et collez l'adresse du projet et la clé publishable.",
    );
    return;
  }
  const { RouterProvider } = await import("@tanstack/react-router");
  const { getRouter } = await import("./router");
  const router = getRouter();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

start().catch((e) => showError("Erreur au démarrage", e));
