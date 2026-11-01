import { IS_ADMIN_SITE } from "@/lib/target";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import logo from "@/assets/untrtci-logo.jpg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_URL } from "@/lib/public-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s["mode"] === "signup" || s["mode"] === "forgot" ? s["mode"] : "signin") as "signin" | "signup" | "forgot",
  }),
  head: () => ({
    meta: [
      { title: "Connexion — UNTRTCI" },
      { name: "description", content: "Connectez-vous ou créez votre compte UNTRTCI." },
      { property: "og:title", content: "Connexion — UNTRTCI" },
      { property: "og:description", content: "Accédez à votre espace membre UNTRTCI." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const v = z.string().trim().email("E-mail invalide").safeParse(email);
        if (!v.success) throw new Error(v.error.issues[0]?.message ?? "Données invalides");
        if (step === "email") {
          const { error } = await supabase.auth.resetPasswordForEmail(v.data);
          if (error) throw error;
          setStep("code");
          toast.success("Code envoyé par e-mail. Regardez aussi dans les courriers indésirables.");
        } else {
          if (newPassword.length < 8) throw new Error("8 caractères minimum pour le nouveau mot de passe");
          const ver = await supabase.auth.verifyOtp({ email: v.data, token: code.trim(), type: "recovery" });
          if (ver.error) throw new Error("Code incorrect ou expiré.");
          const upd = await supabase.auth.updateUser({ password: newPassword });
          if (upd.error) throw upd.error;
          toast.success("Mot de passe modifié");
          setStep("email"); setCode(""); setNewPassword("");
          navigate({ to: "/accueil" });
        }
        return;
      }
      const v = schema.safeParse({ email, password });
      if (!v.success) throw new Error(v.error.issues[0]?.message ?? "Données invalides");
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: v.data.email, password: v.data.password,
          options: { emailRedirectTo: `${PUBLIC_URL}/#/accueil`, data: { full_name: name.trim().slice(0, 120) } },
        });
        if (error) throw error;
        setSent("Compte créé. Vérifiez votre boîte e-mail pour confirmer votre adresse.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(v.data);
        if (error) throw new Error("E-mail ou mot de passe incorrect.");
        // Sur ordinateur, le personnel arrive directement dans le back-office
        let dest: "/accueil" | "/admin" = IS_ADMIN_SITE ? "/admin" : "/accueil";
        if (!IS_ADMIN_SITE && window.matchMedia("(min-width: 1024px)").matches) {
          const { data: u } = await supabase.auth.getUser();
          if (u.user) {
            const { data: rs } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
            if ((rs ?? []).some((r) => r.role !== "membre")) dest = "/admin";
          }
        }
        navigate({ to: dest });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signup" ? "Créer un compte" : mode === "forgot" ? "Mot de passe oublié" : "Se connecter";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <img src={logo.url} alt="UNTRTCI" className="mx-auto h-16 w-auto" />
      <h1 className="mt-6 text-center text-2xl font-bold">{title}</h1>
      {sent ? (
        <p className="mt-6 rounded-xl bg-secondary p-4 text-center text-sm text-secondary-foreground">{sent}</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5"><Label>Nom complet</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
          )}
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {mode === "forgot" && step === "code" && (
            <>
              <div className="space-y-1.5"><Label>Code reçu par e-mail</Label><Input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} required /></div>
              <div className="space-y-1.5"><Label>Nouveau mot de passe</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
            </>
          )}
          {mode !== "forgot" && (
            <div className="space-y-1.5"><Label>Mot de passe</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Patientez…" : mode === "forgot" ? (step === "email" ? "Recevoir un code" : "Changer le mot de passe") : title}</Button>
        </form>
      )}
      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        {mode !== "signin" && <button className="text-primary" onClick={() => { setSent(null); navigate({ to: "/auth", search: { mode: "signin" } }); }}>J'ai déjà un compte</button>}
        {mode !== "signup" && !IS_ADMIN_SITE && <button className="text-primary" onClick={() => { setSent(null); navigate({ to: "/auth", search: { mode: "signup" } }); }}>Créer un compte</button>}
        {mode === "signin" && <button className="text-muted-foreground" onClick={() => { setStep("email"); navigate({ to: "/auth", search: { mode: "forgot" } }); }}>Mot de passe oublié ?</button>}

      </div>
    </div>
  );
}
