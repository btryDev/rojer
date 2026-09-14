import type { PermisFeu } from "@prisma/client";
import { ETAT_PERMIS } from "@/lib/permis-feu/etats";
import {
  LigneFiche,
  PastilleFiche,
  TuileDate,
  TuileMuette,
} from "@/components/ui-kit";
import { LABEL_NATURE } from "@/lib/permis-feu/schema";
import type { RegistreLigne } from "@/lib/calendrier/etats";
import { etatPermisFeu } from "@/lib/calendrier/echeances";
import { formaterDateCourteFr } from "@/lib/dates";

/**
 * La ligne d'un permis de feu dans le registre du module, en charte board
 * (`docs/charte-board.md`).
 *
 * Elle était un `cartouche` coiffé d'un filet de couleur qui portait seul le
 * statut : `--seal` pour un brouillon comme pour un permis terminé, deux
 * états que plus rien ne distinguait ensuite. Le board dit l'état par un
 * champ ET un mot — la pastille nomme le statut, la tuile-date porte
 * l'ouverture des travaux. C'est la couture avec la fiche : on clique une
 * ligne, on ouvre une tête qui reprend la même date au même endroit.
 */



export function PermisFeuCard({
  etablissementId,
  permis,
}: {
  etablissementId: string;
  permis: PermisFeu;
}) {
  const maintenant = new Date();
  // Un permis terminé est un acquis quelle que soit sa date — c'est déjà la
  // lecture qu'en fait la fiche. Un permis annulé, lui, n'a plus de
  // rendez-vous : lui peindre une tuile-date annoncerait des travaux qui
  // n'auront pas lieu.
  const etat: RegistreLigne =
    permis.statut === "termine"
      ? "faite"
      : etatPermisFeu(permis, maintenant);

  const natures = permis.naturesTravaux
    .map((n) => LABEL_NATURE[n])
    .join(" · ");

  return (
    <LigneFiche
      href={`/etablissements/${etablissementId}/permis-feu/${permis.id}`}
      tuile={
        permis.statut === "annule" ? (
          <TuileMuette>Annulé</TuileMuette>
        ) : (
          <TuileDate date={permis.dateDebut} etat={etat} />
        )
      }
      surtitre={
        <>
          <span className="tabular-nums">
            PF-{String(permis.numero).padStart(3, "0")}
          </span>
          {natures ? ` · ${natures}` : ""}
        </>
      }
      titre={permis.prestataireRaison}
      detail={
        <>
          {permis.lieu}
          <span className="mt-0.5 block font-mono text-[11.5px] tabular-nums text-[color:var(--board-slate-soft)]">
            Du {formaterDateCourteFr(permis.dateDebut)} au{" "}
            {formaterDateCourteFr(permis.dateFin)}
          </span>
        </>
      }
      droite={
        <PastilleFiche ton={ETAT_PERMIS[permis.statut].ton}>
          {ETAT_PERMIS[permis.statut].mot}
        </PastilleFiche>
      }
    />
  );
}
