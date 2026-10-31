import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const PLATFORMS: Record<string, string> = {
  facebook: "📘 Facebook",
  whatsapp: "💬 WhatsApp",
  youtube: "▶️ YouTube",
  tiktok: "🎵 TikTok",
  instagram: "📸 Instagram",
  x: "✖️ X (Twitter)",
  linkedin: "💼 LinkedIn",
  site: "🌐 Site web",
  autre: "🔗 Autre",
};

export function galleryUrl(path: string) {
  return supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
}

export function SocialLinks() {
  const q = useQuery({
    queryKey: ["social-links"],
    queryFn: async () => {
      const { data, error } = await db.from("social_links").select("*").order("created_at");
      if (error) throw error;
      return data as { id: string; title: string; platform: string; url: string }[];
    },
  });
  if (!q.data || q.data.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold">Nos réseaux</h2>
      <div className="flex flex-wrap gap-2">
        {q.data.map((l) => (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full border bg-card px-3 py-2 text-sm font-medium shadow-sm">
            {(PLATFORMS[l.platform] ?? PLATFORMS["autre"]!).split(" ")[0]} {l.title}
          </a>
        ))}
      </div>
    </section>
  );
}

type Item = { id: string; title: string; caption: string | null; taken_on: string | null; image_path: string };

export function GalleryPreview() {
  const q = useQuery({
    queryKey: ["gallery-preview"],
    queryFn: async () => {
      const { data, error } = await db.from("gallery_items").select("*").order("created_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data as Item[];
    },
  });
  if (!q.data || q.data.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">Nos activités</h2>
        <Link to="/galerie" className="text-sm font-medium text-primary">Voir tout</Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {q.data.map((i) => (
          <Link key={i.id} to="/galerie"><img src={galleryUrl(i.image_path)} alt={i.title} loading="lazy" className="aspect-square w-full rounded-lg object-cover" /></Link>
        ))}
      </div>
    </section>
  );
}
