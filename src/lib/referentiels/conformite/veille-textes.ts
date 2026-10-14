// Les textes qu'on sait devoir relire, et qui ne se rattachent à aucune
// obligation existante.
//
// `Obligation.relectureDue` couvre le cas où un article qu'on cite déjà change.
// Il ne couvre pas l'autre moitié du problème : un texte paru, à application
// différée, qui modifiera un corpus qu'on suit sans viser précisément une de
// nos lignes. L'arrêté du 19 février 2026 modifie GN, GE, CO, AM et EL du
// règlement ERP au 1er juin 2027 — aucune de nos obligations ne le porterait
// sans arbitraire, et l'oublier serait pourtant une faute.
//
// Ces entrées ne produisent aucun effet sur le calendrier d'un établissement.
// Elles n'existent que pour la veille : un test échoue quand la date arrive,
// et le dépouillement décide alors s'il y a une obligation à créer, à modifier,
// ou rien.
//
// Règle d'entrée, la même que pour le référentiel : on n'inscrit ici qu'un
// texte dont on a lu la disposition d'entrée en vigueur à la source. Un
// signal rapporté par un tiers se vérifie avant d'être inscrit.

export type TexteAVenir = {
  /** Intitulé tel qu'il se cite. */
  intitule: string;
  /** Date d'entrée en vigueur, en clé de jour civil « AAAA-MM-JJ ». */
  entreeEnVigueur: string;
  url: string;
  /** Ce qu'il change, et ce qu'il faudra regarder ce jour-là. */
  portee: string;
  /**
   * Date à laquelle la disposition d'entrée en vigueur a été lue à la source.
   * Sans ce repère, on ne sait pas si la date vient du texte ou d'un tiers.
   */
  verifieLe: string;
};

export const TEXTES_A_VENIR: readonly TexteAVenir[] = [
  {
    intitule:
      "Décret n° 2025-1100 du 19 novembre 2025 (seconde vague, art. 5 II)",
    entreeEnVigueur: "2027-01-01",
    url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052611335",
    portee:
      "Modifie R. 4227-37 du Code du travail — dont dépend, par renvoi, le champ des exercices de R. 4227-39 — et crée les articles R. 144-16 et R. 144-17 du CCH, qui instituent un régime de registre pour les bâtiments à usage professionnel. ~~La notice annonce une application aux seules opérations dont la demande d'autorisation d'urbanisme est déposée à compter de cette date : à confirmer, car cela déterminerait si le parc existant est concerné.~~ [2026-10-14, relu sur l'API Légifrance (vérifié d'abord le 2026-08-26) : confirmé par le nota des articles, qui reprend l'art. 5 II — opérations de construction ou de rénovation de bâtiments à usage professionnel dont la demande d'autorisation d'urbanisme est déposée à compter du 1er janvier 2027, ou dont les travaux débutent à cette date sans autorisation. R. 4227-37 est DÉPOUILLÉ le même jour : premier alinéa repris mot pour mot, seul le renvoi des instructions d'évacuation passe de R. 4216-2 1° au deuxième alinéa de R. 141-7 du CCH ; porté par les `relectureDue` de `incendie-travail-consigne-affichee` et `incendie-travail-instructions-evacuation`, à solder le 1er janvier 2027. RESTENT À DÉPOUILLER à cette date : R. 144-16 (registre de sécurité élaboré par le maître d'ouvrage et tenu à jour par les utilisateurs, bâtiments neufs ou rénovés) et R. 144-17 du CCH, et R. 4227-2 du Code du travail, qui porte une version au même jour.]",
    verifieLe: "2026-10-14",
  },
  {
    intitule:
      "Arrêté du 19 février 2026 modifiant l'arrêté du 25 juin 1980 (règlement de sécurité ERP)",
    entreeEnVigueur: "2027-06-01",
    url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053525217",
    portee:
      "Structures en matériaux combustibles et façades : modifie GN 4 et GN 16 (nouveau), GE 2, GE 6, GE 7, CO 6 à CO 34, AM 1 à AM 8, EL 5 et AS 1. Aucune de nos obligations ne cite ces articles aujourd'hui, mais nous citons EL 19 et GE 4 dans le même corpus. « Le présent arrêté entre en vigueur le 1er juin 2027. Les dispositions du présent arrêté s'appliqueront aux demandes d'autorisation de travaux déposées à compter de cette date. » — le parc existant n'est donc pas visé, ce qui limite la portée pour nos utilisateurs.",
    verifieLe: "2026-08-26",
  },
];
