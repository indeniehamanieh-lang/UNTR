import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership, STATUS_LABEL, fmtDate } from "@/lib/session";
import { Loading, PageHeader } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { shrinkImage } from "@/lib/image";
import { toPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/adhesion")({
  head: () => ({ meta: [{ title: "Adhésion — UNTRTCI" }, { name: "description", content: "Demande d'adhésion à l'UNTRTCI." }, { property: "og:title", content: "Adhésion — UNTRTCI" }, { property: "og:description", content: "Rejoignez l'Union." }] }),
  component: Adhesion,
});

const schema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(80),
  prenoms: z.string().trim().min(1, "Prénoms requis").max(120),
  telephone: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, "Téléphone invalide"),
  ville: z.string().trim().min(1, "Ville requise").max(80),
  pseudo: z.string().trim().min(2, "Pseudo : 2 caractères minimum").max(40).optional().or(z.literal("")),
  employeur: z.string().trim().max(120).optional(),
  specialites: z.array(z.string()).min(1, "Choisissez au moins une spécialité").max(8),
});

function FilePick({ accept, capture, file, onFile }: { accept: string; capture: "user" | "environment"; file: File | null; onFile: (f: File | null) => void }) {
  const btn = "cursor-pointer rounded-md border bg-card px-3 py-2 text-sm font-medium";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={btn}>📷 Prendre une photo<input type="file" accept="image/*" capture={capture} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></label>
      <label className={btn}>📁 Choisir un fichier<input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></label>
      {file && <span className="text-xs text-primary">✓ {file.name}</span>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  en_attente: "bg-accent text-accent-foreground",
  validee: "bg-secondary text-secondary-foreground",
  refusee: "bg-destructive/10 text-destructive",
  suspendue: "bg-destructive/10 text-destructive",
  expiree: "bg-muted text-muted-foreground",
};

function Adhesion() {
  const { user } = Route.useRouteContext();
  const m = useMembership(user.id);
  const qc = useQueryClient();
  const skills = useQuery({
    queryKey: ["skills"],
    queryFn: async () => (await supabase.from("technician_skills").select("name").order("name")).data ?? [],
  });
  const [f, setF] = useState({ nom: "", prenoms: "", telephone: "", ville: "", pseudo: String((user as { user_metadata?: { pseudo?: string } }).user_metadata?.pseudo ?? ""), employeur: "", specialites: [] as string[], directory_consent: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [idKind, setIdKind] = useState("cni");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myDocs = useQuery({
    queryKey: ["my-id-docs", user.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("member_documents").select("id, kind, created_at").eq("user_id", user.id);
      return (data ?? []) as { id: string; kind: string; created_at: string }[];
    },
  });
  const fee = useQuery({
    queryKey: ["adhesion-fee", user.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const st = await db.from("payment_settings").select("adhesion_fee_xof").eq("id", 1).maybeSingle();
      const py = await db.from("payments").select("status").eq("user_id", user.id).eq("purpose", "adhesion");
      const list = (py.data ?? []) as { status: string }[];
      const state = list.some((x) => x.status === "validee") ? "validee" : list.some((x) => x.status === "en_attente") ? "en_attente" : list.length ? "refusee" : "aucun";
      return { amount: (st.data?.adhesion_fee_xof as number | undefined) ?? 5000, state };
    },
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (m.data) setF({ nom: m.data.nom, prenoms: m.data.prenoms, telephone: m.data.telephone, ville: m.data.ville, pseudo: (m.data as { pseudo?: string | null }).pseudo ?? "", employeur: (m.data as { employeur?: string | null }).employeur ?? "", specialites: m.data.specialites, directory_consent: m.data.directory_consent });
  }, [m.data]);

  if (m.isLoading) return <Loading />;
  const locked = m.data && m.data.status !== "en_attente";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = schema.safeParse(f);
    if (!v.success) { toast.error(v.error.issues[0]?.message ?? "Données invalides"); return; }
    const hasIdPhoto = (myDocs.data ?? []).some((d) => d.kind === "photo_identite");
    if (!hasIdPhoto && !idPhoto) { toast.error("La photo d'identité (PDF) est obligatoire."); return; }
    setBusy(true);
    try {
      let idPhotoPath: string | null = null;
      if (idPhoto) {
        const pdf = await toPdf(idPhoto);
        if (pdf.size > 5 * 1024 * 1024) throw new Error("Photo d'identité trop lourde (5 Mo max)");
        idPhotoPath = `${user.id}/photo-identite-${Date.now()}.pdf`;
        const up = await supabase.storage.from("id-documents").upload(idPhotoPath, pdf, { contentType: "application/pdf" });
        if (up.error) throw up.error;
      }
      let photo_url = m.data?.photo_url ?? null;
      if (photo) {
        const ph = await shrinkImage(photo, 900, 0.8);
        if (ph.size > 2 * 1024 * 1024) throw new Error("Photo trop lourde (2 Mo max)");
        const path = `${user.id}/photo-${Date.now()}.${ph.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("member-photos").upload(path, ph, { upsert: true });
        if (error) throw error;
        photo_url = path;
      }
      let idPath: string | null = null;
      if (idDoc) {
        const doc = await shrinkImage(idDoc, 1800, 0.85);
        if (doc.size > 5 * 1024 * 1024) throw new Error("Pièce d'identité trop lourde (5 Mo max)");
        idPath = `${user.id}/piece-${Date.now()}.${doc.name.split(".").pop() ?? "jpg"}`;
        const up = await supabase.storage.from("id-documents").upload(idPath, doc);
        if (up.error) throw up.error;
      }
      const payload = { ...v.data, pseudo: v.data.pseudo || null, employeur: v.data.employeur || null, directory_consent: f.directory_consent, photo_url, user_id: user.id };
      const { error } = m.data
        ? await supabase.from("memberships").update(payload).eq("id", m.data.id)
        : await supabase.from("memberships").insert(payload);
      if (error) throw error;
      if (idPhotoPath) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r0 = await (supabase as any).from("member_documents").insert({ user_id: user.id, kind: "photo_identite", path: idPhotoPath });
        if (r0.error) throw r0.error;
        setIdPhoto(null);
        qc.invalidateQueries({ queryKey: ["my-id-docs"] });
      }
      if (idPath) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await (supabase as any).from("member_documents").insert({ user_id: user.id, kind: idKind, path: idPath });
        if (r.error) throw r.error;
        setIdDoc(null);
        qc.invalidateQueries({ queryKey: ["my-id-docs"] });
      }
      toast.success(m.data ? "Dossier mis à jour" : "Demande envoyée. Elle sera examinée par un responsable.");
      qc.invalidateQueries({ queryKey: ["membership"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Adhésion" subtitle="Votre dossier de membre" />
      {m.data && (
        <div className="mb-5 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut de la demande</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[m.data.status]}`}>{STATUS_LABEL[m.data.status]}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Envoyée le {fmtDate(m.data.created_at)}</p>
          {m.data.review_note && <p className="mt-2 text-sm">Note : {m.data.review_note}</p>}
          {m.data.status === "validee" && <Button asChild size="sm" className="mt-3"><Link to="/carte">Voir ma carte</Link></Button>}
        </div>
      )}
      <div className="mb-5 rounded-xl border-2 border-primary/40 bg-card p-4">
        <p className="text-sm text-muted-foreground">Frais d'adhésion (obligatoires pour valider l'adhésion)</p>
        <p className="text-3xl font-extrabold">{(fee.data?.amount ?? 5000).toLocaleString("fr-FR")} FCFA</p>
        <p className="mt-1 text-sm font-medium">
          {fee.data?.state === "validee" ? "✓ Frais d'adhésion payés et confirmés"
            : fee.data?.state === "en_attente" ? "⏳ Paiement déclaré, en cours de vérification par un responsable"
            : fee.data?.state === "refusee" ? "✗ Votre dernier paiement a été refusé : déclarez-en un nouveau"
            : "À payer par Mobile Money, puis à déclarer"}
        </p>
        {fee.data?.state !== "validee" && fee.data?.state !== "en_attente" && (
          <Button asChild size="sm" className="mt-3"><Link to="/cotisation">Payer mes frais d'adhésion</Link></Button>
        )}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Nom</Label><Input value={f.nom} disabled={!!locked} onChange={(e) => setF({ ...f, nom: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Prénoms</Label><Input value={f.prenoms} disabled={!!locked} onChange={(e) => setF({ ...f, prenoms: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Téléphone</Label><Input inputMode="tel" placeholder="+225 07 00 00 00 00" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Ville</Label><Input value={f.ville} onChange={(e) => setF({ ...f, ville: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Pseudo</Label><Input placeholder="Votre pseudo" maxLength={40} value={f.pseudo} onChange={(e) => setF({ ...f, pseudo: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Employeur / média (facultatif)</Label><Input placeholder="Ex. RTI, France 24, web radio, indépendant…" value={f.employeur} onChange={(e) => setF({ ...f, employeur: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>Spécialités</Label>
          <div className="flex flex-wrap gap-2">
            {(skills.data ?? []).map((s) => {
              const on = f.specialites.includes(s.name);
              return (
                <button type="button" key={s.name}
                  onClick={() => setF({ ...f, specialites: on ? f.specialites.filter((x) => x !== s.name) : [...f.specialites, s.name] })}
                  className={`rounded-full border px-3 py-1.5 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5 rounded-xl border-2 border-primary/40 p-3">
          <Label>Photo d'identité (obligatoire, format PDF)</Label>
          <FilePick accept="application/pdf,image/png,image/jpeg,image/webp" capture="user" file={idPhoto} onFile={setIdPhoto} />
          <p className="text-xs text-muted-foreground">Envoyez un fichier PDF. Si vous prenez une photo avec le téléphone, elle est convertie automatiquement en PDF.</p>
          {(myDocs.data ?? []).some((d) => d.kind === "photo_identite")
            ? <p className="text-xs font-medium text-primary">✓ Photo d'identité (PDF) déjà envoyée</p>
            : <p className="text-xs font-medium text-destructive">Obligatoire : sans ce fichier, la demande ne peut pas être envoyée.</p>}
        </div>
        <div className="space-y-1.5"><Label>Photo pour la carte de membre (facultative)</Label><FilePick accept="image/png,image/jpeg,image/webp" capture="user" file={photo} onFile={setPhoto} /></div>
        <div className="space-y-1.5">
          <Label>Pièce d'identité : CNI, passeport… (facultative)</Label>
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={idKind} onChange={(e) => setIdKind(e.target.value)}>
            <option value="cni">Carte nationale d'identité</option>
            <option value="passeport">Passeport</option>
            <option value="permis">Permis de conduire</option>
            <option value="autre">Autre pièce</option>
          </select>
          <FilePick accept="image/png,image/jpeg,image/webp,application/pdf" capture="environment" file={idDoc} onFile={setIdDoc} />
          <p className="text-xs text-muted-foreground">Visible uniquement par les responsables de l'Union, jamais dans l'annuaire.</p>
          {(myDocs.data?.length ?? 0) > 0 && <p className="text-xs font-medium text-primary">✓ {myDocs.data!.length} pièce(s) déjà envoyée(s)</p>}
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-secondary p-3 text-sm">
          <Checkbox checked={f.directory_consent} onCheckedChange={(v) => setF({ ...f, directory_consent: v === true })} />
          <span>J'accepte d'apparaître dans l'annuaire des membres (nom, ville, spécialités, téléphone). Modifiable à tout moment.</span>
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Envoi…" : m.data ? "Mettre à jour" : "Envoyer ma demande"}</Button>
      </form>
    </div>
  );
}
