import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, useMembership } from "@/lib/session";
import { shrinkImage } from "@/lib/image";
import { Loading, Empty, ErrorBox, PageHeader } from "@/components/ui-states";
import { FilePick } from "@/components/file-pick";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/cotisation")({
  head: () => ({ meta: [{ title: "Paiements — UNTRTCI" }] }),
  component: Paiements,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Settings = { adhesion_fee_xof: number; monthly_fee_xof: number; instructions: string | null };
type Method = { id: string; title: string; provider: string; number: string; holder: string | null };
type Pay = { id: string; purpose: string; months: number | null; amount_xof: number; provider: string; reference: string; status: string; note: string | null; valid_until: string | null; created_at: string };

const STATUS: Record<string, string> = { en_attente: "En attente de vérification", validee: "Validé", refusee: "Refusé" };
const money = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

function Paiements() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const membership = useMembership(user.id);
  const [tabChoice, setTabChoice] = useState<"adhesion" | "cotisation" | null>(null);
  const [months, setMonths] = useState(1);
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

  if (info.isLoading || mine.isLoading || membership.isLoading) return <Loading />;
  if (info.error) return <ErrorBox error={info.error} />;
  const s = info.data!.settings;
  const methods = info.data!.methods;
  const all = mine.data ?? [];
  const adhesionPaid = all.some((p) => p.purpose === "adhesion" && p.status === "validee");
  const tab = tabChoice ?? (adhesionPaid ? "cotisation" : "adhesion");
  const list = all.filter((p) => p.purpose === tab);
  const pending = list.some((p) => p.status === "en_attente");
  const validated = membership.data?.status === "validee";
  const paidUntil = all.filter((p) => p.purpose === "cotisation" && p.status === "validee" && p.valid_until).map((p) => p.valid_until!).sort().pop();
  const upToDate = !!paidUntil && new Date(paidUntil) >= new Date(new Date().toDateString());
  const fee = tab === "adhesion" ? (s?.adhesion_fee_xof ?? 0) : (s?.monthly_fee_xof ?? 0) * months;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!s || fee <= 0) { toast.error("Le montant n'est pas défini."); return; }
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
      const { error } = await db.from("payments").insert({
        user_id: user.id, purpose: tab, months: tab === "cotisation" ? months : null,
        amount_xof: fee, provider: method, reference: reference.trim(), proof_path: proofPath,
      });
      if (error) {
        if (String(error.message).includes("payments_ref_unique")) throw new Error("Cette référence de transaction a déjà été enregistrée.");
        throw error;
      }
      toast.success("Paiement déclaré. Un responsable va le vérifier.");
      setReference(""); setProof(null);
      qc.invalidateQueries({ queryKey: ["my-payments"] });
      qc.invalidateQueries({ queryKey: ["adhesion-fee"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setBusy(false); }
  }

  const tabBtn = (k: "adhesion" | "cotisation", label: string) => (
    <button type="button" onClick={() => setTabChoice(k)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${tab === k ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Paiements" subtitle="Payez par Mobile Money, puis déclarez votre paiement" />
      <div className="flex gap-2">
        {tabBtn("adhesion", "Frais d'adhésion")}
        {tabBtn("cotisation", "Cotisation")}
      </div>

      {tab === "cotisation" && validated && (
        <div className={`rounded-xl p-3 text-sm font-medium ${upToDate ? "bg-secondary text-primary" : "bg-accent"}`}>
          {upToDate ? `✓ Cotisation à jour jusqu'au ${fmtDate(paidUntil!)}` : "Votre cotisation n'est pas à jour."}
        </div>
      )}
      {tab === "adhesion" && adhesionPaid && <div className="rounded-xl bg-secondary p-3 text-sm font-medium text-primary">✓ Frais d'adhésion payés et confirmés</div>}
      {pending && <div className="rounded-xl bg-accent p-3 text-sm">⏳ Un paiement est en cours de vérification.</div>}

      {tab === "adhesion" && adhesionPaid ? null : tab === "cotisation" && !validated ? (
        <Empty text="La cotisation sera disponible après la validation de votre adhésion." />
      ) : !s || fee <= 0 ? (
        <Empty text="Le montant n'est pas encore défini par l'Union." />
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4">
            {tab === "adhesion" ? (
              <>
                <p className="text-sm text-muted-foreground">Frais d'adhésion, payés une seule fois (obligatoires pour valider votre adhésion)</p>
                <p className="text-3xl font-extrabold">{money(s.adhesion_fee_xof)}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Cotisation : {money(s.monthly_fee_xof)} par mois, soit {money(s.monthly_fee_xof * 12)} pour l'année</p>
                <div className="mt-2 space-y-1.5">
                  <Label>Nombre de mois à payer</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 12 ? "12 mois (1 an)" : `${n} mois`} : {money(n * s.monthly_fee_xof)}</option>)}
                  </select>
                </div>
                <p className="mt-2 text-3xl font-extrabold">{money(fee)}</p>
              </>
            )}
            {s.instructions && <p className="mt-2 text-sm">{s.instructions}</p>}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold">1. Envoyez {money(fee)} à l'un de ces numéros</h2>
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
        <h2 className="text-lg font-bold">{tab === "adhesion" ? "Mes paiements d'adhésion" : "Mes cotisations"}</h2>
        {list.length === 0 ? <Empty text="Aucun paiement déclaré." /> : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{money(p.amount_xof)}{p.purpose === "cotisation" && p.months ? ` · ${p.months} mois` : ""}</p>
                  <span className="text-xs font-medium">{STATUS[p.status] ?? p.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{fmtDate(p.created_at)} · Réf. {p.reference}{p.valid_until ? ` · valable jusqu'au ${fmtDate(p.valid_until)}` : ""}</p>
                {p.note && <p className="mt-1 text-xs">{p.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
