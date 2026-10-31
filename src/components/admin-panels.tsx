import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, STATUS_LABEL } from "@/lib/session";
import { Loading, Empty, ErrorBox } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { shrinkImage } from "@/lib/image";
import { galleryUrl } from "@/components/social-gallery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/* ---------- Gestion générique : formations, événements, offres, documents ---------- */

type Field = { key: string; label: string; type?: "text" | "textarea" | "datetime" | "number" | "select"; options?: string[]; required?: boolean };

export type ContentConfig = {
  table: "trainings" | "events" | "jobs" | "documents" | "social_links";
  singular: string;
  empty: string;
  fields: Field[];
  subtitle: (row: Record<string, unknown>) => string;
};

export const CONTENT: Record<string, ContentConfig> = {
  reseaux: {
    table: "social_links", singular: "réseau social", empty: "Aucun réseau social.",
    fields: [
      { key: "title", label: "Nom affiché (ex. UNTRTCI officiel)", required: true },
      { key: "platform", label: "Réseau", type: "select", options: ["facebook", "whatsapp", "youtube", "tiktok", "instagram", "x", "linkedin", "site", "autre"] },
      { key: "url", label: "Lien (https://…)", required: true },
    ],
    subtitle: (r) => `${r["platform"] as string} · ${r["url"] as string}`,
  },
  formations: {
    table: "trainings", singular: "formation", empty: "Aucune formation.",
    fields: [
      { key: "title", label: "Titre", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "location", label: "Lieu" },
      { key: "starts_at", label: "Date et heure", type: "datetime", required: true },
      { key: "seats", label: "Nombre de places", type: "number" },
    ],
    subtitle: (r) => `${fmtDate(r["starts_at"] as string)} · ${(r["location"] as string) || "—"}`,
  },
  evenements: {
    table: "events", singular: "événement", empty: "Aucun événement.",
    fields: [
      { key: "title", label: "Titre", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "location", label: "Lieu" },
      { key: "starts_at", label: "Date et heure", type: "datetime", required: true },
    ],
    subtitle: (r) => `${fmtDate(r["starts_at"] as string)} · ${(r["location"] as string) || "—"}`,
  },
  offres: {
    table: "jobs", singular: "offre", empty: "Aucune offre.",
    fields: [
      { key: "title", label: "Titre", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "location", label: "Lieu" },
      { key: "kind", label: "Type", type: "select", options: ["emploi", "mission"] },
      { key: "contact", label: "Contact (téléphone ou e-mail)" },
      { key: "closes_at", label: "Date limite", type: "datetime" },
    ],
    subtitle: (r) => `${r["kind"] as string} · ${(r["location"] as string) || "—"}`,
  },
  documents: {
    table: "documents", singular: "document", empty: "Aucun document.",
    fields: [
      { key: "title", label: "Titre", required: true },
      { key: "category", label: "Catégorie" },
      { key: "url", label: "Lien du document (https://…)", required: true },
    ],
    subtitle: (r) => `${(r["category"] as string) || "Général"}`,
  },
};

function emptyForm(cfg: ContentConfig) {
  const f: Record<string, string> = {};
  cfg.fields.forEach((x) => { f[x.key] = x.type === "select" ? (x.options?.[0] ?? "") : ""; });
  return f;
}

