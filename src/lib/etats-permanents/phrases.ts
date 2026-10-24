/**
 * Les phrases de l'écran qui s'accordent en nombre, sorties du JSX.
 *
 * **Elles y étaient assemblées, et une s'est cassée.** Le contrôle visuel du
 * 2026-08-31 a lu « Elles n'entrepas dans le compte » : un ternaire qui rendait
 * la moitié d'une locution — `{n === 1 ? "Elle n'entre" : "Elles n'entrent"} pas`
 * — et l'espace qui séparait les deux moitiés a disparu au rendu.
 *
 * **Le défaut n'est pas l'espace, c'est la coupure.** Couper « n'entre pas » au
 * milieu confie la cohésion d'une locution à une règle de mise en page, et
 * personne ne relit une phrase qui n'existe nulle part en entier — ni un humain,
 * qui ne voit que des fragments dans le source, ni un test, qui ne peut pas
 * lire du JSX. C'est la famille de défauts que la journée a traquée : du texte
 * assemblé que personne ne relit.
 *
 * Ici chaque fonction rend **une phrase complète**. Elle se lit dans le source,
 * elle se teste, et toutes ses branches s'exercent — y compris celles qu'un
 * dossier ne montre jamais.
 *
 * **Deux d'entre elles ne sont plus seulement celles de l'écran.**
 * `phraseDeclaration` et `phraseFaitsDates` sont reprises telles quelles par le
 * dossier de conformité PDF (`pdf/mentions-etats-permanents.ts`) : c'est le
 * même verbe pour la même déclaration des deux côtés, et deux rédactions d'une
 * même chose auraient divergé à la première correction. Aucune des deux ne
 * s'adresse à un lecteur en particulier, et c'est ce qui le permet —
 * `phraseCompteur`, qui dit « par vous », reste propre à l'écran et le document
 * en a une autre.
 */

/*
 * ~~`phraseRestantes`~~ (retirée le 2026-10-21, revue de code : plus aucun
 * appelant depuis le 2026-10-20). Sa mise en garde — « une ligne non déclarée
 * n'est pas un manquement constaté » — est dite dans l'aide de l'en-tête de
 * l'écran et dans le dossier de conformité.
 */

/**
 * Ce que le second verbe recouvre, et pourquoi il ne compte pas.
 *
 * Rendue **à côté des lignes concernées** et non en pied de page : le contrôle
 * visuel a montré qu'une explication placée après la liste arrive une fois que
 * tout est déjà coché — le relecteur a coché douze lignes en sept secondes sans
 * en lire une seule.
 */
export function phraseFaitsDates(
  faitsDates: number,
  renseignes: number,
): string | null {
  if (faitsDates <= 0) return null;

  const quoi =
    faitsDates === 1
      ? "Le texte fait revenir cette obligation, sans dire à quel rythme."
      : `Les textes font revenir ces ${faitsDates} obligations, sans dire à quel rythme.`;

  const consequence =
    faitsDates === 1
      ? "Elle se date donc — « fait le » — au lieu de se déclarer en place, et elle n'entre pas dans le compte de l'en-tête, qui ne parle que d'états."
      : "Elles se datent donc — « fait le » — au lieu de se déclarer en place, et elles n'entrent pas dans le compte de l'en-tête, qui ne parle que d'états.";

  const etat =
    renseignes === 0
      ? faitsDates === 1
        ? "Elle ne porte pas encore de date."
        : "Aucune ne porte encore de date."
      : renseignes === faitsDates
        ? faitsDates === 1
          ? "Elle porte une date."
          : "Toutes portent une date."
        : // Le sujet du verbe est `renseignes`, pas `faitsDates` : « 1 sur 3
          // PORTE une date ». La branche interpolée était la seule du fichier
          // à ne pas s'accorder — toutes les autres traitent le singulier,
          // parce qu'elles sont écrites en toutes lettres et que l'œil le
          // voit. Ici un nombre s'insère, et l'accord se perd avec lui.
          renseignes === 1
          ? `1 sur ${faitsDates} porte une date.`
          : `${renseignes} sur ${faitsDates} portent une date.`;

  return `${quoi} ${consequence} ${etat}`;
}

/**
 * Le compte de l'en-tête de PAGE, écrit en toutes lettres sous le chiffre.
 *
 * « déclarés en place **par vous** », jamais « conformes » : le produit assiste,
 * il ne certifie pas (`CLAUDE.md`, règle 8).
 *
 * **La seule phrase de l'écran qui dit qui affirme, et elle n'y est qu'une
 * fois** (2026-10-17, revue de c6). Elle se lisait aussi sous chaque famille,
 * et une variante courte — `phraseSommaire`, retirée — dans le sommaire : trois
 * rédactions de la même affirmation sur un même écran, qui ne s'accordaient
 * pas entre elles (« 0 sur 10 déclaré par vous » au sommaire, « déclarés en
 * place par vous » sous la famille, « d'après les titres » ici, « établis
 * d'après les titres déclarés » là). Les familles et le sommaire ne portent
 * plus que « X sur Y » ; l'en-tête de page dit pour tous d'où vient « en
 * place ».
 *
 * ~~**L'accord suit le nombre « en place », singulier à 1 seulement** — 0 est
 * pluriel, la règle de `phraseFaitsDates` (« 2 sur 3 portent », « 1 sur 3
 * porte »).~~ [2026-10-17, décision de c6 au contrôle visuel : **zéro prend le
 * singulier** — « 0 sur 32 · déclaré en place par vous ». Singulier à 0 et à 1,
 * pluriel au-delà, pour « déclaré(s) en place par vous » comme pour
 * « établi(s) d'après les titres déclarés ». `phraseFaitsDates` n'est pas
 * touchée.] « tous » ne se dit pas d'une seule ligne.
 */
