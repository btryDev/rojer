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

/**
 * Ce qu'il reste à passer en revue, ou rien.
 *
 * `parLesTitres` : la part des restantes établie d'après les titres déclarés
 * (2026-10-16). Elle n'est pas « une question à laquelle vous n'avez pas
 * répondu » — aucun titre n'est déclaré, ou leurs échéances sont dépassées —,
 * et se dit à part.
 */
export function phraseRestantes(restantes: number, parLesTitres = 0): string | null {
  const titres =
    parLesTitres <= 0
      ? null
      : parLesTitres === 1
        ? "Une ligne établie d'après les titres déclarés n'est pas en place : aucun titre n'y est déclaré, ou leurs échéances sont dépassées — la ligne dit lequel."
        : `${parLesTitres} lignes établies d'après les titres déclarés ne sont pas en place : aucun titre n'y est déclaré, ou leurs échéances sont dépassées — chaque ligne dit lequel.`;
  const declarees = phraseRestantesDeclarees(restantes - Math.max(parLesTitres, 0));
  if (declarees && titres) return `${declarees} ${titres}`;
  return declarees ?? titres;
}

function phraseRestantesDeclarees(restantes: number): string | null {
  if (restantes <= 0) return null;
  const tete =
    restantes === 1
      ? "Une ligne reste à passer en revue."
      : `${restantes} lignes restent à passer en revue.`;
  // « Non déclarée », et non « non cochée » : le contrôle de cette page est un
  // bouton « Déclarer en place », pas une case. Le vocabulaire de la case était
  // celui d'une version antérieure ; `LigneEtat` explique pourquoi le bouton
  // l'a remplacée — une case suggère un formulaire qu'on valide, le geste ici
  // est immédiat et réversible. Le mot resté en place décrivait un contrôle qui
  // n'existe plus à l'écran.
  return `${tete} Une ligne non déclarée n'est pas un manquement constaté : c'est une question à laquelle vous n'avez pas encore répondu.`;
}

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
        : declares <= 1
          ? "1 déclaré en place par vous"
          : `${declares} déclarés en place par vous`;
    const parTitres =
      parLesTitres <= 1
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
