/**
 * L'EFFECTIF RETENU POUR UN SEUIL QUE LE TEXTE COMPTE SUR L'ENTREPRISE — une
 * seule règle, pour le moteur et pour chaque écran qui compare l'effectif de
 * l'entreprise à un seuil (C37, contre-lecture M2).
 *
 * Le produit tient deux nombres déclarés : les travailleurs du SITE, apprentis
 * compris (`Etablissement.effectifSurSite`), et les salariés de l'ENTREPRISE,
 * apprentis non compris (`Entreprise.effectif`, L. 1111-2 et L. 1111-3). Les
 * seuils d'entreprise — CSE (L. 2311-2), mise à jour annuelle du document
 * unique (R. 4121-2 1°), programme annuel de prévention (L. 4121-3-1 III 1°),
 * règlement intérieur (L. 1311-2) — se comptent sur le second.
 *
 * LE SENS DU DOUTE. Quand l'entreprise est déclarée sous le seuil alors que le
 * site l'atteint, deux explications que le produit ne sait pas départager :
 * l'écart tient aux personnes que L. 1111-3 écarte du calcul (apprentis,
 * contrats de professionnalisation…), ou l'effectif de l'entreprise n'a pas
 * été tenu à jour. Retenir l'entreprise ferait taire un seuil peut-être
 * atteint, sans que personne puisse s'en apercevoir. On retient donc le site,
 * et on le dit : `aConfirmer`. L'incertitude ne réduit jamais la couverture.
 *
 * Deux doctrines sur un même dossier étaient le défaut que ce module ferme :
 * la couverture annonçait le programme annuel à un site de cinquante sous une
 * entreprise déclarée à quarante-neuf, pendant que l'écran des actions disait
 * « sans échéance ». Tout lecteur passe désormais par ici.
 *
 * Module pur : ni Prisma, ni React.
 */

/** Les deux nombres déclarés, tels que la base les porte. */
export type EffectifsDeclares = {
  /** `Entreprise.effectif` — l'entreprise, apprentis non compris. */
  entreprise: number;
  /** `Etablissement.effectifSurSite` — le site, apprentis compris. */
  site: number;
};

export type EffectifRetenu = {
  /** Le nombre à comparer au seuil. */
  valeur: number;
  /**
   * Vrai quand `valeur` est celui du site, retenu par prudence parce que
   * l'entreprise est déclarée sous le seuil que le site atteint.
   */
  aConfirmer: boolean;
};

export function effectifRetenuPourSeuil(
  seuil: number,
  e: EffectifsDeclares,
): EffectifRetenu {
  if (e.entreprise >= seuil) return { valeur: e.entreprise, aConfirmer: false };
  if (e.site >= seuil) return { valeur: e.site, aConfirmer: true };
  return { valeur: e.entreprise, aConfirmer: false };
}

/** Le seuil est-il atteint, et l'est-il seulement par prudence ? */
export function seuilEntrepriseAtteint(
  seuil: number,
  e: EffectifsDeclares,
): { atteint: boolean; aConfirmer: boolean } {
  const r = effectifRetenuPourSeuil(seuil, e);
  return { atteint: r.valeur >= seuil, aConfirmer: r.aConfirmer };
}

/**
 * Ce que le dirigeant lit quand un seuil n'est atteint que par prudence — la
 * même phrase partout, et de quoi conclure (contre-lecture M3). Au plus près
 * des textes, relus de première main : L. 1111-3 écarte du calcul, entre
 * autres, « 1° Les apprentis » et, au 6°, « Les titulaires d'un contrat de
 * professionnalisation jusqu'au terme prévu par le contrat lorsque celui-ci
 * est à durée déterminée ou jusqu'à la fin de l'action de professionnalisation
 * lorsque le contrat est à durée indéterminée » ; L. 1111-2 compte les temps
 * partiels et les contrats à durée déterminée au prorata. L'écart entre les
 * deux nombres peut venir de l'une de ces règles, pas seulement des deux
 * premières : la phrase dit « notamment » et nomme la règle de calcul plutôt
 * que de présenter l'alternative comme binaire.
 */
export function phraseEffectifAConfirmer(
  e: EffectifsDeclares,
  consequence = "ce seuil n'est pas atteint",
): string {
  return (
    `L'entreprise est déclarée à ${e.entreprise} salarié${e.entreprise > 1 ? "s" : ""}, ` +
    `ce site à ${e.site} travailleur${e.site > 1 ? "s" : ""}. ` +
    "Si l'écart vient des règles de décompte des effectifs — notamment vos " +
    "apprentis, ou des titulaires d'un contrat de professionnalisation " +
    "jusqu'au terme de ce contrat ou de l'action de professionnalisation, " +
    "que l'art. L. 1111-3 ne compte pas, ou des temps partiels et contrats à " +
    `durée déterminée que l'art. L. 1111-2 compte au prorata —, ${consequence}. ` +
    "S'il vient d'un effectif " +
    "d'entreprise qui n'est plus à jour, mettez-le à jour sur la fiche de " +
    "l'entreprise."
  );
}

/**
 * La mention COURTE, la même sur chaque surface qui annonce un seuil
 * d'entreprise atteint par prudence seulement — checklist du contrôle, outil
 * MCP, recommandations, synthèse du document unique, écran des actions
 * (contre-lecture C37). La phrase longue (`phraseEffectifAConfirmer`) vit là où
 * il y a la place de dire de quoi conclure.
 */
export function mentionAConfirmer(seuil: number): string {
  return `à confirmer : l'entreprise est déclarée sous ${seuil} salariés, ce site en compte ${seuil} ou plus`;
}
