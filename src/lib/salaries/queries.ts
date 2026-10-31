import "server-only";
import { requireCompte } from "@/lib/auth/compte";
import { mentionRythmeRetenu } from "@/lib/referentiels/conformite/mention-rythme";
import { renvoiAuxNormes } from "@/lib/referentiels/conformite/renvoi-aux-normes";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import { titreParId } from "./catalogue";
import { echeanceDuTitre } from "./echeance";
import { ceQuiManqueALaPersonne, etatDuManque } from "./du-a-la-personne";

/*
 * La borne au compte des lectures de ce module (ADR-005, ADR-051).
 *
 * Elle est portée **même quand l'appelant vient de le vérifier** : sans RLS —
 * Prisma opère en rôle `postgres` — l'isolation est applicative, et une
 * lecture qui ne la porte pas devient une fuite le jour où un appelant nouveau
 * ne vérifie pas. `navigation/sidebar-counts.ts:33` appelle `compterTitresEnRetard`
 * avec un `etablissementId` nu.
 *
 * ~~Le prédicat `etablissement: { entreprise: { userId } }`, rendu par
 * `portee()` et posé dans chaque `where`~~ [2026-10-30, lot 2b de
 * l'isolation : retiré. Chaque lecture passe par le client borné de
 * `requireCompte()`, qui ajoute la borne au compte à chaque opération ; le
 * prédicat écrit la posait une seconde fois — double jointure. Le module
 * n'importe pas le client brut : `portee/imports.test.ts` le tient.]
 *
 * Ce module porte des données de personnes ; c'est la surface où la
 * convention coûte le plus cher à rompre. Éprouvé dans `isolation.test.ts`,
 * qui lit le dossier voisin et exige une réponse vide.
 */

// `classerTitre`, `etatDuTitre` et `EtatTitre` vivent dans `./etat-titre`,
// purs (revue du 2026-10-16) : la règle d'un titre dépassé avait trois
// copies — ici, le badge, et l'état établi d'après les titres. Ré-exportés
// pour les lecteurs de ce module.
export { classerTitre, etatDuTitre, type EtatTitre } from "./etat-titre";
import { classerTitre, etatDuTitre } from "./etat-titre";

const SELECTION_TITRE = {
  id: true,
  obligationId: true,
  delivreLe: true,
  echeanceLe: true,
  note: true,
} as const;

/**
 * Le nombre de personnes présentes dans l'équipe (fiches actives), pour la
 * fiche de l'établissement du tableau de bord. Un compte, jamais un nom :
 * le hero n'a pas à porter de donnée de personne.
 */
export async function compterEquipe(etablissementId: string): Promise<number> {
  const { db } = await requireCompte();
  return db.salarie.count({
    where: { etablissementId, actif: true },
  });
}

export async function listerEquipe(etablissementId: string, now: Date) {
  const { db } = await requireCompte();
  const salaries = await db.salarie.findMany({
    where: { etablissementId },
    // Les personnes sorties de l'effectif en dernier, mais toujours là : leur
    // titre prouve qu'elles étaient habilitées AU MOMENT où elles ont opéré,
    // et cette preuve couvre l'employeur sur une période passée
    // (`docs/rgpd.md` § 4.3). Les masquer ferait disparaître la preuve de
    // l'écran sans la supprimer de la base — le pire des deux.
    orderBy: [{ actif: "desc" }, { nom: "asc" }, { prenom: "asc" }],
    select: {
      id: true,
      nom: true,
      prenom: true,
      poste: true,
      entreLe: true,
      actif: true,
      titres: { select: SELECTION_TITRE, orderBy: { delivreLe: "desc" } },
    },
  });

  return salaries.map((s) => ({
    ...s,
    titres: s.titres.map((t) => {
      const o = titreParId(t.obligationId);
      return {
        ...t,
        libelle: o?.libelle ?? t.obligationId,
        etat: etatDuTitre(t, o, s.actif, now),
      };
    }),
    // Ce qui lui manque (ADR-043) — la même fonction que sa fiche. `etat`
    // vaut `null` quand rien n'est daté (date d'entrée absente) : la carte ne
    // le peint pas en retard.
    manques: ceQuiManqueALaPersonne(s, s.titres).map((m) => ({
      obligationId: m.obligation.id,
      libelle: m.obligation.libelle,
      etat: etatDuManque(m, now),
    })),
  }));
}

