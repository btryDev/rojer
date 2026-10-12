// Où en est une fiche du registre — et où en est le registre entier.
//
// Le dirigeant présente ce document à une commission. La question qu'il se
// pose devant l'écran n'est pas « comment remplir ce champ » mais « qu'est-ce
// qui manquerait si l'inspecteur arrivait demain ». Un écran qui rend les
// fiches sans dire lesquelles sont vides répond à la première question et
// tait la seconde.
//
// Ce module ne compte que **ce qui est rempli dans l'outil**. Il ne dit pas
// que le registre est conforme, et aucun libellé produit ici ne doit le
// laisser entendre (règle 8 du CLAUDE.md) : « renseignée » est un fait de
// saisie, pas une qualification juridique.
//
// Module **pur** : ni Prisma, ni React — d'où les tests unitaires à côté.
//
// Il a d'abord vécu sous `components/`, au motif que c'était une lecture de
// présentation. Ce motif est tombé le jour où le PDF a eu besoin du même
// calcul : un module que l'écran ET le document consomment n'appartient à
// aucun des deux. Le métier voisin — quelles fiches sont dues — est dans
// `composition.ts`.

import { saisiePourSection, type FormeSaisie } from "./champs";
import type { ContenuLu, RegistreDeLEtablissement } from "./queries";
import { alimentationDeLaPartie, type Alimentation } from "./alimentation";

// Ce que la page a lu en base pour une fiche : champs XOR lignes, jamais les
// deux. La définition vit côté lib, avec la requête qui la produit — deux
// définitions du même contenu divergeraient au premier champ ajouté.
export type { ContenuLu };

export type Completude = {
  /** L'application sait-elle recueillir cette fiche, ici ou ailleurs ? */
  outillee: boolean;
  forme?: FormeSaisie["forme"];
  /**
   * L'écran qui tient cette fiche quand ce n'est pas celui-ci — le parc
   * d'équipements, le calendrier. Une fiche tenue ailleurs est outillée : la
   * compter comme un manque de l'application serait faux (cf.
   * `alimentation.ts`).
   */
  alimentee?: Alimentation;
  /** Questions posées par la fiche (formulaire et établissement). */
  questions: number;
  /** Questions qui ont une réponse non vide. */
  repondues: number;
  /**
   * Questions dues dont la colonne n'existe pas encore en base (`enBase:
   * false`). Elles ne peuvent pas être répondues : les compter comme des
   * oublis du dirigeant serait lui reprocher un trou de l'application.
   */
  sansEmplacement: number;
  /** Lignes consignées (journal). */
  lignes: number;
};

const renseigne = (v: string | null | undefined) =>
  typeof v === "string" && v.trim() !== "";

export function completudeDeLaFiche(
  saisie: FormeSaisie | undefined,
  /**
   * Absent tant que la fiche n'a jamais été touchée : il n'y a alors aucune
   * ligne en base, et c'est une fiche vide, pas une erreur.
   */
  contenu: ContenuLu | null | undefined,
  /** L'écran qui tient la fiche, si ce n'est pas celui-ci. */
  alimentee?: Alimentation,
): Completude {
  if (!saisie) {
    // Sans formulaire ici, la fiche est soit tenue sur un autre écran, soit
    // pas encore outillée du tout. Les confondre fait mentir la jauge.
    return {
      outillee: Boolean(alimentee),
      alimentee,
      questions: 0,
      repondues: 0,
      sansEmplacement: 0,
      lignes: 0,
    };
  }

  if (saisie.forme === "journal") {
    return {
      outillee: true,
      forme: "journal",
      questions: 0,
      repondues: 0,
      sansEmplacement: 0,
      lignes: contenu?.lignes?.length ?? 0,
    };
  }

  const champs = saisie.champs;
  const valeurs = contenu?.champs ?? {};
  const sansEmplacement =
    saisie.forme === "etablissement"
      ? saisie.champs.filter((c) => !c.enBase).length
      : 0;

  return {
    outillee: true,
    forme: saisie.forme,
    questions: champs.length,
    repondues: champs.filter((c) => renseigne(valeurs[c.cle])).length,
    sansEmplacement,
    lignes: 0,
  };
}

/**
 * Le ton d'une fiche : ce qu'elle appelle de la part du lecteur.
 *
 * - `muet` — rien à faire ici, l'outil ne sait pas encore recueillir
 * - `renvoi` — la fiche est tenue sur un autre écran, c'est là qu'il faut aller
 * - `attente` — il manque quelque chose que le dirigeant peut fournir
 * - `faite` — tout ce que la fiche demande a une réponse
 */
export type TonCompletude = "muet" | "renvoi" | "attente" | "faite";

