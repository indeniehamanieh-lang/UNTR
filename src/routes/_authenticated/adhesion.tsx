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

export const Route = createFileRoute("/_authenticated/adhesion")({
  head: () => ({ meta: [{ title: "Adhésion — UNTRTCI" }, { name: "description", content: "Demande d'adhésion à l'UNTRTCI." }, { property: "og:title", content: "Adhésion — UNTRTCI" }, { property: "og:description", content: "Rejoignez l'Union." }] }),
  component: Adhesion,
});

const schema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(80),
  prenoms: z.string().trim().min(1, "Prénoms requis").max(120),
  telephone: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, "Téléphone invalide"),
  ville: z.string().trim().min(1, "Ville requise").max(80),
  specialites: z.array(z.string()).min(1, "Choisissez au moins une spécialité").max(8),
});

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
  const [f, setF] = useState({ nom: "", prenoms: "", telephone: "", ville: "", specialites: [] as string[], directory_consent: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (m.data) setF({ nom: m.data.nom, prenoms: m.data.prenoms, telephone: m.data.telephone, ville: m.data.ville, specialites: m.data.specialites, directory_consent: m.data.directory_consent });
  }, [m.data]);

  if (m.isLoading) return <Loading />;
  const locked = m.data && m.data.status !== "en_attente";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = schema.safeParse(f);
    if (!v.success) { toast.error(v.error.issues[0]?.message ?? "Données invalides"); return; }
    setBusy(true);
    try {
      let photo_url = m.data?.photo_url ?? null;
      if (photo) {
        if (photo.size > 2 * 1024 * 1024) throw new Error("Photo trop lourde (2 Mo max)");
        const path = `${user.id}/photo-${Date.now()}.${photo.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("member-photos").upload(path, photo, { upsert: true });
        if (error) throw error;
        photo_url = path;
      }
      const payload = { ...v.data, directory_consent: f.directory_consent, photo_url, user_id: user.id };
      const { error } = m.data
        ? await supabase.from("memberships").update(payload).eq("id", m.data.id)
        : await supabase.from("memberships").insert(payload);
      if (error) throw error;
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
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Nom</Label><Input value={f.nom} disabled={!!locked} onChange={(e) => setF({ ...f, nom: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Prénoms</Label><Input value={f.prenoms} disabled={!!locked} onChange={(e) => setF({ ...f, prenoms: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Téléphone</Label><Input inputMode="tel" placeholder="+225 07 00 00 00 00" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Ville</Label><Input value={f.ville} onChange={(e) => setF({ ...f, ville: e.target.value })} /></div>
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
        <div className="space-y-1.5"><Label>Photo (facultative, 2 Mo max)</Label><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></div>
        <label className="flex items-start gap-3 rounded-xl bg-secondary p-3 text-sm">
          <Checkbox checked={f.directory_consent} onCheckedChange={(v) => setF({ ...f, directory_consent: v === true })} />
          <span>J'accepte d'apparaître dans l'annuaire des membres (nom, ville, spécialités, téléphone). Modifiable à tout moment.</span>
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Envoi…" : m.data ? "Mettre à jour" : "Envoyer ma demande"}</Button>
      </form>
    </div>
  );
}
