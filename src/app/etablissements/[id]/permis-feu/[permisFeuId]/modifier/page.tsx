import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormulairePermisFeu } from "@/components/permis-feu/FormulairePermisFeu";
import { getPermisFeu } from "@/lib/permis-feu/queries";
import { listPrestataires } from "@/lib/prestataires/queries";
import { listerBatimentsDeLEtablissement } from "@/lib/batiments/queries";
import { statutPermisSignable } from "@/lib/signatures/etat-signable";
import { motifContenuScelle } from "@/lib/signatures/verrou-contenu";
import { versSaisieDateHeure } from "@/lib/dates";

export const metadata = {
  title: "Modifier le permis de feu",
};

/**
 * Corriger un permis (audit du 2026-10-12, constat 4) : le formulaire de
 * création, rouvert sur ce permis. Signé, son contenu est scellé et l'écran
 * dit pourquoi (`motifContenuScelle`) ; terminé ou annulé, il ne se modifie
 * plus.
 */
export default async function ModifierPermisFeuPage({
  params,
}: {
  params: Promise<{ id: string; permisFeuId: string }>;
}) {
  const { id, permisFeuId } = await params;
  const permis = await getPermisFeu(id, permisFeuId);
  if (!permis || !statutPermisSignable(permis.statut)) notFound();
  const [prestatairesAnnuaire, batiments] = await Promise.all([
    listPrestataires(id),
    listerBatimentsDeLEtablissement(id),
  ]);

  const numero = `PF-${String(permis.numero).padStart(3, "0")}`;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}/permis-feu/${permis.id}`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Permis {numero}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Modifier le permis {numero}
        </h1>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <FormulairePermisFeu
            etablissementId={id}
            prestataires={prestatairesAnnuaire.map((p) => ({
              id: p.id,
              raisonSociale: p.raisonSociale,
              contactNom: p.contactNom,
              contactEmail: p.contactEmail,
            }))}
            batiments={batiments}
            scelle={motifContenuScelle("permis", permis.signatures.length)}
            permis={{
              id: permis.id,
              prestataireId: permis.prestataireId,
              prestataireRaison: permis.prestataireRaison,
              prestataireContact: permis.prestataireContact,
              prestataireEmail: permis.prestataireEmail,
              donneurOrdreNom: permis.donneurOrdreNom,
              donneurOrdreFonction: permis.donneurOrdreFonction,
              dateDebut: versSaisieDateHeure(permis.dateDebut),
              dateFin: versSaisieDateHeure(permis.dateFin),
              batimentId: permis.batimentId,
              lieu: permis.lieu,
              naturesTravaux: permis.naturesTravaux,
              descriptionTravaux: permis.descriptionTravaux,
              mesuresValidees: permis.mesuresValidees,
              mesuresNotes: permis.mesuresNotes,
              dureeSurveillanceMinutes: permis.dureeSurveillanceMinutes,
            }}
          />
        </div>
      </div>
    </main>
  );
}
