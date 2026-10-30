import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

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
  if (!import.meta.env["VITE_SUPABASE_URL"] || !import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    showError(
      "Configuration manquante",
      "Les clés Supabase n'ont pas été incluses dans l'APK.\nVérifiez les secrets VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans GitHub (Settings > Secrets and variables > Actions), puis relancez la construction.",
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
