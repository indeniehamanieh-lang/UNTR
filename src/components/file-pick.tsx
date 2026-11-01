export function FilePick({ accept, capture, file, onFile }: { accept: string; capture: "user" | "environment"; file: File | null; onFile: (f: File | null) => void }) {
  const btn = "cursor-pointer rounded-md border bg-card px-3 py-2 text-sm font-medium";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={btn}>📷 Prendre une photo<input type="file" accept="image/*" capture={capture} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></label>
      <label className={btn}>📁 Choisir un fichier<input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></label>
      {file && <span className="text-xs text-primary">✓ {file.name}</span>}
    </div>
  );
}
