import { OUVERT_AUX_MOTEURS } from "@/lib/indexation";
import { adressePubliqueOuNull } from "@/lib/url-publique";
import { texteLlms } from "./texte";

/** `llms.txt` : le texte est dans `texte.ts` (une route n'exporte que ses méthodes). */
export function GET(): Response {
  // Site fermé aux moteurs, ou adresse publique inconnue : pas de fichier
  // (mêmes règles que `sitemap.xml` — rien d'annoncé avant l'ouverture,
  // jamais un lien vers localhost).
  const base = adressePubliqueOuNull();
  if (!OUVERT_AUX_MOTEURS || !base || !process.env.PUBLIC_APP_URL) return new Response("Not Found", { status: 404 });
  return new Response(texteLlms(base), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
