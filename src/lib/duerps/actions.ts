"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { reprendreFaitsDansDuerp } from "@/lib/etablissements/faits-activite-ecriture";
import { requireDuerp, requireEtablissement, requireUnite } from "@/lib/auth/scope";
import { trouverReferentielParId } from "@/lib/referentiels";
import {
  compterUnitesPlafonnees,
  messagePlafondAjout,
  placesRestantes,
} from "./plafond-unites";

/**
 * Cloisonnement : aucune de ces actions ne peut faire confiance à
 * l'identifiant qu'elle reçoit (etablissementId, duerpId, uniteId viennent
 * tous du client). Chacune commence donc par un helper de `lib/auth/scope`
 * qui remonte jusqu'à `Entreprise.userId` et répond 404 si l'objet n'est pas
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
  const { db, etablissement } = await requireEtablissement(etablissementId);

  let duerp = await db.duerp.findFirst({
    where: { etablissementId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!duerp) {
    // L'unité transverse est créée sans regarder le plafond, et c'est voulu :
    // elle ne compte pas dans les cinq (ADR-033). Le DUERP naît donc toujours
    // avec ses cinq places entières.
    //
    // Il naît aussi avec les risques des faits d'activité déjà déclarés
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
  const { db, duerp } = await requireDuerp(duerpId);

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

  const unitesExistantes = await db.uniteTravail.findMany({
    where: { duerpId },
    select: { nom: true, estTransverse: true },
  });
  const nomsExistants = new Set(
    unitesExistantes.map((u) => u.nom.toLowerCase()),
  );

  // Le pré-remplissage sectoriel s'arrête au plafond (ADR-033). Il s'arrête,
  // il ne refuse pas : ce sont des unités que le produit propose, pas des
  // données que le dirigeant a apportées — en écarter une ne lui fait rien
  // perdre, et il peut toujours l'ajouter à la main. C'est la différence avec
  // l'import, qui refuse en bloc plutôt que d'amputer un document reçu.
  //
  // Le cas où la coupe mord vraiment est le changement de secteur : les unités
  // de l'ancien secteur restent et occupent les places. Une bascule
  // restauration → bureau n'en installera donc aucune, et l'utilisateur devra
  // supprimer les anciennes lui-même.
  const places = placesRestantes(compterUnitesPlafonnees(unitesExistantes));

  await db.$transaction([
    db.duerp.update({
      where: { id: duerpId },
      data: {
        referentielSecteurId: secteurId,
        ...(changeDeSecteur ? { reponsesActivitesNonCouvertes: Prisma.DbNull } : {}),
      },
    }),
    ...ref.unitesTravailSuggerees
      .filter((u) => !nomsExistants.has(u.nom.toLowerCase()))
      .slice(0, places)
      .map((u) =>
        db.uniteTravail.create({
          data: {
            duerpId,
            nom: u.nom,
            description: u.description,
            referentielUniteId: u.id,
          },
        }),
      ),
  ]);

  revalidatePath(`/duerp/${duerpId}/secteur`);
  revalidatePath(`/duerp/${duerpId}/unites`);
  // Détour par « Périmètre du référentiel » quand le secteur retenu déclare
  // des activités qu'il ne couvre pas (ADR-020). Le détour est le mécanisme
  // même : ces questions posées ailleurs qu'ici ne seraient jamais vues, et
  // une question jamais posée ne produit aucune mention dans le document.
  // Elles se posent avant les unités parce qu'un « oui » se traduit souvent
  // par une unité de travail à créer à la main dans la foulée.
  const aDesQuestions = ref.activitesNonCouvertes.length > 0;
  redirect(`/duerp/${duerpId}/${aDesQuestions ? "activites" : "unites"}`);
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
  const { db } = await requireDuerp(duerpId);

  const parsed = uniteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Le plafond de l'ADR-033 vaut à l'ajout, jamais à la lecture : un DUERP qui
  // porte déjà huit unités n'en perd aucune, il n'en gagne plus.
  const unites = await db.uniteTravail.findMany({
    where: { duerpId },
    select: { estTransverse: true },
  });
  if (placesRestantes(compterUnitesPlafonnees(unites)) === 0) {
    const message = messagePlafondAjout();
    // Sur le champ `nom` : c'est le seul que `AjouterUniteForm` affiche, un
    // message rangé ailleurs ne serait jamais lu.
    return { status: "error", message, fieldErrors: { nom: [message] } };
  }

  await db.uniteTravail.create({
    data: {
      duerpId,
      nom: parsed.data.nom,
      description: parsed.data.description,
    },
  });

  revalidatePath(`/duerp/${duerpId}/unites`);
  return { status: "success" };
}

export async function renommerUnite(
  uniteId: string,
  nouveauNom: string,
): Promise<void> {
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