export function phraseCompteur(
  enPlace: number,
  total: number,
  /**
   * La part d'`enPlace` établie d'après les titres déclarés (2026-10-16) :
   * l'employeur ne l'a pas déclarée, « par vous » serait faux pour elle.
   */
  parLesTitres = 0,
): string {
  if (total === 0) return "aucun état à déclarer sur ce dossier";
  if (parLesTitres > 0) {
    const declares = enPlace - parLesTitres;
    const parVous =
      declares <= 0
        ? null
        : declares === 1
          ? "1 déclaré en place par vous"
          : `${declares} déclarés en place par vous`;
    const parTitres =
      parLesTitres === 1
        ? "1 établi d'après les titres déclarés"
        : `${parLesTitres} établis d'après les titres déclarés`;
    // ~~« tous en place : … » / « en place : … »~~ (2026-10-17) : le
    // préfixe redisait « en place » devant « déclarés en place par vous »,
    // et le chiffre au-dessus dit déjà si tout l'est.
    return parVous ? `${parVous}, ${parTitres}` : parTitres;
  }
  // Singulier à 0 et à 1 (2026-10-17, décision de c6), avant « tous » : à
  // 1 sur 1, une seule ligne ne se dit pas « tous ».
  if (enPlace <= 1) return "déclaré en place par vous";
  if (enPlace === total) return "tous déclarés en place par vous";
  return "déclarés en place par vous";
}

/*
 * ~~`phraseSommaire`~~ (retirée le 2026-10-17, revue de c6) : le compte d'une
 * famille au sommaire disait qui affirme dans une rédaction courte, seconde
 * de `phraseCompteur`, et rendait « 0 sur 10 déclaré par vous » — singulier
 * fautif à 0. Le sommaire ne porte plus que « X sur Y » ; la phrase n'est
 * plus qu'à l'en-tête de page (ADR-027, amendement du 2026-10-17, § 10).
 */

/**
 * Ce qu'une ligne déclarée affiche, verbe et date d'un seul tenant.
 *
 * **Trouvée par la garde du 2026-08-31, pas par une relecture.** `LigneEtat`
 * rendait `{verbe} {formaterDateFr(date)}` où `verbe` sortait d'un ternaire —
 * exactement le montage qui avait produit « Elles n'entrepas » quelques lignes
 * plus bas. Le défaut ne s'était pas encore vu ; il attendait son tour.
 */
export function phraseDeclaration(
  mode: "etat" | "fait",
  dateFormatee: string,
): string {
  if (mode === "etat") return `Déclaré en place le ${dateFormatee}`;
  return `Fait le ${dateFormatee}`;
}

/** Le libellé du bouton, quand la ligne n'est pas encore déclarée. */
export function libelleGeste(mode: "etat" | "fait"): string {
  if (mode === "etat") return "Déclarer en place";
  return "Marquer comme fait";
}

/** Le libellé du bouton, quand elle l'est. Défaire n'a qu'un mot. */
export function libelleRetour(): string {
  return "Revenir dessus";
}

/*
 * ~~`etatDeLaLigne`~~ (retirée le 2026-10-17, contrôle visuel de c6) : l'état
 * d'une ligne en quelques mots, pour le widget du tableau de bord, qui listait
 * les lignes de l'écran. Il les résume désormais par famille (`widget.ts`) ;
 * elle n'avait pas d'autre appelant.
 */

/** La première réponse de la fiche (2026-10-20) : affirmer que c'est en place, ou fait. */
export function libelleReponseOui(mode: "etat" | "fait"): string {
  if (mode === "etat") return "Oui, c'est en place";
  return "Oui, c'est fait";
}

/** La troisième réponse : au premier appui elle explique, au second elle passe. */
export function libelleReponseNeSaisPas(dejaExplique: boolean): string {
  if (dejaExplique) return "Je verrai plus tard";
  return "Je ne sais pas";
}

/** La phrase sous les réponses : qui affirme, ou comment revenir dessus. */
export function phraseSousLesReponses(dejaDeclaree: boolean): string {
  if (dejaDeclaree) return "Vous avez déjà répondu : « Pas encore » retire la déclaration.";
  return "Votre réponse est une déclaration, datée, reprise dans votre dossier de conformité. Rojer ne la vérifie pas.";
}

// ~~`phraseParLesRisques`~~ — retirée le 2026-10-22 : les lignes liées aux
// risques ne sont plus comptées sur « Ce qui doit être en place », la phrase
// qui justifiait l'écart n'a plus lieu d'être.

/**
 * Le corps de l'état vide de « Ce qui doit être en place ». Quand les seules
 * lignes du dossier se déclarent sous une question d'activité, dire « aucune »
 * serait faux : la phrase renvoie à la page des risques (revue du 2026-10-21).
 */
export function phraseRienEnPlace(seulementParLesRisques: boolean): string {
  return seulementParLesRisques
    ? "Les seules lignes de votre dossier sont liées aux risques de vos salariés : elles se déclarent sur « Évaluer les risques de vos salariés »."
    : "Aucune des obligations que votre dossier déclenche n'est un état à constituer ou un fait à dater sans rythme écrit. Les autres sont au calendrier quand elles ont une date, sur « Quand ça arrive » quand elles naissent d'un événement, et sur la fiche de chaque personne quand elles la visent.";
}
