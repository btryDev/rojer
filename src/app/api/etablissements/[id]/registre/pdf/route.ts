import { requireEtablissement } from "@/lib/auth/scope";
import { construireRegistreData } from "@/lib/pdf/builders";
import { RegistreDocument } from "@/lib/pdf/RegistreDocument";
import { slugifyFilename } from "@/lib/pdf/styles";
import { reponsePdf } from "@/lib/pdf/reponse";

/**
 * Registre de sécurité en PDF (art. L. 4711-5 CT).
 *
 * `requireEtablissement` borne la route au périmètre du user connecté (cf.
 * `controle-zip/route.ts`) : l'en-tête du registre identifie l'entreprise et
 * l'établissement, qui n'ont rien à faire dans les mains d'un tiers.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, db } = await requireEtablissement(id);

  const data = await construireRegistreData(db, id, user);
  if (!data) return new Response("Établissement introuvable", { status: 404 });

  return reponsePdf(
    RegistreDocument({ data }),
    `Registre_securite_${slugifyFilename(data.etablissement)}.pdf`,
  );
}
