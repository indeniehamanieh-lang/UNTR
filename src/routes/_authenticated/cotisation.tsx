import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/session";
import { shrinkImage } from "@/lib/image";
import { Loading, Empty, ErrorBox, PageHeader } from "@/components/ui-states";
import { FilePick } from "@/components/file-pick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/cotisation")({
  head: () => ({ meta: [{ title: "Cotisation — UNTRTCI" }] }),
  component: Cotisation,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Settings = { amount_xof: number; duration_months: number; instructions: string | null };
type Method = { id: string; title: string; provider: string; number: string; holder: string | null };
type Pay = { id: string; amount_xof: number; provider: string; reference: string; status: string; note: string | null; valid_until: string | null; created_at: string };

const STATUS: Record<string, string> = { en_attente: "En attente de vérification", validee: "Validée", refusee: "Refusée" };
const money = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

function Cotisation() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const info = useQuery({
    queryKey: ["cotisation-info"],
    queryFn: async () => {
      const s = await db.from("payment_settings").select("*").eq("id", 1).maybeSingle();
      const m = await db.from("payment_methods").select("*").order("created_at");
      if (s.error) throw s.error;
      if (m.error) throw m.error;
      return { settings: s.data as Settings | null, methods: (m.data ?? []) as Method[] };
    },
  });
  const mine = useQuery({
    queryKey: ["my-payments", user.id],
    queryFn: async () => {
      const { data, error } = await db.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pay[];
    },
  });

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success("Numéro copié"); } catch { toast.error("Copie impossible"); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = info.data?.settings;
    if (!s || s.amount_xof <= 0) { toast.error("Le montant de la cotisation n'est pas encore défini."); return; }
    if (!method) { toast.error("Choisissez le moyen de paiement utilisé"); return; }
    if (reference.trim().length < 4) { toast.error("Saisissez la référence de la transaction (reçue par SMS)"); return; }
    setBusy(true);
    try {
      let proofPath: string | null = null;
      if (proof) {
        const img = await shrinkImage(proof, 1400, 0.8);
        if (img.size > 4 * 1024 * 1024) throw new Error("Fichier trop lourd (4 Mo max)");
        proofPath = `${user.id}/preuve-${Date.now()}.${img.name.split(".").pop() ?? "jpg"}`;
        const up = await supabase.storage.from("payment-proofs").upload(proofPath, img);
        if (up.error) throw up.error;
      }
      const { error } = await db.from("payments").insert({ user_id: user.id, amount_xof: s.amount_xof, provider: method, reference: reference.trim(), proof_path: proofPath });
      if (error) {
        if (String(error.message).includes("payments_ref_unique")) throw new Error("Cette référence de transaction a déjà été enregistrée.");
        throw error;
      }
      toast.success("Paiement déclaré. Un responsable va le vérifier.");
      setReference(""); setProof(null);
      qc.invalidateQueries({ queryKey: ["my-payments"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setBusy(false); }
  }

  if (info.isLoading) return <Loading />;
  if (info.error) return <ErrorBox error={info.error} />;
  const s = info.data!.settings;
  const methods = info.data!.methods;
  const paidUntil = (mine.data ?? []).filter((p) => p.status === "validee" && p.valid_until).map((p) => p.valid_until!).sort().pop();

  return (
    <div className="space-y-4">
      <PageHeader title="Cotisation" subtitle="Payez par Mobile Money, puis déclarez votre paiement" />
      {paidUntil && new Date(paidUntil) >= new Date() && (
        <div className="rounded-xl bg-secondary p-3 text-sm font-medium text-primary">✓ Cotisation à jour jusqu'au {fmtDate(paidUntil)}</div>
      )}
      {!s || s.amount_xof <= 0 ? (
        <Empty text="Le montant de la cotisation n'a pas encore été défini par l'Union." />
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Montant de la cotisation ({s.duration_months} mois)</p>
            <p className="text-3xl font-extrabold">{money(s.amount_xof)}</p>
            {s.instructions && <p className="mt-2 text-sm">{s.instructions}</p>}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold">1. Envoyez l'argent à l'un de ces numéros</h2>
            {methods.length === 0 ? <Empty text="Aucun numéro de paiement n'est encore indiqué." /> : methods.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex-1">
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-lg font-bold tracking-wide">{m.number}</p>
                  {m.holder && <p className="text-xs text-muted-foreground">Au nom de : {m.holder}</p>}
                </div>
                <Button size="sm" variant="outline" type="button" onClick={() => copy(m.number)}>Copier</Button>
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="text-lg font-bold">2. Déclarez votre paiement</h2>
            <div className="space-y-1.5">
              <Label>Moyen utilisé</Label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">Choisir…</option>
                {methods.map((m) => <option key={m.id} value={m.provider}>{m.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Référence de la transaction (dans le SMS de confirmation)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label>Capture d'écran du paiement (recommandé)</Label>
              <FilePick accept="image/png,image/jpeg,image/webp,application/pdf" capture="environment" file={proof} onFile={setProof} />
            </div>
            <Button className="w-full" disabled={busy}>{busy ? "Envoi…" : "J'ai payé : envoyer"}</Button>
          </form>
        </>
      )}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Mes paiements</h2>
        {mine.isLoading ? <Loading /> : (mine.data ?? []).length === 0 ? <Empty text="Aucun paiement déclaré." /> : (
          <ul className="space-y-2">
            {mine.data!.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{money(p.amount_xof)}</p>
                  <span className="text-xs font-medium">{STATUS[p.status] ?? p.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{fmtDate(p.created_at)} · Réf. {p.reference}</p>
                {p.note && <p className="mt-1 text-xs">{p.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
