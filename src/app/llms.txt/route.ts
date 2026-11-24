import { adressePubliqueOuNull } from "@/lib/url-publique";
import { texteLlms } from "./texte";

/** `llms.txt` : le texte est dans `texte.ts` (une route n'exporte que ses méthodes). */
export function GET(): Response {
  // Adresse publique inconnue : pas de fichier plutôt que des liens vers
  // localhost (même règle que `sitemap.xml`).
  const base = adressePubliqueOuNull();
  if (!base || !process.env.PUBLIC_APP_URL) return new Response("Not Found", { status: 404 });
  return new Response(texteLlms(base), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
