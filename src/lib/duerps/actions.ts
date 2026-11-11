"use server";

import { revalidatePath } from "next/cache";
import { ouvrirAuGel } from "@/lib/abonnements/gel-saisie";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { reprendreFaitsDansDuerp } from "@/lib/etablissements/faits-activite-ecriture";
import { requireDuerp, requireEtablissement, requireUnite } from "@/lib/auth/scope";
import { referentielsSectoriels, trouverReferentielParId } from "@/lib/referentiels";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import {
  ETAPES_VALIDABLES,
  avecValidations,
  etapeSuivante,
  type EtapeValidable,
} from "./etapes-validees";
import { creerSousPlafond, placesSousLePlafond } from "@/lib/abonnements/quotas";
import { retirerPourActivites } from "@/lib/activites/ajouts";

/**
 * Cloisonnement : aucune de ces actions ne peut faire confiance à
 * l'identifiant qu'elle reçoit (etablissementId, duerpId, uniteId viennent
 * tous du client). Chacune commence donc par un helper de `lib/auth/scope`
 * qui remonte jusqu'à `Entreprise.compteId` et répond 404 si l'objet n'est pas
 * au user — la RLS PostgreSQL n'étant pas effective, c'est le seul rempart.
 */

/**
 * Crée un DUERP vide rattaché à un établissement (ADR-001). L'utilisateur
 * est redirigé vers l'étape de choix de secteur qui alimente ensuite les
 * unités de travail.
 *
 * Idempotent : si un DUERP existe déjà (double-clic, onglets multiples,
 * création silencieuse historique), on le réutilise au lieu d'en créer
 * un second.
 */