export function tonCompletude(c: Completude): TonCompletude {
  if (!c.outillee) return "muet";
  if (c.alimentee) {
    // Sans compte, on ne peut pas dire si la fiche est remplie : on dit
    // seulement où elle se tient. Affirmer « faite » sans l'avoir vérifié
    // serait exactement le mensonge que la jauge doit éviter.
    if (c.alimentee.nombre === undefined) return "renvoi";
    return c.alimentee.nombre > 0 ? "faite" : "attente";
  }
  if (c.forme === "journal") return c.lignes > 0 ? "faite" : "attente";
  // Une fiche dont toutes les questions répondables ont une réponse est
  // faite, même s'il reste des questions sans emplacement : le dirigeant a
  // fourni tout ce qu'on lui a demandé.
  const repondables = c.questions - c.sansEmplacement;
  if (repondables > 0 && c.repondues >= repondables) return "faite";
  return "attente";
}

/** La phrase courte que porte la pastille d'une fiche. */
export function libelleCompletude(c: Completude): string {
  // « Pas encore outillée » décrivait l'application, pas ce que le lecteur a
  // à faire — et il fallait demander ce que ça voulait dire. Un état se
  // nomme par le geste qu'il appelle : cette fiche-là, il faut la tenir
  // soi-même, sur le support qu'on veut, et la présenter avec le reste.
  if (!c.outillee) return "À tenir hors de l'outil";
  if (c.alimentee) {
    const { nombre, unite, libelle } = c.alimentee;
    if (nombre === undefined || !unite) return `Tenue dans ${libelle}`;
    if (nombre === 0) return `Rien dans ${libelle}`;
    return `${nombre} ${nombre > 1 ? unite.pluriel : unite.singulier}`;
  }
  if (c.forme === "journal") {
    if (c.lignes === 0) return "Aucune ligne consignée";
    return c.lignes === 1 ? "1 ligne consignée" : `${c.lignes} lignes consignées`;
  }
  const repondables = c.questions - c.sansEmplacement;
  if (repondables === 0) return "À tenir hors de l'outil";
  if (c.repondues === 0) return `Aucune réponse sur ${repondables}`;
  if (c.repondues >= repondables) return "Toutes les réponses";
  const s = c.repondues > 1 ? "s" : "";
  return `${c.repondues} réponse${s} sur ${repondables}`;
}

/**
 * La complétude de chaque fiche due, par identifiant de fiche — ce que l'écran
 * du registre, son PDF et l'écran « Préparer un contrôle » comptent.
 *
 * Écrite une fois le 2026-10-12 (audit B3) : l'écran du registre la calculait
 * en ligne, le PDF aussi, et « Préparer un contrôle » ne la calculait pas du
 * tout — il disait le registre « À jour » pendant que l'écran du registre
 * comptait des fiches sans ligne consignée.
 *
 * `base` est le chemin de l'établissement (`/etablissements/<id>`), d'où
 * partent les renvois des fiches tenues ailleurs.
 */
export function completudesDuRegistre(
  registre: Pick<RegistreDeLEtablissement, "parties" | "contenus"> | null,
  base: string,
): Map<string, Completude> {
  return new Map(
    (registre?.parties ?? []).flatMap((partie) =>
      partie.sections.map(
        (due) =>
          [
            due.section.id,
            completudeDeLaFiche(
              saisiePourSection(due.section.id),
              registre?.contenus[due.section.id] ?? {},
              alimentationDeLaPartie(partie.id, base),
            ),
          ] as const,
      ),
    ),
  );
}

/** Le compte du registre entier, tel que la jauge l'annonce. */
export type BilanRegistre = {
  /** Fiches dues pour cet établissement. */
  dues: number;
  /** Fiches dues que l'application sait recueillir, ici ou ailleurs. */
  outillees: number;
  /** Fiches outillées et remplies. */
  faites: number;
  /** Fiches outillées mais qu'il reste à remplir. */
  aRemplir: number;
  /**
   * Fiches tenues sur un autre écran, dont on ne compte pas le contenu
   * d'ici. Ni « faites » ni « à remplir » : on ne sait pas, et une jauge qui
   * tranche sans savoir ment dans un sens ou dans l'autre.
   */
  tenuesAilleurs: number;
  /** Fiches dues que l'application ne sait pas encore recueillir. */
  nonOutillees: number;
};

export function bilanDuRegistre(
  completudes: readonly Completude[],
): BilanRegistre {
  const bilan: BilanRegistre = {
    dues: completudes.length,
    outillees: 0,
    faites: 0,
    aRemplir: 0,
    tenuesAilleurs: 0,
    nonOutillees: 0,
  };
  for (const c of completudes) {
    if (!c.outillee) {
      bilan.nonOutillees += 1;
      continue;
    }
    bilan.outillees += 1;
    switch (tonCompletude(c)) {
      case "faite":
        bilan.faites += 1;
        break;
      case "renvoi":
        bilan.tenuesAilleurs += 1;
        break;
      default:
        bilan.aRemplir += 1;
    }
  }
  return bilan;
}