export async function getSalarie(
  etablissementId: string,
  salarieId: string,
  now: Date,
) {
  const { db } = await requireCompte();
  const s = await db.salarie.findFirst({
    // `etablissementId` dans le `where`, jamais seulement l'id : c'est la
    // portée de tenancy (ADR-005). Un identifiant deviné ne doit pas ouvrir
    // la fiche d'une personne d'un autre dossier. Et l'établissement lui-même
    // doit appartenir au lecteur, sans quoi la portée n'est qu'un cloisonnement
    // entre dossiers d'un même compte — cf. `portee` ci-dessus.
    where: { id: salarieId, etablissementId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      poste: true,
      entreLe: true,
      actif: true,
      createdAt: true,
      titres: { select: SELECTION_TITRE, orderBy: { delivreLe: "desc" } },
    },
  });
  if (!s) return null;

  return {
    ...s,
    titres: s.titres.map((t) => {
      const o = titreParId(t.obligationId);
      return {
        ...t,
        libelle: o?.libelle ?? t.obligationId,
        /** Une pièce médicale ne s'affiche jamais avec un dépôt de fichier. */
        pieceMedicale: o?.pieceMedicale ?? false,
        referencesLegales: o?.referencesLegales ?? [],
        /**
         * L'échéance que le calendrier inscrit : saisie, ou calculée depuis la
         * délivrance. `null` = aucune. La fiche l'affiche plutôt que de la
         * recalculer — et `echeanceLe` reste lisible à côté pour ce qu'il est,
         * la date de fin portée par la pièce.
         */
        echeance: echeanceDuTitre(t, o ? periodiciteEffective(o) : undefined),
        /** Le rythme qui a produit une échéance calculée — la fiche le nomme. */
        periodicite: o ? periodiciteEffective(o) : null,
        /** D'où vient ce rythme quand le texte n'en écrit pas (ADR-039). */
        rythmeRetenu: o ? mentionRythmeRetenu(o) : null,
        /** Le Code renvoie le rythme aux normes sans l'écrire (R. 4544-10). */
        renvoiAuxNormes: o ? renvoiAuxNormes(o) : null,
        etat: etatDuTitre(t, o, s.actif, now),
      };
    }),
  };
}

/**
 * Le compteur du rail : les titres qui appellent un geste.
 *
 * `aPlanifier` n'y entre pas — un titre sans échéance n'est pas en attente
 * de quelque chose, il n'a simplement pas de rendez-vous. Le compter
 * afficherait une pastille rouge permanente que rien ne peut éteindre.
 *
 * LE FILTRE `echeanceLe: { not: null }` EST PARTI, et c'était lui le défaut.
 * Il écartait en SQL tous les titres sans date de fin saisie — y compris ceux
 * dont le texte écrit la durée, et que le calendrier met bel et bien en retard :
 * le badge du rail valait zéro sur une VIP échue depuis un an. L'échéance ne se
 * décide pas en base, elle a besoin de la périodicité, qui vit au référentiel
 * TypeScript (ADR-003). D'où la lecture de `delivreLe` et `obligationId`, et le
 * filtre en mémoire — quelques titres par établissement.
 */
export async function compterTitresEnRetard(
  etablissementId: string,
  now: Date,
): Promise<number> {
  const { db } = await requireCompte();
  const salaries = await db.salarie.findMany({
    where: { etablissementId, actif: true },
    select: {
      actif: true,
      entreLe: true,
      titres: { select: { obligationId: true, delivreLe: true, echeanceLe: true } },
    },
  });
  // Un titre jamais déclaré et dû — en retard — appelle un geste autant qu'un
  // titre échu (ADR-043). Même fonction que la fiche et Équipe ; un manque
  // sans date n'est jamais compté.
  const manquesEnRetard = salaries
    .flatMap((s) => ceQuiManqueALaPersonne(s, s.titres))
    .filter((m) => etatDuManque(m, now) === "enRetard").length;
  const titres = salaries.flatMap((s) => s.titres);
  return manquesEnRetard + titres.filter((t) => {
    // Un titre dont l'obligation a quitté le référentiel ne réclame plus rien,
    // comme au calendrier et sur Équipe (`etatDuTitre`) : sa date de fin
    // saisie le comptait encore au badge (2026-09-15).
    const obligation = titreParId(t.obligationId);
    if (obligation === undefined) return false;
    return classerTitre(t, periodiciteEffective(obligation), now) === "enRetard";
  }).length;
}

export type SalarieDeLaListe = Awaited<ReturnType<typeof listerEquipe>>[number];
export type SalarieDetail = NonNullable<Awaited<ReturnType<typeof getSalarie>>>;

/**
 * Les titres effectivement déclarés dans cet établissement.
 *
 * Distinct du **catalogue**, qui liste tout ce que le référentiel sait
 * encoder. La différence n'est pas cosmétique : c'est elle qui décide si le
 * texte d'information remis aux salariés (art. 13) décrit le traitement qui a
 * lieu, ou un traitement imaginaire.
 *
 * Le texte listait le catalogue. Un employeur qui saisissait trois personnes
 * sans déclarer aucun titre remettait donc à ses salariés un document
 * affirmant qu'on suivait leur attestation médicale — sur la pièce la plus
 * sensible qui soit, et alors que rien n'était suivi.
 */
export async function libellesTitresDeclares(
  etablissementId: string,
): Promise<string[]> {
  // Sans `actif: true`, délibérément — le seul `where` du module dans ce cas.
  // Le traitement se poursuit, en fait, après le départ d'une personne — sa
  // durée n'est fixée par aucun texte identifié, et c'est une décision ouverte
  // (E8, 2026-09-27) ; ~~(art. 17.3.b)~~ ne la fonde pas. Le texte
  // d'information doit décrire le traitement réel, pas seulement sa part en
  // cours.
  const { db } = await requireCompte();
  const lignes = await db.titreSalarie.groupBy({
    by: ["obligationId"],
    where: { salarie: { etablissementId } },
  });
  // `?? l.obligationId` et non un filtre : un titre dont l'identifiant ne
  // résout plus au référentiel disparaîtrait sinon en silence du texte
  // d'information — qui sous-décrirait le traitement, exactement la faute que
  // cette fonction corrige, en miroir. `getSalarie` gère déjà le cas ainsi.
  return lignes
    .map((l) => titreParId(l.obligationId)?.libelle ?? l.obligationId)
    .sort((a, b) => a.localeCompare(b, "fr"));
}