export function ContentManager({ cfgKey }: { cfgKey: string }) {
  const cfg = CONTENT[cfgKey]!;
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string, string>>(emptyForm(cfg));
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["admin-content", cfg.table],
    queryFn: async () => {
      const { data, error } = await db.from(cfg.table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });

  function toPayload() {
    const p: Record<string, unknown> = {};
    for (const x of cfg.fields) {
      const v = (f[x.key] ?? "").trim();
      if (x.required && !v) throw new Error(`${x.label} requis`);
      if (x.type === "datetime") p[x.key] = v ? new Date(v).toISOString() : null;
      else if (x.type === "number") p[x.key] = v ? Number(v) : null;
      else if (x.key === "contact") p[x.key] = v || null;
      else p[x.key] = v;
    }
    if ((cfg.table === "documents" || cfg.table === "social_links") && !/^https?:\/\//i.test(String(p["url"]))) throw new Error("Le lien doit commencer par https://");
    return p;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = toPayload();
      const { error } = editId
        ? await db.from(cfg.table).update(payload).eq("id", editId)
        : await db.from(cfg.table).insert(payload);
      if (error) throw error;
      toast.success(editId ? "Modifié" : "Ajouté");
      setF(emptyForm(cfg)); setEditId(null);
      qc.invalidateQueries({ queryKey: ["admin-content", cfg.table] });
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setBusy(false); }
  }

  function edit(row: Record<string, unknown>) {
    const n: Record<string, string> = {};
    cfg.fields.forEach((x) => {
      const v = row[x.key];
      if (x.type === "datetime" && v) {
        const d = new Date(v as string);
        n[x.key] = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } else n[x.key] = v == null ? "" : String(v);
    });
    setF(n); setEditId(row["id"] as string);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm(`Supprimer cette ${cfg.singular} ?`)) return;
    const { error } = await db.from(cfg.table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-content", cfg.table] });
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="space-y-2 rounded-xl border bg-card p-4">
        <p className="font-semibold">{editId ? `Modifier la ${cfg.singular}` : `Ajouter : ${cfg.singular}`}</p>
        {cfg.fields.map((x) => (
          <div key={x.key} className="space-y-1">
            <label className="text-xs text-muted-foreground">{x.label}</label>
            {x.type === "textarea" ? (
              <Textarea value={f[x.key] ?? ""} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />
            ) : x.type === "select" ? (
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f[x.key] ?? ""} onChange={(e) => setF({ ...f, [x.key]: e.target.value })}>
                {x.options!.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <Input type={x.type === "datetime" ? "datetime-local" : x.type === "number" ? "number" : "text"} value={f[x.key] ?? ""} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" disabled={busy}>{editId ? "Enregistrer" : "Ajouter"}</Button>
          {editId && <Button type="button" size="sm" variant="outline" onClick={() => { setEditId(null); setF(emptyForm(cfg)); }}>Annuler</Button>}
        </div>
      </form>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? <Empty text={cfg.empty} /> : (
        <ul className="space-y-2">
          {q.data!.map((r) => (
            <li key={r["id"] as string} className="flex items-start gap-2 rounded-xl border bg-card p-3">
              <div className="flex-1"><p className="font-semibold">{r["title"] as string}</p><p className="text-xs text-muted-foreground">{cfg.subtitle(r)}</p></div>
              <Button size="sm" variant="ghost" onClick={() => edit(r)}>Modifier</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r["id"] as string)}>Supprimer</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Alertes : notification à tous les membres ---------- */

export function Alertes() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const q = useQuery({
    queryKey: ["admin-notifs"],
    queryFn: async () => {
      const { data, error } = await db.from("notifications").select("*").is("user_id", null).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as { id: string; title: string; body: string; created_at: string }[];
    },
  });
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error("Titre et message requis"); return; }
    const { error } = await db.from("notifications").insert({ title: title.trim(), body: body.trim(), user_id: null });
    if (error) { toast.error(error.message); return; }
    toast.success("Alerte envoyée à tous les membres");
    setTitle(""); setBody("");
    qc.invalidateQueries({ queryKey: ["admin-notifs"] });
  }
  return (
    <div className="space-y-3">
      <form onSubmit={send} className="space-y-2 rounded-xl border bg-card p-4">
        <p className="font-semibold">Envoyer une alerte à tous les membres</p>
        <Input placeholder="Titre (120 caractères max)" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Message (1000 caractères max)" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button size="sm">Envoyer</Button>
      </form>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? <Empty text="Aucune alerte envoyée." /> : (
        <ul className="space-y-2">
          {q.data!.map((n) => (
            <li key={n.id} className="rounded-xl border bg-card p-3"><p className="font-semibold">{n.title}</p><p className="text-sm">{n.body}</p><p className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</p></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Assistance : demandes et réclamations ---------- */

type Support = { id: string; kind: string; subject: string; message: string; status: string; response: string | null; created_at: string };

export function Assistance() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("ouverte");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["admin-support", filter],
    queryFn: async () => {
      const { data, error } = await db.from("support_requests").select("*").eq("status", filter).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Support[];
    },
  });
  async function update(id: string, status: string) {
    const response = (answers[id] ?? "").trim();
    const patch: Record<string, unknown> = { status };
    if (response) patch["response"] = response;
    const { error } = await db.from("support_requests").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-support"] });
  }
  const labels: Record<string, string> = { ouverte: "Ouvertes", en_cours: "En cours", fermee: "Fermées" };
  return (
    <div className="space-y-3">
      <div className="flex gap-1">{Object.keys(labels).map((s) => <Button key={s} size="sm" variant={filter === s ? "secondary" : "ghost"} onClick={() => setFilter(s)}>{labels[s]}</Button>)}</div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? <Empty text="Aucune demande." /> : (
        <ul className="space-y-2">
          {q.data!.map((r) => (
            <li key={r.id} className="space-y-2 rounded-xl border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">{r.kind} · {fmtDate(r.created_at)}</p>
              <p className="font-semibold">{r.subject}</p>
              <p className="text-sm">{r.message}</p>
              {r.response && <p className="rounded-lg bg-secondary p-2 text-sm">Réponse : {r.response}</p>}
              <Textarea placeholder="Votre réponse" value={answers[r.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [r.id]: e.target.value })} />
              <div className="flex gap-2">
                {r.status !== "en_cours" && <Button size="sm" variant="outline" onClick={() => update(r.id, "en_cours")}>Prendre en charge</Button>}
                {r.status !== "fermee" && <Button size="sm" onClick={() => update(r.id, "fermee")}>Répondre et fermer</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Membres : liste complète, recherche, export ---------- */

type Mem = { id: string; user_id: string; photo_url: string | null; nom: string; prenoms: string; telephone: string; ville: string; employeur: string | null; specialites: string[]; status: string; member_number: string | null; created_at: string };

export function MembresAdmin() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin-all-members"],
    queryFn: async () => {
      const { data, error } = await db.from("memberships").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Mem[];
    },
  });
  const rows = (q.data ?? []).filter((m) => `${m.nom} ${m.prenoms} ${m.ville} ${m.employeur ?? ""} ${m.telephone} ${m.member_number ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  function csv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = ["N° membre", "Nom", "Prénoms", "Téléphone", "Ville", "Employeur", "Spécialités", "Statut", "Date"];
    const lines = rows.map((m) => [m.member_number ?? "", m.nom, m.prenoms, m.telephone, m.ville, m.employeur ?? "", m.specialites.join("; "), STATUS_LABEL[m.status as keyof typeof STATUS_LABEL] ?? m.status, fmtDate(m.created_at)].map((x) => esc(String(x))).join(","));
    return [head.map(esc).join(","), ...lines].join("\n");
  }
  async function copy() {
    try { await navigator.clipboard.writeText(csv()); toast.success("Liste copiée : collez-la dans Excel ou Google Sheets"); }
    catch { toast.error("Copie impossible"); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv()], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "membres-untrtci.csv"; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Rechercher (nom, ville, téléphone, n°)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button size="sm" variant="outline" onClick={copy}>Copier</Button>
        <Button size="sm" variant="outline" onClick={download}>CSV</Button>
      </div>
      <p className="text-xs text-muted-foreground">{rows.length} dossier(s)</p>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : rows.length === 0 ? <Empty text="Aucun résultat." /> : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.id} className="rounded-xl border bg-card p-3">
              <p className="font-semibold">{m.prenoms} {m.nom} {m.member_number && <span className="text-xs text-muted-foreground">· {m.member_number}</span>}</p>
              <p className="text-sm text-muted-foreground">{m.ville} · {m.telephone} · {STATUS_LABEL[m.status as keyof typeof STATUS_LABEL] ?? m.status}</p>
              <DossierFiles userId={m.user_id} photoUrl={m.photo_url} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Tableau de bord : chiffres clés ---------- */

export function Dashboard() {
  const q = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const count = async (t: string, f?: (x: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let r = db.from(t).select("*", { count: "exact", head: true });
        if (f) r = f(r);
        const { count: c, error } = await r;
        if (error) throw error;
        return c as number;
      };
      const [total, attente, validees, refusees, suspendues, formations, offres, ouvertes] = await Promise.all([
        count("memberships"),
        count("memberships", (r) => r.eq("status", "en_attente")),
        count("memberships", (r) => r.eq("status", "validee")),
        count("memberships", (r) => r.eq("status", "refusee")),
        count("memberships", (r) => r.eq("status", "suspendue")),
        count("trainings"), count("jobs"),
        count("support_requests", (r) => r.eq("status", "ouverte")),
      ]);
      return { total, attente, validees, refusees, suspendues, formations, offres, ouvertes };
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data!;
  const cards: [string, number][] = [
    ["Dossiers au total", d.total], ["En attente", d.attente], ["Membres validés", d.validees],
    ["Refusés", d.refusees], ["Suspendus", d.suspendues], ["Demandes d'assistance ouvertes", d.ouvertes],
    ["Formations", d.formations], ["Offres", d.offres],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(([l, n]) => (
        <div key={l} className="rounded-xl border bg-card p-4"><p className="text-2xl font-bold">{n}</p><p className="text-xs text-muted-foreground">{l}</p></div>
      ))}
    </div>
  );
}

/* ---------- Photo et pièces d'identité d'un dossier ---------- */

export function DossierFiles({ userId, photoUrl }: { userId: string; photoUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["dossier-files", userId, open],
    enabled: open,
    queryFn: async () => {
      const out: { label: string; url: string; image: boolean }[] = [];
      if (photoUrl) {
        const r = await supabase.storage.from("member-photos").createSignedUrl(photoUrl, 600);
        if (r.data?.signedUrl) out.push({ label: "Photo", url: r.data.signedUrl, image: true });
      }
      const docs = await db.from("member_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      const names: Record<string, string> = { cni: "Carte d'identité", passeport: "Passeport", permis: "Permis", autre: "Autre pièce" };
      for (const d of (docs.data ?? []) as { kind: string; path: string }[]) {
        const r = await supabase.storage.from("id-documents").createSignedUrl(d.path, 300);
        if (r.data?.signedUrl) out.push({ label: names[d.kind] ?? d.kind, url: r.data.signedUrl, image: !d.path.toLowerCase().endsWith(".pdf") });
      }
      if ((docs.data ?? []).length > 0) await db.rpc("log_document_view", { _member: userId });
      return out;
    },
  });
  return (
    <div className="mt-2">
      {!open ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Voir photo et pièces</Button>
      ) : q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun fichier envoyé.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {q.data!.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="block w-40 text-center text-xs">
              {f.image ? <img src={f.url} alt={f.label} className="h-28 w-40 rounded-lg border object-cover" /> : <div className="flex h-28 w-40 items-center justify-center rounded-lg border bg-secondary">PDF</div>}
              <span className="mt-1 block">{f.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Galerie : photos des activités ---------- */

type GItem = { id: string; title: string; caption: string | null; taken_on: string | null; image_path: string };

export function GalerieAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => {
      const { data, error } = await db.from("gallery_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as GItem[];
    },
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Donnez un titre à l'activité"); return; }
    if (files.length === 0) { toast.error("Choisissez au moins une photo"); return; }
    setBusy(true);
    try {
      let n = 0;
      for (const f of files) {
        const img = await shrinkImage(f, 1600, 0.8);
        const path = `${Date.now()}-${n}.${img.name.split(".").pop() ?? "jpg"}`;
        const up = await supabase.storage.from("gallery").upload(path, img);
        if (up.error) throw up.error;
        const r = await db.from("gallery_items").insert({ title: title.trim(), taken_on: date || null, image_path: path });
        if (r.error) throw r.error;
        n++;
      }
      toast.success(`${n} photo(s) ajoutée(s)`);
      setTitle(""); setDate(""); setFiles([]);
      qc.invalidateQueries({ queryKey: ["admin-gallery"] });
      qc.invalidateQueries({ queryKey: ["gallery-preview"] });
      qc.invalidateQueries({ queryKey: ["gallery-all"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally { setBusy(false); }
  }
  async function remove(i: GItem) {
    if (!confirm("Supprimer cette photo ?")) return;
    const r = await db.from("gallery_items").delete().eq("id", i.id);
    if (r.error) { toast.error(r.error.message); return; }
    await supabase.storage.from("gallery").remove([i.image_path]);
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
    qc.invalidateQueries({ queryKey: ["gallery-preview"] });
    qc.invalidateQueries({ queryKey: ["gallery-all"] });
  }
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="space-y-2 rounded-xl border bg-card p-4">
        <p className="font-semibold">Ajouter des photos d'une activité</p>
        <Input placeholder="Titre de l'activité (ex. Formation régie, Assemblée 2026)" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        {files.length > 0 && <p className="text-xs text-primary">{files.length} photo(s) choisie(s)</p>}
        <Button size="sm" disabled={busy}>{busy ? "Envoi en cours…" : "Ajouter"}</Button>
      </form>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? <Empty text="Aucune photo." /> : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {q.data!.map((i) => (
            <li key={i.id} className="rounded-xl border bg-card p-2">
              <img src={galleryUrl(i.image_path)} alt={i.title} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
              <p className="mt-1 text-xs font-medium">{i.title}</p>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}>Supprimer</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
