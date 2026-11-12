import { SecteurCard } from "./SecteurCard";

type SecteurOption = {
  id: string;
  nom: string;
  description: string;
  codesNaf: string[];
};

/**
 * Les autres secteurs, montrés d'emblée sous le secteur détecté (2026-11-12,
 * décision de la propriétaire) : un bouton à déplier cachait qu'on pouvait
 * en choisir un autre.
 */
export function AutresSecteurs({
  duerpId,
  secteurs,
  secteurChoisiId,
}: {
  duerpId: string;
  secteurs: SecteurOption[];
  secteurChoisiId: string | null;
}) {
  if (secteurs.length === 0) return null;
  return (
    <section data-ecriture aria-labelledby="autres-secteurs" className="flex flex-col gap-4">
      <h3 id="autres-secteurs" className="board-surtitre m-0">
        Autres secteurs
      </h3>
      <div className="grid gap-[22px] md:grid-cols-2 lg:grid-cols-3">
        {secteurs.map((r) => (
          <SecteurCard
            key={r.id}
            duerpId={duerpId}
            secteurId={r.id}
            nom={r.nom}
            description={r.description}
            codesNaf={r.codesNaf}
            dejaChoisi={secteurChoisiId === r.id}
          />
        ))}
      </div>
    </section>
  );
}
