import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, STATUS_LABEL, fmtDate, type Role } from "@/lib/session";
import { Loading, Empty, ErrorBox, PageHeader } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContentManager, Alertes, Assistance, MembresAdmin, Dashboard } from "@/components/admin-panels";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Back-office — UNTRTCI" }, { name: "description", content: "Gestion des membres, contenus et rôles de l'UNTRTCI." }, { property: "og:title", content: "Back-office — UNTRTCI" }, { property: "og:description", content: "Administration de l'Union." }] }),
  component: Admin,
});

type TabKey = "accueil" | "adhesions" | "membres" | "formations" | "evenements" | "offres" | "documents" | "actus" | "alertes" | "assistance" | "roles";

type Status = "en_attente" | "validee" | "refusee" | "suspendue" | "expiree";

function Admin() {
  const { user } = Route.useRouteContext();
  const roles = useRoles(user.id);
  const [tab, setTab] = useState<TabKey>("accueil");
  if (roles.isLoading) return <Loading />;
  if (!roles.data?.isStaff) return <Empty text="Accès réservé à l'équipe de l'Union." />;
  const tabs = [
    ...(roles.data.isManager ? [{ k: "accueil", l: "Tableau de bord" }, { k: "adhesions", l: "Adhésions" }, { k: "membres", l: "Membres" }] : []),
    { k: "formations", l: "Formations" },
    { k: "evenements", l: "Événements" },
    { k: "offres", l: "Offres" },
    { k: "documents", l: "Documents" },
    { k: "actus", l: "Actualités" },
    { k: "alertes", l: "Alertes" },
    ...(roles.data.isManager ? [{ k: "assistance", l: "Assistance" }] : []),
    ...(roles.data.isSuper ? [{ k: "roles", l: "Rôles" }] : []),
  ] as { k: TabKey; l: string }[];
  const active = tabs.some((t) => t.k === tab) ? tab : (tabs[0]?.k ?? "actus");
  return (
    <div className="space-y-4">
      <Link to="/accueil" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Retour</Link>
      <PageHeader title="Back-office" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => <Button key={t.k} size="sm" variant={active === t.k ? "default" : "outline"} onClick={() => setTab(t.k)}>{t.l}</Button>)}
      </div>
      {active === "accueil" && <Dashboard />}
      {active === "adhesions" && <Adhesions />}
      {active === "membres" && <MembresAdmin />}
      {(active === "formations" || active === "evenements" || active === "offres" || active === "documents") && <ContentManager key={active} cfgKey={active} />}
      {active === "alertes" && <Alertes />}
      {active === "assistance" && <Assistance />}
      {active === "actus" && <Actus userId={user.id} />}
      {active === "roles" && <Roles />}
    </div>
  );
}

function Adhesions() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status>("en_attente");
  const q = useQuery({
    queryKey: ["admin-memberships", filter],
    queryFn: async () => {
      const { data, error } = await supabase.from("memberships").select("*").eq("status", filter).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function review(id: string, status: Status) {
    const note = status === "refusee" || status === "suspendue" ? prompt("Motif (facultatif)") ?? undefined : undefined;
    const { error } = await supabase.rpc("review_membership", { _id: id, _status: status, ...(note ? { _note: note } : {}) });
    if (error) { toast.error(error.message); return; }
    toast.success("Dossier mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-memberships"] });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <Button key={s} size="sm" variant={filter === s ? "secondary" : "ghost"} onClick={() => setFilter(s)}>{STATUS_LABEL[s]}</Button>)}
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? <Empty text="Aucun dossier." /> : (
        <ul className="space-y-2">
          {q.data!.map((m) => (
            <li key={m.id} className="rounded-xl border bg-card p-4">
              <p className="font-semibold">{m.prenoms} {m.nom} {m.member_number && <span className="text-xs text-muted-foreground">· {m.member_number}</span>}</p>
              <p className="text-sm text-muted-foreground">{m.ville} · {m.telephone} · {m.specialites.join(", ")}</p>
              <p className="text-xs text-muted-foreground">Déposé le {fmtDate(m.created_at)}</p>
              {m.review_note && <p className="mt-1 text-xs">Note : {m.review_note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {m.status !== "validee" && <Button size="sm" onClick={() => review(m.id, "validee")}>Valider</Button>}
                {m.status === "en_attente" && <Button size="sm" variant="outline" onClick={() => review(m.id, "refusee")}>Refuser</Button>}
                {m.status === "validee" && <Button size="sm" variant="destructive" onClick={() => review(m.id, "suspendue")}>Suspendre</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Actus({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const q = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error("Titre et texte requis"); return; }
    const { error } = await supabase.from("news").insert({ title, body, author_id: userId, kind: "communiqué" });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setBody("");
    toast.success("Publié");
    qc.invalidateQueries({ queryKey: ["admin-news"] });
    qc.invalidateQueries({ queryKey: ["news"] });
  }
  async function remove(id: string) {
    if (!confirm("Supprimer cette actualité ?")) return;
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-news"] });
    qc.invalidateQueries({ queryKey: ["news"] });
  }
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="space-y-2 rounded-xl border bg-card p-4">
        <p className="font-semibold">Nouveau communiqué</p>
        <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Texte" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button size="sm">Publier</Button>
      </form>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? <Empty text="Aucune actualité." /> : (
        <ul className="space-y-2">
          {q.data!.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-xl border bg-card p-3">
              <div className="flex-1"><p className="font-semibold">{n.title}</p><p className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</p></div>
              <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>Supprimer</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Roles() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("gestionnaire");
  async function apply(grant: boolean) {
    if (!email.trim()) { toast.error("E-mail requis"); return; }
    const { error } = await supabase.rpc("set_user_role", { _email: email.trim(), _role: role, _grant: grant });
    if (error) { toast.error(error.message); return; }
    toast.success(grant ? "Rôle attribué" : "Rôle retiré");
  }
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <p className="font-semibold">Attribuer ou retirer un rôle</p>
      <Input type="email" placeholder="E-mail du compte" value={email} onChange={(e) => setEmail(e.target.value)} />
      <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        <option value="responsable">Responsable de l'Union</option>
        <option value="gestionnaire">Gestionnaire de contenu</option>
        <option value="super_admin">Super administrateur</option>
      </select>
      <div className="flex gap-2"><Button size="sm" onClick={() => apply(true)}>Attribuer</Button><Button size="sm" variant="outline" onClick={() => apply(false)}>Retirer</Button></div>
    </div>
  );
}
