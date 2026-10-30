// Régénération du calendrier après une mutation DÉJÀ COMMITÉE.
//
// LE DÉFAUT QU'ELLE FERME. Neuf appels directs, dans cinq modules d'actions
// serveur — celui des équipements passe par un helper que cinq actions
// partagent —, enregistrent une mutation,
// puis appellent `genererCalendrier` pour recaler les échéances. L'appel était
// nu : une régénération qui échoue faisait échouer l'action serveur ENTIÈRE,
// alors que le dépôt de rapport, la levée de prescription ou la suppression
// venaient d'être commités. L'utilisateur voit une erreur, redépose son
// rapport, et se retrouve avec deux rapports pour un seul contrôle.
//
// La mutation est acquise ; le recalage ne l'est pas. Les deux ne doivent donc
// pas partager le même sort, et c'est tout ce que ce module dit.
//
// CE MODULE N'EST PAS UN `"use server"`, comme `reconciliation.ts` et pour la
// même raison : une fonction exportée d'un fichier d'actions devient un point
// d'entrée appelable depuis le navigateur. [2026-10-14 : `actions.ts` non plus,
// depuis l'audit Next.js (B1) — il n'en avait gardé que la directive.] Il est ici, entre les deux, pour
// n'introduire aucun cycle — `regeneration-sure` → `actions` → `reconciliation`,
// et `regeneration-sure` → `reconciliation`.

import { getOptionalCompte } from "@/lib/auth/compte";
import { genererCalendrier, regenererSansInvalider } from "./actions";
import { calendrierDesynchronise } from "./queries";
import { marquerCalendrierPerime } from "./reconciliation";
import { ecritureAutomatiqueAutorisee } from "@/lib/environnement";

/**
 * Message rendu à l'utilisateur quand le recalage a échoué. Il dit les deux
 * choses qui comptent : ce qui est acquis, et que personne n'aura à réparer
 * quoi que ce soit à la main.
 */
export const MESSAGE_REGEN_ECHEC =
  "Modification enregistrée. Le calendrier des vérifications n'a pas pu être " +
  "recalculé à l'instant : il le sera automatiquement à la prochaine " +
  "ouverture du tableau de bord ou du calendrier.";

/**
 * Répare À L'AFFICHAGE un calendrier qui n'est pas à jour. Rend `true` si une
 * régénération a eu lieu.
 *
 * UN SEUL REPÈRE SUFFIT. `referentielVersionCalendrier` distingue à lui seul
 * les trois cas : jamais généré (vide à la création), régénération échouée
 * (`marquerCalendrierPerime` l'efface), référentiel changé depuis (le sceau
 * diffère). La page calendrier comptait en plus les lignes pour détecter un
 * calendrier vide — un comptage complet que le repère rend inutile.
 *
 * OÙ L'APPELER : en tête des pages d'ENTRÉE — le tableau de bord, où mènent la
 * connexion et « Reprendre mon dossier », et le calendrier —, AVANT leurs
 * lectures. Jamais dans le layout : Next rend le layout et la page EN
 * PARALLÈLE, la page lirait les anciennes lignes pendant la régénération, et
 * le layout n'est pas relancé d'une page à l'autre. Pas non plus dans chaque
 * page ni dans les fonctions de lecture : une page lance ses lectures en
 * parallèle, et chacune déclencherait sa régénération (revue du 2026-09-14).
 * [2026-10-13 : le layout a été réexaminé pour les pages ouvertes par lien
 * direct, et écarté pour la même raison, relue dans la documentation de
 * Next 16.3.5 — « layouts and pages are rendered in parallel », et un layout
 * n'empêche pas la page de s'exécuter. Ces pages DISENT l'âge
 * (`fraicheur.ts`) ; `fraicheur-sorties.test.ts` tient la réparation hors des
 * layouts, une fois par rendu, avant les lectures.]
 *
 * SANS INVALIDATION : Next refuse `revalidatePath` pendant un rendu. Les
 * pastilles de la barre latérale, rendues par le layout, peuvent garder
 * l'ancien compte jusqu'au rechargement suivant.
 *
 * Un échec de RÉGÉNÉRATION est journalisé et laissé tel quel : le repère
 * n'ayant pas été posé, l'affichage suivant retentera, et la page s'affiche
 * sur les lignes en base plutôt que de tomber en erreur. La LECTURE du repère,
 * elle, peut lever — c'est voulu : elle porte la garde de session
 * (`requireUser`), dont la redirection doit remonter.
 *
 * JAMAIS DEPUIS UNE PREVIEW. Un déploiement de prévisualisation porte le
 * référentiel de sa branche ; s'il écrit dans la base de production, le
 * simple fait d'y ouvrir le tableau de bord recalculerait les dossiers réels
 * avec un référentiel non fusionné, que la production recalculerait à son
 * tour à la visite suivante. Une preview lit, elle ne répare pas — elle écrit
 * toujours sur les gestes explicites (revue du 2026-09-14).
 *
 * LE PARTAGE A ÉTÉ CONFIRMÉ, PUIS COUPÉ (2026-09-18, 2026-09-19).
 * Le 2026-09-18, `DATABASE_URL` portait la portée « Production, Preview, and
 * Development » au projet Vercel : une preview lisait bien les vrais dossiers.
 * La propriétaire a décidé de ne plus en déployer — on éprouve en local, puis
 * on regarde la production (`docs/chantiers-ouverts.md` § 13). Depuis le
 * 2026-09-19, `DATABASE_URL` et `DIRECT_URL` ne sont plus portées que par
 * l'environnement Production (même document, « FAIT le 2026-09-19 ») : une
 * preview n'atteint plus la base. La garde reste : elle coûte une ligne et
 * couvre le jour où une preview repartirait avec une base, par réglage ou par
 * accident.
 *
 * [2026-10-14, audit Next.js H5] La garde lisait `VERCEL_ENV === "preview"`,
 * qui n'existe pas chez Clever Cloud : une préversion y aurait écrit. Elle lit
 * désormais `ecritureAutomatiqueAutorisee` (`@/lib/environnement`) : `APP_ENV`
 * d'abord, `VERCEL_ENV` à défaut, et, dans le doute, PAS d'écriture.
 */
