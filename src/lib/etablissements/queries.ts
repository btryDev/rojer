import "server-only";
import { requireCompte, type Db } from "@/lib/auth/compte";
import { duerpDuRenduDuCompte } from "@/lib/duerps/queries";
import { cache } from "react";

// ADR-005 : scope par userId via la relation entreprise.

/**
 * L'établissement du user et son entreprise, lus UNE FOIS par rendu. `null`
 * s'il n'existe pas ou n'appartient pas à l'utilisateur.
 *
 * LA LECTURE QUE PARTAGENT `requireEtablissement` (`auth/scope.ts`, la garde
 * d'appartenance de chaque page et de la barre latérale) et `getEtablissement`
 * (plan performance, 2026-10-29). Elle vit ici et non dans `scope.ts` pour que
 * la garde de tenancy des `queries.ts` (`tenancy-lectures.test.ts`) continue
 * de voir `getEtablissement` lire par `id`, avec son prédicat.
 *
 * CE QU'ELLE NE DIT PAS À JOUR. Le layout la lit en parallèle de la page, donc
 * possiblement AVANT la réparation du calendrier que font le tableau de bord
 * et le calendrier (`regeneration-sure.ts`). La réparation écrit le sceau
 * `referentielVersionCalendrier` — et, par lui, `updatedAt`. Ces deux colonnes
 * sont donc OMISES de la lecture : l'âge du calendrier se lit par
 * `fraicheurCalendrier`, la date de mise à jour du registre par sa propre
 * lecture (`registre/queries.ts`). Aucune autre colonne n'est écrite pendant
 * un rendu.
 *
 * LE PROPRIÉTAIRE EST UN PARAMÈTRE, sur le modèle de
 * `chargerEtablissementEtParc` : la garde tient déjà l'utilisateur, et hors
 * rendu un second `requireUser()` coûterait un aller-retour
 * d'authentification de plus. Le prédicat d'appartenance reste dans la requête.
 * Le client borné au compte (ADR-051) est reçu de même, de la garde.
 *
 * Clés : le client borné — un par compte, gardé par `clientBorne`, donc stable
 * d'un appel à l'autre — et deux primitives ; portée de la requête HTTP. Hors
 * rendu (action serveur), la lecture se fait à chaque appel. Le résultat est
 * partagé : un appelant ne le modifie pas.
 */
export const etablissementDuRendu = cache(
  async function etablissementDuRendu(db: Db, id: string, userId: string) {
    return db.etablissement.findFirst({
      where: { id, entreprise: { userId } },
      include: { entreprise: true },
      // Les deux colonnes que la réparation peut réécrire après cette lecture
      // (voir ci-dessus) : absentes du type, un lecteur ne peut pas les y
      // prendre par erreur.
      omit: { referentielVersionCalendrier: true, updatedAt: true },
    });
  },
);


/**
 * L'établissement du user, son entreprise et son DUERP (`null` s'il n'en a
 * pas encore), avec le numéro et la date de sa dernière version.
 *
 * Deux lectures partagées, lancées ensemble : l'établissement que la garde
 * d'appartenance a déjà lu (`etablissementDuRendu`), et le DUERP du
 * rendu (`duerpDuRenduDuCompte`), que lisent aussi l'échéance annuelle, le tableau de
 * bord et la couverture. Chacune porte la portée au compte dans sa requête.
 * Elle relisait l'un et l'autre dans un `include`.
 *
 * Mémoïsé par `cache()` sur le rendu (audit Next.js du 2026-10-14, H2) : les
 * pages et les fonctions qu'elles appellent le relisent dans le même rendu.
 * La clé est l'identifiant, une primitive ; la portée est la requête HTTP,
 * jamais plus. Hors rendu RSC, la lecture se fait à chaque appel.
 */
export const getEtablissement = cache(async function getEtablissement(
  id: string,
) {
  const { user, db } = await requireCompte();
  const [etab, duerp] = await Promise.all([
    etablissementDuRendu(db, id, user.id),
    duerpDuRenduDuCompte(db, id, user.id),
  ]);
  if (!etab) return null;
  return { ...etab, duerp };
});

/**
 * Les établissements du compte, toutes entreprises confondues — ce que liste le
 * sélecteur de la gélule. Un compte suit plusieurs entreprises depuis le
 * 2026-10-26 (une par SIREN) : lister ceux d'une seule entreprise cacherait les
 * établissements d'une autre société.
 *
 * Mémoïsé sur le rendu : sans argument, une entrée par requête HTTP.
 */
export const listerEtablissementsDuCompte = cache(
  async function listerEtablissementsDuCompte() {
    const { user, db } = await requireCompte();
    return db.etablissement.findMany({
      where: { entreprise: { userId: user.id } },
      orderBy: { createdAt: "asc" },
      select: { id: true, raisonDisplay: true },
    });
  },
);
