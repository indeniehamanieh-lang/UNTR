import { shrinkImage } from "@/lib/image";

// Transforme une photo (JPG, PNG…) en fichier PDF d'une page. Un PDF est renvoyé tel quel.
export async function toPdf(file: File): Promise<File> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return file;
  const jpg = await shrinkImage(file, 1600, 0.85);
  if (jpg.type !== "image/jpeg") throw new Error("Image illisible. Utilisez une photo ou un fichier PDF.");
  const bytes = new Uint8Array(await jpg.arrayBuffer());
  const bmp = await createImageBitmap(jpg);
  const w = bmp.width;
  const h = bmp.height;
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (u: Uint8Array) => { parts.push(u); len += u.length; };
  const text = (s: string) => push(enc.encode(s));
  text("%PDF-1.4\n");
  offsets[1] = len; text("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  offsets[2] = len; text("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  offsets[3] = len; text(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  offsets[4] = len; text(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
  push(bytes); text("\nendstream\nendobj\n");
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  offsets[5] = len; text(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  const xref = len;
  let x = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) x += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  text(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new File(parts as BlobPart[], "photo-identite.pdf", { type: "application/pdf" });
}
