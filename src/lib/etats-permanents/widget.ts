/**
 * Ce que le widget « Ce qui doit être en place » du tableau de bord reçoit.
 *
 * **Même source que l'écran** : `etatsPermanentsDuDossier`, qui appelle
 * `listerEtatsPermanents` — la lecture de la page. Le widget ne refait ni la
 * sélection des obligations, ni la jointure des déclarations, ni l'ordre : il
 * aplatit ce que l'écran affiche, dans l'ordre où il l'affiche (les groupes
 * par domaine, puis « ce qui revient »). `widget.test.ts` le tient.
 *
 * **Aucun score, aucune qualification.** L'état d'une ligne est ce que l'écran
 * dit déjà d'elle : la phrase de sa déclaration quand il y en a une, « À
 * confirmer » quand seule la prudence d'un seuil la retient, sinon ce qu'il
 * reste à faire. Aucun compte n'est additionné ici.
 *
 * Sérialisé côté serveur : la date est déjà écrite, le corpus ne traverse pas.
 */

import { formaterDateFr } from "@/lib/dates";
import type { FondementLigne } from "./fondement";
import { etatDeLaLigne } from "./phrases";
import type { EtatsPermanentsDuDossier, LigneEtatPermanent } from "./queries";

export type LigneWidgetEtat = {
  obligationId: string;
  libelle: string;
  etat: string;
  fondement: FondementLigne | null;
};

/** Les lignes de l'écran, dans l'ordre de l'écran. */
export function lignesAffichees(
  d: EtatsPermanentsDuDossier,
): LigneEtatPermanent[] {
  return [...d.groupes.flatMap((g) => g.lignes), ...d.faits];
}

export function lignesDuWidget(
  d: EtatsPermanentsDuDossier,
): LigneWidgetEtat[] {
  return lignesAffichees(d).map((l) => ({
    obligationId: l.obligation.id,
    libelle: l.obligation.libelle,
    etat: etatDeLaLigne({
      mode: l.mode,
      declareLe: l.declareLe ? formaterDateFr(l.declareLe) : null,
      aConfirmer: l.aConfirmer !== null || l.questionsSansReponse.length > 0,
    }),
    fondement: l.fondement,
  }));
}
