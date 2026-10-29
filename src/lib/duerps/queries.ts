import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { cache } from "react";

// ADR-005 : scope par userId via la chaîne duerp → etablissement → entreprise.

// Transition V2 : les relations Prisma s'appellent désormais `etablissement`
// (au lieu de `entreprise` directe) et `actions` (au lieu de `mesures`). On
// expose à plat des alias `entreprise` et `mesures` pour ne pas contraindre
// tout le wizard DUERP existant à être refondu dès l'étape 1. La terminologie
// unifiée arrivera à l'étape 8 du plan.

type ActionRow = {
  id: string;
  libelle: string;
  type: string;
  statut: string;
  echeance: Date | null;
  responsable: string | null;
  referentielMesureId: string | null;
};

function actionVersMesure(a: ActionRow) {
  const statutUI: "existante" | "prevue" =
    a.statut === "levee" ? "existante" : "prevue";
  return {
    id: a.id,
    libelle: a.libelle,
    type: a.type,
    statut: statutUI,
    echeance: a.echeance,
    responsable: a.responsable,
    referentielMesureId: a.referentielMesureId,
  };
}

/**
 * Le DUERP d'un établissement et la date de sa dernière version, lus UNE FOIS
 * par rendu. `null` si l'établissement n'en a pas, ou n'est pas à l'utilisateur.
 *
 * POURQUOI (plan performance, 2026-10-29). Quatre fonctions le lisaient dans
 * le même rendu, chacune sous sa forme : l'échéance de mise à jour annuelle
 * (`calendrier/echeances.ts`, lue par la barre latérale sur chaque écran),
 * l'état du DUERP au tableau de bord (`dashboard/queries.ts`), la couverture
 * (`perimetre/faits.ts`) et `getEtablissement`. Ce chargeur sert ce que la
 * plupart lisaient : les colonnes du DUERP, le numéro et la date de sa
 * dernière version. Les unités n'y sont pas — la couverture seule les lit, et
 * la barre latérale les paierait sur chaque écran : `faitsDeCouverture` les
 * lit à part.
 *
 * LE TRI EST CELUI QU'ELLES PARTAGEAIENT : le plus récemment modifié d'abord,
 * versions par `numero` décroissant (unique par DUERP, quand `createdAt` peut
 * être partagé par deux lignes d'une même transaction). `Duerp.etablissementId`
 * est unique : il n'y en a qu'un, mais une requête ne doit pas dépendre d'un
 * invariant écrit ailleurs.
 *
 * PARTAGÉ ENTRE LE LAYOUT ET LA PAGE, ET C'EST SANS RISQUE : la réparation du
 * calendrier que font le tableau de bord et le calendrier
 * (`regeneration-sure.ts`) n'écrit que des lignes de suivi et le sceau de
 * l'établissement, jamais le DUERP. Clé primitive, portée de la requête HTTP ;
 * hors rendu (action serveur, route), la lecture se fait à chaque appel. Le
 * résultat est partagé : un appelant ne le modifie pas.
 */
export const duerpDuRendu = cache(async function duerpDuRendu(
  etablissementId: string,
) {
  const user = await requireUser();
  return prisma.duerp.findFirst({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      // Le numéro et la date, seuls lus. Pas le `snapshot` : le document figé
      // entier, que la barre latérale paierait sur chaque écran pour une date.
      versions: {
        orderBy: { numero: "desc" },
        take: 1,
        select: { numero: true, createdAt: true },
      },
    },
  });
});

/**
 * Le DUERP du user, avec son établissement, ses unités, risques, mesures et
 * versions.
 *
 * Mémoïsé par `cache()` sur le rendu (audit Next.js du 2026-10-14, H2) : le
 * layout du DUERP et chacune de ses pages le lisaient dans le même rendu —
 * sept requêtes chaque fois. Clé primitive, portée de la requête HTTP ; hors
 * rendu RSC, la lecture se fait à chaque appel. Le résultat est partagé : un
 * appelant ne le modifie pas.
 */
export const getDuerp = cache(async function getDuerp(id: string) {
  const user = await requireUser();
  const duerp = await prisma.duerp.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    include: {
      etablissement: { include: { entreprise: true } },
      unites: {
        orderBy: { nom: "asc" },
        include: {
          risques: {
            include: { actions: true },
          },
        },
      },
      versions: {
        orderBy: { numero: "desc" },
      },
    },
  });
  if (!duerp) return null;
  return {
    ...duerp,
    entreprise: duerp.etablissement.entreprise,
    unites: duerp.unites.map((u) => ({
      ...u,
      risques: u.risques.map((r) => ({
        ...r,
        mesures: r.actions.map(actionVersMesure),
      })),
    })),
  };
});

export async function getUnite(id: string) {
  const user = await requireUser();
  const unite = await prisma.uniteTravail.findFirst({
    where: {
      id,
      duerp: { etablissement: { entreprise: { userId: user.id } } },
    },
    include: {
      duerp: {
        include: { etablissement: { include: { entreprise: true } } },
      },
      risques: {
        orderBy: { libelle: "asc" },
        include: { actions: true },
      },
    },
  });
  if (!unite) return null;
  return {
    ...unite,
    duerp: {
      ...unite.duerp,
      entreprise: unite.duerp.etablissement.entreprise,
    },
    risques: unite.risques.map((r) => ({
      ...r,
      mesures: r.actions.map(actionVersMesure),
    })),
  };
}
