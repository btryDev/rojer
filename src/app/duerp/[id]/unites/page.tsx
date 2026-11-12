import { PlafondDeCreation } from "@/components/quotas/PlafondDeCreation";
import { notFound } from "next/navigation";
import { AjouterUniteForm } from "@/components/duerps/AjouterUniteForm";
import { UniteRow } from "@/components/duerps/UniteRow";
import { ValiderEtapeBouton } from "@/components/duerps/ValiderEtapeBouton";
import { EnTeteEtape } from "@/components/duerps/EnTeteEtape";
import { getDuerp } from "@/lib/duerps/queries";

export default async function UnitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const unitesVisibles = duerp.unites.filter((u) => !u.estTransverse);
  const unitesOk = unitesVisibles.length > 0;

  return (
    <div className="flex flex-col gap-8">

      {/* Allégé le 2026-11-11 : la définition d'une unité était dite deux
          fois (infobulle et paragraphe) ; elle est derrière le « ? ». */}
      <EnTeteEtape
        page="unites"
        titre="Vérifiez vos unités de travail"
        aide={{
          titre: "Qu'est-ce qu'une unité de travail",
          contenu: (
            <p className="m-0">
              Une unité de travail regroupe des salariés exposés aux mêmes
              risques. Ça peut être un poste (ex. accueil), une zone (ex.
              cuisine) ou une activité (ex. livraison). L&apos;évaluation se
              fait unité par unité, à l&apos;étape suivante.
            </p>
          ),
        }}
      >
        Proposées selon votre secteur. Renommez, supprimez ou ajoutez.
      </EnTeteEtape>

      {/* Les unités en cartes (2026-11-12, demande de la propriétaire), sur
          le canevas ; l'ajout en tête, dans une fenêtre. */}
      <section aria-label="Unités de travail" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="board-surtitre m-0">
            {unitesVisibles.length} unité{unitesVisibles.length > 1 ? "s" : ""}
          </p>
          {/* La limite d'unités de l'essai, annoncée avant la saisie (ADR-053 § 14). */}
          <PlafondDeCreation cle="unitesTravail">
            <AjouterUniteForm duerpId={id} />
          </PlafondDeCreation>
        </div>
        {unitesVisibles.length === 0 ? (
          <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Aucune unité de travail. Ajoutez-en au moins une pour continuer.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {unitesVisibles.map((u) => (
              <UniteRow
                key={u.id}
                id={u.id}
                nom={u.nom}
                description={u.description}
                nombreRisques={u.risques.length}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {/* Valider, même sans rien changer, coche l'étape (2026-11-11) : les
            unités pré-remplies par le secteur ne la cochent plus seules. Sans
            unité, un vrai `disabled` (interdit 20). */}
        <ValiderEtapeBouton duerpId={id} etablissementId={duerp.etablissementId} etape="unites" disabled={!unitesOk} />
      </div>
    </div>
  );
}
