import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loading, Empty, ErrorBox, PageHeader } from "@/components/ui-states";
import { galleryUrl } from "@/components/social-gallery";

export const Route = createFileRoute("/_authenticated/galerie")({
  head: () => ({ meta: [{ title: "Nos activités — UNTRTCI" }] }),
  component: Galerie,
});

function Galerie() {
  const q = useQuery({
    queryKey: ["gallery-all"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("gallery_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; title: string; caption: string | null; taken_on: string | null; image_path: string }[];
    },
  });
  return (
    <div>
      <PageHeader title="Nos activités" />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : q.data!.length === 0 ? <Empty text="Aucune photo pour le moment." /> : (
        <ul className="grid grid-cols-2 gap-3">
          {q.data!.map((i) => (
            <li key={i.id} className="overflow-hidden rounded-xl border bg-card">
              <a href={galleryUrl(i.image_path)} target="_blank" rel="noopener noreferrer">
                <img src={galleryUrl(i.image_path)} alt={i.title} loading="lazy" className="aspect-square w-full object-cover" />
              </a>
              <div className="p-2">
                <p className="text-sm font-semibold">{i.title}</p>
                {i.taken_on && <p className="text-xs text-muted-foreground">{new Date(i.taken_on).toLocaleDateString("fr-FR")}</p>}
                {i.caption && <p className="text-xs text-muted-foreground">{i.caption}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