export async function creerDuerp(etablissementId: string): Promise<void> {
  await verifierSaisie();
  const { db, etablissement } = await requireEtablissement(etablissementId);

  let duerp = await db.duerp.findFirst({
    where: { etablissementId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!duerp) {
    // L'unité transverse est créée sans regarder la limite de l'essai : elle
    // n'y compte pas (ADR-053 § 14, comptage hors transverse).
    //
    // Le DUERP naît aussi avec les risques des faits d'activité déjà déclarés
    // (ADR-041) : un dirigeant qui a répondu « oui, des travailleurs
    // conduisent des engins » depuis Équipe retrouve la question répondue ET
    // son risque dans le document, sans la reposer.
    duerp = await db.$transaction(async (tx) => {
      const cree = await tx.duerp.create({
        data: {
          etablissementId,
          unites: {
            create: {
              nom: "Risques transverses",
              description:
                "Risques transverses à l'entreprise (routier, RPS, TMS, écrans). Gérés via les questions détecteurs.",
              estTransverse: true,
            },
          },
        },
        select: { id: true },
      });
      await reprendreFaitsDansDuerp(tx, cree.id, etablissement);
      return cree;
    });
  }

  revalidatePath(`/entreprises/${etablissement.entrepriseId}`);
  redirect(`/duerp/${duerp.id}/secteur`);
}

/**
 * Applique un secteur au DUERP : crée les unités suggérées par le référentiel
 * choisi (si pas déjà présentes par nom). Idempotent — peut être rejoué.
 */
export async function choisirSecteur(
  duerpId: string,
  secteurId: string,
): Promise<void> {
  await verifierSaisie();
  const { compte, db, duerp } = await requireDuerp(duerpId);

  const ref = trouverReferentielParId(secteurId);
  if (!ref) throw new Error(`Secteur inconnu : ${secteurId}`);

  // Changer de secteur remet les questions de périmètre à zéro (ADR-020).
  //
  // Les identifiants d'activité sont préfixés par secteur, donc deux secteurs
  // ne se marchent pas dessus — mais garder les réponses les faisait
  // ressusciter à l'identique dès qu'on revenait au secteur d'origine :
  // commerce, puis restauration, puis commerce, et d'anciennes déclarations
  // redevenaient des déclarations courantes sans qu'aucune question ait été
  // reposée. Sur un document conservé quarante ans, une réponse doit venir
  // d'une question posée dans la session qui la grave.
  const changeDeSecteur =
    duerp.referentielSecteurId !== null &&
    duerp.referentielSecteurId !== secteurId;

  const aDesQuestions = ref.activitesNonCouvertes.length > 0;
  const suite = `/duerp/${duerpId}/${aDesQuestions ? "activites" : "unites"}`;

  // Reconfirmer le même secteur ne refait rien (2026-11-11) : ni
  // pré-remplissage — il recréerait les unités supprimées depuis —, ni
  // retrait de validation, ni verrou du compte. Le fil mène à /secteur pour
  // un secteur sans précision : confirmer y vaut seulement validation de
  // « Votre activité » (ADR-059).
  if (duerp.referentielSecteurId === secteurId) {
    if (!aDesQuestions) {
      await db.duerp.update({
        where: { id: duerpId },
        data: {
          etapesValidees: avecValidations(duerp.etapesValidees, {
            activite: new Date(),
          }),
        },
      });
      revalidatePath(`/duerp/${duerpId}`, "layout");
    }
    redirect(suite);
  }

  const unitesExistantes = await db.uniteTravail.findMany({
    where: { duerpId },
    select: { nom: true, estTransverse: true },
  });
  const nomsExistants = new Set(
    unitesExistantes.map((u) => u.nom.toLowerCase()),
  );

  // Validations (ADR-059). Sans précision à demander, confirmer le secteur
  // valide « Votre activité » ; avec, c'est la page des précisions qui la
  // valide. Un changement de secteur remet aussi les unités et les risques
  // à valider : de nouvelles unités arrivent, que personne n'a relues.
  const etapesValidees = avecValidations(duerp.etapesValidees, {
    activite: aDesQuestions ? null : new Date(),
    ...(changeDeSecteur ? { unites: null, risques: null } : {}),
  });

  await db.$transaction(async (tx) => {
    // Pendant l'essai gratuit, le pré-remplissage s'arrête à sa limite
    // d'unités (ADR-053 § 14), sans refuser : ce sont des unités proposées,
    // le dirigeant ne perd rien. Le verrou du compte d'abord, comme partout
    // ailleurs.
    const sousLEssai = await placesSousLePlafond(tx, compte.compteId, "unitesTravail");
    await tx.duerp.update({
      where: { id: duerpId },
      data: {
        referentielSecteurId: secteurId,
        etapesValidees,
        ...(changeDeSecteur ? { reponsesActivitesNonCouvertes: Prisma.DbNull } : {}),
      },
    });
    // Les réponses de l'ancien secteur tombent : ce qu'elles avaient ajouté
    // et que le dirigeant n'a pas touché tombe avec elles (ADR-060) — toutes
    // les activités connues hors du nouveau secteur, pas seulement celles de
    // l'ancien tel que le référentiel le décrit aujourd'hui.
    if (changeDeSecteur) {
      await retirerPourActivites(tx, {
        duerpId,
        activites: referentielsSectoriels
          .filter((r) => r.id !== secteurId)
          .flatMap((r) => r.activitesNonCouvertes),
      });
    }
    for (const u of ref.unitesTravailSuggerees
      .filter((u) => !nomsExistants.has(u.nom.toLowerCase()))
      .slice(0, sousLEssai))
      await tx.uniteTravail.create({
        data: {
          duerpId,
          nom: u.nom,
          description: u.description,
          referentielUniteId: u.id,
        },
      });
  });

  revalidatePath(`/duerp/${duerpId}/secteur`);
  revalidatePath(`/duerp/${duerpId}/unites`);
  // Détour par « Périmètre du référentiel » quand le secteur retenu déclare
  // des activités qu'il ne couvre pas (ADR-020). Le détour est le mécanisme
  // même : ces questions posées ailleurs qu'ici ne seraient jamais vues, et
  // une question jamais posée ne produit aucune mention dans le document.
  // Elles se posent avant les unités parce qu'un « oui » se traduit souvent
  // par une unité de travail à créer à la main dans la foulée.
  redirect(suite);
}

const uniteSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(100),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type UniteActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success" };

export async function ajouterUnite(
  duerpId: string,
  _prev: UniteActionState,
  formData: FormData,
): Promise<UniteActionState> {
  await verifierSaisie();
  const { compte, db } = await requireDuerp(duerpId);

  const parsed = uniteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Limite d'unités de l'essai gratuit (ADR-053 § 14).
  const creation = await creerSousPlafond(db, compte.compteId, "unitesTravail", (tx) =>
    tx.uniteTravail.create({
      data: {
        duerpId,
        nom: parsed.data.nom,
        description: parsed.data.description,
      },
    }),
  );
  if (!creation.ok) return { status: "error", message: creation.motif, fieldErrors: { nom: [creation.motif] } };

  revalidatePath(`/duerp/${duerpId}/unites`);
  return { status: "success" };
}

const etapeValidableSchema = z.enum(ETAPES_VALIDABLES);

/**
 * Le dirigeant valide une étape du fil (2026-11-11, « si pas validé, pas
 * fait »). Valider sans rien changer est un geste légitime : ce que le secteur
 * a proposé lui convient. La validation ne force rien : une étape dont l'état
 * calculé est incomplet (une unité sans risque, une question sans réponse)
 * reste à faire, validée ou non.
 */
export async function validerEtape(
  duerpId: string,
  etape: EtapeValidable,
): Promise<void> {
  await verifierSaisie();
  const quelle = etapeValidableSchema.parse(etape);
  const { db, duerp } = await requireDuerp(duerpId);

  // Rien à valider sans secteur, ni sans unité : le bouton n'est pas offert,
  // seul un appel forgé arrive ici.
  if (quelle === "activite" && !duerp.referentielSecteurId) {
    throw new Error("Aucun secteur retenu.");
  }
  if (quelle === "unites") {
    const nb = await db.uniteTravail.count({
      where: { duerpId, estTransverse: false },
    });
    if (nb === 0) throw new Error("Aucune unité de travail à valider.");
  }

  await db.duerp.update({
    where: { id: duerpId },
    data: {
      etapesValidees: avecValidations(duerp.etapesValidees, { [quelle]: new Date() }),
    },
  });
  revalidatePath(`/duerp/${duerpId}`, "layout");
  redirect(`/duerp/${duerpId}/${etapeSuivante(quelle)}`);
}

export async function renommerUnite(
  uniteId: string,
  nouveauNom: string,
): Promise<void> {
  await verifierSaisie();
  const { db, duerpId } = await requireUnite(uniteId);

  // La borne de la création (`uniteSchema`), et non une seconde : un point
  // d'entrée réseau qui écrivait un nom d'un mégaoctet là où l'ajout en
  // refuse cent un (ASVS V2.2.1, 2026-10-13). Le vide reste sans effet, comme
  // avant ; tout autre refus lève — l'écran borne déjà la saisie, seul un
  // appel forgé l'atteint.
  if (typeof nouveauNom === "string" && !nouveauNom.trim()) return;
  const parsed = uniteSchema.shape.nom.safeParse(nouveauNom);
  if (!parsed.success) {
    throw new Error("Nom d'unité de travail invalide (100 caractères au plus).");
  }
  await db.uniteTravail.update({
    where: { id: uniteId },
    data: { nom: parsed.data },
  });
  revalidatePath(`/duerp/${duerpId}/unites`);
}

export async function supprimerUnite(uniteId: string): Promise<void> {
  await verifierSaisie();
  ouvrirAuGel(); // supprimer, retirer : ouvert sur un site gelé (ADR-053 § 14)
  const { db, duerpId } = await requireUnite(uniteId);

  await db.uniteTravail.delete({ where: { id: uniteId } });
  revalidatePath(`/duerp/${duerpId}/unites`);
}

/**
 * La justification est reprise telle quelle dans le DUERP généré : quelques
 * phrases, retours à la ligne compris. Même borne que les autres textes libres
 * d'une fiche (description de prescription, d'établissement) ; sans elle, un
 * appel forgé écrivait un mégaoctet dans un document conservé quarante ans
 * (ASVS V2.2.1, 2026-10-13).
 */
const JUSTIFICATION_AUCUN_RISQUE_MAX = 1000;
const justificationAucunRisqueSchema = z
  .string()
  .trim()
  .max(JUSTIFICATION_AUCUN_RISQUE_MAX)
  .nullable();

/**
 * Déclare « aucun risque significatif identifié » pour une unité. Requiert une
 * justification libre qui sera reprise dans le DUERP final — cf. INRS ED 840,
 * l'évaluation peut légitimement conclure à l'absence de risque significatif.
 * Passer `null` comme justification retire la déclaration.
 */
export async function declarerAucunRisque(
  uniteId: string,
  justification: string | null,
): Promise<void> {
  await verifierSaisie();
  const { db, duerpId } = await requireUnite(uniteId);

  const parsed = justificationAucunRisqueSchema.safeParse(justification);
  if (!parsed.success) {
    throw new Error(
      `Justification invalide (${JUSTIFICATION_AUCUN_RISQUE_MAX} caractères au plus).`,
    );
  }
  const justif = parsed.data || null;
  await db.uniteTravail.update({
    where: { id: uniteId },
    data: { aucunRisqueJustif: justif },
  });
  revalidatePath(`/duerp/${duerpId}/risques`);
  revalidatePath(`/duerp/${duerpId}/risques/${uniteId}`);
}
