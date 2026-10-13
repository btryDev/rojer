"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { batimentParDefaut } from "@/lib/batiments/queries";
import {
  portantUnePreuve,
  toutesLesConditions,
} from "@/lib/calendrier/portee";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import {
  MESSAGE_REGEN_ECHEC,
  regenererApresMutation,
} from "@/lib/calendrier/regeneration-sure";
import {
  CHAMPS_TRI_ETAT,
  equipementSchema,
  normaliserFormDataEquipement,
  normaliserTriEtat,
  serialiserCaracteristiques,
  type ChampTriEtat,
} from "./schema";
import {
  estCategorieEpi,
  type CategorieEquipement,
} from "@/lib/referentiels/types-communs";
import {
  questionsExigeesPour,
  REGIME_TRAVAIL,
  reponsesExigeesManquantes,
  type RegimeExigence,
} from "./reponses-exigees";
import type { ReponseParametrage } from "@/lib/etablissements/parametrage";
import { MESSAGE_APPAREIL_RETIRE, estAppareilRetire } from "./retrait";

/**
 * Toute mutation d'équipement invalide le calendrier de vérifications : on
 * régénère systématiquement juste après.
 *
 * L'échec est **remonté**, pas avalé. L'ancienne version se contentait d'un
 * `console.error` : l'utilisateur voyait son équipement enregistré et repartait
 * en croyant ses obligations à jour, alors que le calendrier n'avait pas bougé.
 * Sur un outil de conformité, un silence de ce genre vaut un mensonge.
 *
 * On ne relance pas l'exception pour autant : la mutation, elle, a réussi et
 * ne doit pas être présentée comme un échec. L'appelant transforme le
 * `message` en avertissement explicite avec la marche à suivre.
 *
 * **Le corps vit désormais dans `calendrier/regeneration-sure`**, et tous les
 * appelants passent par lui. Le compte a été écrit deux fois de travers avant
 * d'être vérifié, alors il est posé ici une bonne fois : sur les neuf appels à
 * `genererCalendrier`, **six régénéraient à nu** — les deux de
 * `rapports/actions.ts` et les quatre de `prescriptions/actions.ts` —, et
 * **trois avaient déjà un garde, écrit trois fois** : celui-ci, celui de
 * `salaries/actions.ts` et celui d'`etablissements/actions.ts`. Un appel nu
 * faisait échouer une action serveur dont la mutation était déjà commitée ; un
 * garde recopié fait diverger les trois copies. Ce qui reste ici est la seule
 * chose qui soit propre à cet appelant : la mise en forme du refus.
 */
async function regenererCalendrier(
  etablissementId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ok = await regenererApresMutation(etablissementId, "equipements");
  return ok ? { ok: true } : { ok: false, message: MESSAGE_REGEN_ECHEC };
}

/**
 * Un équipement de protection individuelle déclaré contredit un « non » (ou un
 * silence) à « Fournissez-vous des équipements de protection individuelle ? »
 * (relecture indépendante du 2026-10-12, audit B2). Le « non » laissait
 * `R. 4323-105` retiré alors qu'un harnais était déclaré, et `AIDE_EPI`
 * invite justement à les déclarer un par un. La déclaration vaut « oui » :
 * `epiPresents` passe à vrai, AVANT la régénération que l'appelant fait déjà.
 * Une seule règle, `estCategorieEpi`.
 */
async function constaterEpiDeclare(
  etablissementId: string,
  categories: readonly string[],
): Promise<void> {
  if (!categories.some(estCategorieEpi)) return;
  await prisma.etablissement.updateMany({
    where: {
      id: etablissementId,
      OR: [{ epiPresents: false }, { epiPresents: null }],
    },
    data: { epiPresents: true },
  });
}

/**
 * Ce que l'exigence des réponses lit de l'établissement (`RegimeExigence`) :
 * le régime ERP et la réponse au SSI A/B (DF 10 § 3, décision du
 * 2026-10-08). Lu après le contrôle d'appartenance.
 */
async function regimeDe(etablissementId: string): Promise<RegimeExigence> {
  const r = await prisma.etablissement.findUnique({
    where: { id: etablissementId },
    select: { estERP: true, typeErp: true, categorieErp: true, ssiCategorieAouB: true },
  });
  return r ?? REGIME_TRAVAIL;
}

