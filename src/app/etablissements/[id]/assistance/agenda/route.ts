import { requireEtablissement } from "@/lib/auth/scope";
import { calendrierDuRendezVous } from "@/lib/assistance/agenda";

/**
 * « Ajouter à mon agenda » (ADR-063 § 6) : le fichier `.ics` du rendez-vous
 * annuel à venir du compte. Lu par le client borné ; 404 sans rendez-vous à
 * venir, ou pour l'établissement d'un autre compte.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireEtablissement(id);
  const maintenant = new Date();
  const rdv = await db.rendezVousAssistance.findFirst({
    where: { annuleLe: null, fin: { gt: maintenant } },
    orderBy: { debut: "asc" },
    select: { id: true, debut: true, fin: true, mode: true, telephone: true, updatedAt: true },
  });
  if (!rdv) return new Response("Aucun rendez-vous à venir.", { status: 404 });
  // La révision : le dernier changement du rendez-vous (un déplacement la fait croître).
  return new Response(calendrierDuRendezVous(rdv, maintenant, { revision: rdv.updatedAt }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rendez-vous-rojer.ics"',
      "Cache-Control": "no-store",
    },
  });
}
