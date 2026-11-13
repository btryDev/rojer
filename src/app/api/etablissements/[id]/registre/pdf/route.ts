import { exigerUnPaiement } from "@/lib/abonnements/validation";
import { requireEtablissement } from "@/lib/auth/scope";
import { construireRegistreData } from "@/lib/pdf/builders";
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
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { compte, db, user } = await requireEtablissement(id);
  // Le registre consolidé demande d'avoir payé (ADR-053 § 15) ; un ancien
  // abonné le garde, une fois l'abonnement fini.
  await exigerUnPaiement(db, compte.compteId);

  const data = await construireRegistreData({ compte, db }, id);
  if (!data) return new Response("Établissement introuvable", { status: 404 });

  return reponsePdf(
    { type: "registre", props: { data } },
    `Registre_securite_${slugifyFilename(data.etablissement)}.pdf`,
    user.id,
    req.signal,
  );
}