/**
 * L'établissement de l'appareil, pour le contrôle d'appartenance, et son état
 * de service : un appareil retiré du parc n'accepte plus aucune écriture
 * (`retrait.ts`, décision du 2026-10-12).
 */
async function resoudreAppareil(
  equipementId: string,
): Promise<{ etablissementId: string; actif: boolean }> {
  const eq = await prisma.equipement.findUnique({
    where: { id: equipementId },
    select: { etablissementId: true, actif: true },
  });
  if (!eq) throw new Error("Équipement introuvable");
  return eq;
}

export type EquipementActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; id: string };

export async function creerEquipement(
  etablissementId: string,
  _prev: EquipementActionState,
  formData: FormData,
): Promise<EquipementActionState> {
  await assertEtablissementOwnership(etablissementId);
  const parsed = equipementSchema.safeParse(normaliserFormDataEquipement(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const exigees = reponsesExigeesManquantes(parsed.data, await regimeDe(etablissementId));
  if (exigees) {
    return { status: "error", message: "Formulaire invalide", fieldErrors: exigees };
  }

  const caracs = serialiserCaracteristiques(parsed.data);

  // ADR-019 : le formulaire propose un bâtiment dès qu'il y en a plusieurs ;
  // sinon, le seul existant. Un id fourni doit être un bâtiment de CET
  // établissement — la base ne le vérifie pas (clé simple), l'action le fait.
  const batiment = parsed.data.batimentId
    ? await prisma.batiment.findFirst({
        where: { id: parsed.data.batimentId, etablissementId },
        select: { id: true },
      })
    : await batimentParDefaut(etablissementId);
  if (!batiment) {
    return {
      status: "error",
      message: "Zone introuvable",
      fieldErrors: { batimentId: ["Zone introuvable"] },
    };
  }

  await prisma.equipement.create({
    data: {
      etablissementId,
      batimentId: batiment.id,
      libelle: parsed.data.libelle,
      categorie: parsed.data.categorie,
      localisation: parsed.data.localisation,
      dateMiseEnService: parsed.data.dateMiseEnService,
      datePeremption: parsed.data.datePeremption,
      caracteristiques: (caracs ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  await constaterEpiDeclare(etablissementId, [parsed.data.categorie]);

  const regen = await regenererCalendrier(etablissementId);

  // Les trois chemins qui régénèrent le calendrier l'invalident : la
  // régénération vient de réécrire des dates, et `/calendrier` servait son
  // rendu précédent. Le retrait ~~et la réactivation~~ le faisait déjà, la
  // création, la modification et le pré-remplissage non. [2026-10-12 : la
  // réactivation n'existe plus, le retrait est définitif (`retrait.ts`).]
  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  // L'équipement est bien créé : on ne redirige pas en silence si les
  // obligations correspondantes n'ont pas pu être calculées.
  if (!regen.ok) {
    return { status: "error", message: regen.message };
  }
  redirect(`/etablissements/${etablissementId}/equipements`);
}

export async function modifierEquipement(
  id: string,
  _prev: EquipementActionState,
  formData: FormData,
): Promise<EquipementActionState> {
  const appareil = await resoudreAppareil(id);
  await assertEtablissementOwnership(appareil.etablissementId);
  // L'appartenance d'abord, le refus ensuite : on ne dit rien d'un appareil
  // qui n'est pas à soi.
  if (estAppareilRetire(appareil)) {
    return { status: "error", message: MESSAGE_APPAREIL_RETIRE };
  }

  const parsed = equipementSchema.safeParse(normaliserFormDataEquipement(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const exigees = reponsesExigeesManquantes(parsed.data, await regimeDe(appareil.etablissementId));
  if (exigees) {
    return { status: "error", message: "Formulaire invalide", fieldErrors: exigees };
  }

  const caracs = serialiserCaracteristiques(parsed.data);

  // Le bâtiment ne change que si le formulaire en propose un autre ; il doit
  // appartenir au même établissement.
  if (parsed.data.batimentId) {
    const cible = await prisma.batiment.findFirst({
      where: {
        id: parsed.data.batimentId,
        etablissementId: appareil.etablissementId,
      },
      select: { id: true },
    });
    if (!cible) {
      return {
        status: "error",
        message: "Zone introuvable",
        fieldErrors: { batimentId: ["Zone introuvable"] },
      };
    }
  }

  const eq = await prisma.equipement.update({
    where: { id },
    data: {
      batimentId: parsed.data.batimentId,
      libelle: parsed.data.libelle,
      categorie: parsed.data.categorie,
      localisation: parsed.data.localisation,
      dateMiseEnService: parsed.data.dateMiseEnService,
      datePeremption: parsed.data.datePeremption,
      caracteristiques: (caracs ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  await constaterEpiDeclare(eq.etablissementId, [parsed.data.categorie]);
  const regen = await regenererCalendrier(eq.etablissementId);

  revalidatePath(`/etablissements/${eq.etablissementId}`);
  revalidatePath(`/etablissements/${eq.etablissementId}/equipements`);
  revalidatePath(`/etablissements/${eq.etablissementId}/equipements/${id}`);
  // Répondre « oui » à « charge > 50 t éq. CO₂ » fait passer la périodicité
  // de douze à six mois : la fiche et le calendrier doivent le voir.
  revalidatePath(`/etablissements/${eq.etablissementId}/calendrier`);
  if (!regen.ok) {
    return { status: "error", message: regen.message };
  }
  return { status: "success", id };
}

/** Ce que la suppression a réellement fait, pour que l'interface puisse le
 *  dire à l'utilisateur sans deviner. */
export type SuppressionEquipementResult =
  | { statut: "supprime" }
  | { statut: "desactive"; message: string }
  | { statut: "erreur"; message: string };

/**
 * Retire un équipement du parc — **sans jamais détruire son historique**.
 *
 * L'ancienne version faisait un `prisma.equipement.delete`. Or
 * `Verification.equipementId` est en `onDelete: Cascade`, et
 * `RapportVerification.verificationId` et `Action.verificationId` le sont
 * aussi : supprimer une hotte emportait ses vérifications *y compris
 * réalisées*, donc les rapports du registre de sécurité (art. D. 4711-3 CT)
 * et les actions correctives ouvertes. Les PDF, eux, restaient sur le disque,
 * orphelins.
 *
 * Règle retenue (ADR-012) :
 *  - l'équipement ne porte **aucune** trace (aucun rapport, aucune action,
 *    aucune vérification réalisée) → suppression physique, rien à conserver ;
 *  - sinon → **désactivation** (`actif = false`). L'équipement sort des
 *    listes et du matching — il ne génère donc plus d'obligation — mais son
 *    historique reste consultable et opposable.
 *
 * Dans les deux cas le retrait est DÉFINITIF (décision du 2026-10-12) : un
 * appareil retiré est en lecture seule et ne se remet plus en service
 * (`retrait.ts`).
 */
export async function supprimerEquipement(
  id: string,
): Promise<SuppressionEquipementResult> {
  const appareil = await resoudreAppareil(id);
  const { etablissementId } = appareil;
  await assertEtablissementOwnership(etablissementId);
  // Déjà retiré : le retrait est définitif, il ne se rejoue pas. Sans ce
  // refus, un appareil retiré dont le dernier rapport aurait été retiré
  // ensuite repasserait par la branche « aucune trace » et serait détruit.
  if (estAppareilRetire(appareil)) {
    return { statut: "erreur", message: MESSAGE_APPAREIL_RETIRE };
  }

  // Une seule requête : y a-t-il au moins une vérification porteuse de trace ?
  // La définition partagée d'une preuve (`portantUnePreuve`), jamais recopiée :
  // celle d'ici ignorait le statut réalisé, seul témoin d'une obligation
  // consommée dont la colonne est éteinte.
  const nbTraces = await prisma.verification.count({
    where: toutesLesConditions({ equipementId: id }, portantUnePreuve()),
  });

  let resultat: SuppressionEquipementResult;
  if (nbTraces === 0) {
    // Les vérifications restantes sont de simples échéances calculées :
    // la cascade ne détruit rien qui ne se régénère.
    await prisma.equipement.delete({ where: { id } });
    resultat = { statut: "supprime" };
  } else {
    await prisma.equipement.update({
      where: { id },
      data: { actif: false },
    });
    resultat = {
      statut: "desactive",
      message:
        "Équipement retiré du parc. Ses rapports de vérification et ses " +
        "actions correctives sont conservés. Pour les vérifications dues au " +
        "titre de la santé et de la sécurité au travail, et sauf dispositions " +
        "particulières, l'article D. 4711-3 du Code du " +
        // ~~L. 4711-5~~ : cette phrase dit « la loi impose de POUVOIR LES
        // PRÉSENTER », c'est-à-dire une conservation — et la conservation est
        // à D. 4711-3 (cinq ans, ou les deux derniers contrôles). L. 4711-5
        // n'impose rien : il autorise à réunir plusieurs registres en un seul.
        "travail fait conserver les documents des vérifications et contrôles " +
        "« des cinq dernières années et, en tout état de cause, ceux des deux " +
        "derniers contrôles ou vérifications ». " +
        "Il n'apparaît plus dans vos listes et ne génère plus d'échéance ; " +
        "sa fiche reste consultable, sans modification possible. S'il " +
        "revient, déclarez-le comme un nouvel appareil.",
    };
  }

  const regen = await regenererCalendrier(etablissementId);

  // Rafraîchi dans tous les cas : l'équipement a bien quitté le parc, même si
  // le recalcul des échéances a échoué.
  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);

  if (!regen.ok) {
    return { statut: "erreur", message: regen.message };
  }
  return resultat;
}

/**
 * Action de création groupée depuis le pré-remplissage (étape 4).
 * Attend un tableau `categories` de catégories validées par l'utilisateur.
 * Chaque catégorie donne lieu à un `Equipement` minimal (libellé générique,
 * pas de caractéristiques) que l'utilisateur pourra enrichir ensuite.
 */
export async function creerEquipementsDepuisPreRemplissage(
  etablissementId: string,
  entrees: { categorie: CategorieEquipement; libelle: string }[],
): Promise<{ created: number; avertissement?: string }> {
  await assertEtablissementOwnership(etablissementId);
  if (entrees.length === 0) return { created: 0 };

  // LA PORTE DES RÉPONSES EXIGÉES TIENT AUSSI ICI (reprise des suites du lot 3,
  // 2026-10-13). Le pré-remplissage ne propose aucune catégorie dont une réponse
  // est exigée (`suggererEquipements` sondé sur 288 contextes : neuf catégories,
  // aucune avec une question exigée dans aucun des 16 régimes essayés),
  // mais cette action est un point d'entrée serveur : un POST forgé y créait un
  // appareil sans les réponses que `creerEquipement` exige. Le refus lit ce qui
  // fait foi, `questionsExigeesPour` dans le régime de l'établissement — D29
  // pour le levage, la décision du 2026-10-08 pour le désenfumage d'un ERP des
  // quatre premières catégories —, et non la seule liste de D29. Une ligne
  // créée ici n'a aucune caractéristique : toute question exigée y manque.
  // Refusé en bloc, avant toute écriture.
  const regime = await regimeDe(etablissementId);
  const exigees = [
    ...new Set(
      entrees
        .map((e) => e.categorie)
        .filter((c) => questionsExigeesPour(c, regime).length > 0),
    ),
  ];
  if (exigees.length > 0) {
    throw new Error(
      `Le pré-remplissage ne crée pas d'appareil dont une réponse est exigée (${exigees.join(", ")}) : déclarez-le par le formulaire d'équipement.`,
    );
  }

  const batiment = await batimentParDefaut(etablissementId);
  const result = await prisma.equipement.createMany({
    data: entrees.map((e) => ({
      etablissementId,
      batimentId: batiment.id,
      categorie: e.categorie,
      libelle: e.libelle,
    })),
  });
  await constaterEpiDeclare(
    etablissementId,
    entrees.map((e) => e.categorie),
  );

  const regen = await regenererCalendrier(etablissementId);

  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/etablissements/${etablissementId}/equipements`);
  revalidatePath(`/etablissements/${etablissementId}/calendrier`);
  return {
    created: result.count,
    ...(regen.ok ? {} : { avertissement: regen.message }),
  };
}

/**
 * La relance d'un appareil muet (D29 (a)) : une question exigée, répondue
 * depuis le tableau de bord. Même patron que les questions de la fiche
 * (`etablissements/parametrage.ts`) : l'appartenance d'abord, par
 * l'établissement de l'appareil ; « oui » ou « non », jamais de repli ; la
 * propriété écrite dans le JSON sans toucher aux autres ; le calendrier
 * régénéré, et son échec dit plutôt que tu.
 */
export async function repondreQuestionEquipement(
  equipementId: string,
  champ: ChampTriEtat,
  _prev: ReponseParametrage,
  formData: FormData,
): Promise<ReponseParametrage> {
  const eq = await prisma.equipement.findUnique({
    where: { id: equipementId },
    select: {
      etablissementId: true,
      actif: true,
      categorie: true,
      caracteristiques: true,
    },
  });
  if (!eq) return { status: "error", message: "Équipement introuvable." };
  await assertEtablissementOwnership(eq.etablissementId);
  if (estAppareilRetire(eq)) {
    return { status: "error", message: MESSAGE_APPAREIL_RETIRE };
  }

  // Seule une question que la décision exige pour CETTE catégorie : l'action
  // n'écrit pas n'importe quelle clé qu'on lui poste.
  if (
    !(CHAMPS_TRI_ETAT as readonly string[]).includes(champ) ||
    !questionsExigeesPour(eq.categorie as CategorieEquipement, await regimeDe(eq.etablissementId)).includes(champ)
  ) {
    return { status: "error", message: "Question inconnue pour cet appareil." };
  }
  const brut = formData.get("reponse");
  const reponse = brut === "oui" || brut === "non" ? normaliserTriEtat(brut) : undefined;
  if (reponse === undefined) {
    return { status: "error", message: "Répondez oui ou non." };
  }

  // UNE CLÉ, ÉCRITE PAR LA BASE (reprise des suites du lot 3, 2026-10-13). La
  // fusion lecture-puis-écriture de tout l'objet JSON écrasait une écriture
  // concurrente : deux relances répondues ensemble (deux onglets, deux
  // questions du même appareil), ou une fiche enregistrée entre la lecture
  // ci-dessus et l'écriture, et l'une des deux réponses redevenait un silence.
  // Même contrat que `ecrireReponseFermee` (`duerps/ecrire-reponse-fermee.ts`),
  // la politique sœur du dépôt : un seul UPDATE pose UNE clé par `jsonb_set`
  // (`create_missing` à vrai), repart d'un objet vide si la colonne n'en est
  // pas un (NULL tant que rien n'est déclaré), garde un booléen JSON, lie la
  // clé, la valeur et les identifiants sans les concaténer, et horodate la
  // ligne — le `@updatedAt` de Prisma est appliqué par le client, pas par la
  // base. Scopé par l'appareil ET l'établissement dont l'appartenance vient
  // d'être contrôlée. `champ` est une clé fermée : elle a passé le filtre de
  // `questionsExigeesPour` plus haut.
  const lignes = await prisma.$executeRaw`
    UPDATE "Equipement"
       SET "caracteristiques" = jsonb_set(
             CASE
               WHEN jsonb_typeof("caracteristiques") = 'object'
               THEN "caracteristiques"
               ELSE '{}'::jsonb
             END,
             ARRAY[${champ}]::text[],
             to_jsonb(${reponse}::boolean),
             true
           ),
           "updatedAt" = NOW()
     WHERE "id" = ${equipementId}
       AND "etablissementId" = ${eq.etablissementId}`;
  // L'appareil vient d'être lu : zéro ligne veut dire qu'il a disparu
  // entre-temps. Se taire afficherait une réponse que rien n'a enregistrée.
  if (lignes === 0) {
    return { status: "error", message: "Équipement introuvable." };
  }

  const regen = await regenererCalendrier(eq.etablissementId);
  revalidatePath(`/etablissements/${eq.etablissementId}`);
  revalidatePath(`/etablissements/${eq.etablissementId}/equipements`);
  revalidatePath(`/etablissements/${eq.etablissementId}/equipements/${equipementId}`);
  revalidatePath(`/etablissements/${eq.etablissementId}/calendrier`);
  return regen.ok
    ? { status: "success" }
    : { status: "success_avec_avertissement", message: regen.message };
}