export async function assurerCalendrierAJour(
  etablissementId: string,
): Promise<boolean> {
  if (!ecritureAutomatiqueAutorisee()) return false;
  if (!(await calendrierDesynchronise(etablissementId))) return false;
  try {
    await regenererSansInvalider(etablissementId);
    return true;
  } catch (err) {
    console.error(
      `[affichage] regen calendrier a échoué pour ${etablissementId}`,
      err,
    );
    return false;
  }
}

/**
 * Régénère, et **n'échoue jamais**.
 *
 * Rend `true` si le calendrier est à jour, `false` s'il ne l'est pas — auquel
 * cas il a été marqué périmé, donc la prochaine ouverture le reprendra d'elle-
 * même. L'appelant décide s'il en dit quelque chose : une action qui rend un
 * état à l'écran passe `MESSAGE_REGEN_ECHEC`, une action qui redirige n'a rien
 * à en faire, et dans les deux cas la mutation reste acquise.
 */
export async function regenererApresMutation(
  etablissementId: string,
  contexte: string,
): Promise<boolean> {
  try {
    await genererCalendrier(etablissementId);
    return true;
  } catch (err) {
    console.error(
      `[${contexte}] regen calendrier a échoué pour ${etablissementId}`,
      err,
    );
    // Sans cette marque, l'échec passerait inaperçu : le calendrier n'est ni
    // vide ni périmé en version, donc l'auto-réparation à l'affichage ne le
    // reprendrait pas. Il resterait juste faux.
    // Par le client borné au compte (ADR-051) : si l'échec venait de la garde
    // d'appartenance, l'établissement d'un autre compte n'est pas touché.
    // La lecture de session peut lever elle aussi : cette fonction n'échoue
    // jamais, la marque se perd alors, et l'ouverture suivante régénère.
    // Une panne de session ne fait pas échouer la fonction, mais elle se voit.
    const compte = await getOptionalCompte().catch((e: unknown) => {
      console.error(
        JSON.stringify({
          type: "session_illisible_marque_perdue",
          contexte,
          etablissementId,
          erreur: e instanceof Error ? e.message : String(e),
        }),
      );
      return null;
    });
    if (compte) await marquerCalendrierPerime(compte.db, etablissementId);
    return false;
  }
}
