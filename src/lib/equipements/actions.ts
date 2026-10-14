"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { batimentParDefaut } from "@/lib/batiments/queries";
import {
  portantUnePreuve,
  toutesLesConditions,
} from "@/lib/calendrier/portee";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { requireUser } from "@/lib/auth/require-user";
import {
  MESSAGE_REGEN_ECHEC,
  regenererApresMutation,
} from "@/lib/calendrier/regeneration-sure";
import {
  CHAMPS_TRI_ETAT,
  equipementSchema,
  libelleEquipementSchema,
  normaliserFormDataEquipement,
  normaliserTriEtat,
  preRemplissageSchema,
  serialiserCaracteristiques,
  type ChampTriEtat,
} from "./schema";
import {
  CATEGORIES_EQUIPEMENT,
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
 * L'appareil, lu DANS le périmètre du compte connecté — ou 404 : son
 * établissement, son état de service (un appareil retiré du parc n'accepte
 * plus aucune écriture, `retrait.ts`, décision du 2026-10-12) et ce que la
 * relance d'une question en lit.
 *
 * ~~`resoudreAppareil`~~ lisait par le seul `id`, et l'appelant vérifiait
 * l'établissement ensuite : un id absent levait « Équipement introuvable »
 * (ou le renvoyait en message), l'appareil d'un autre client donnait le 404
 * du contrôle — de quoi sonder l'existence d'un appareil chez autrui (audit
 * du 2026-10-13, même défaut que `permisDuCompte`). Les deux cas tombent
 * désormais sur le même `notFound()`.
 */
async function appareilDuCompte(equipementId: string) {
  const user = await requireUser();
  const eq = await prisma.equipement.findFirst({
    where: { id: equipementId, etablissement: { entreprise: { userId: user.id } } },
    select: { etablissementId: true, actif: true, categorie: true, caracteristiques: true },
  });
  if (!eq) notFound();
  return eq;
}

/** Le retour du pré-remplissage : le motif de `EquipementActionState`, un
 *  refus se RETOURNE (revue du 2026-10-13). */
export type ResultatPreRemplissage =
  | { status: "success"; created: number; avertissement?: string }
  | { status: "error"; message: string };

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
  const appareil = await appareilDuCompte(id);
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
  const appareil = await appareilDuCompte(id);
  const { etablissementId } = appareil;
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
 *
 * Deux refus, en bloc et avant toute écriture (reprise des suites du lot 3,
 * 2026-10-13) : une catégorie qui n'est pas dans `CATEGORIES_EQUIPEMENT`, et
 * une catégorie dont une réponse est exigée dans le régime de l'établissement
 * (`questionsExigeesPour`) — ~~celle-là se déclare par le formulaire, qui pose
 * la question. L'écran n'envoie ni l'une ni l'autre : seul un POST forgé les
 * fait lever.~~ [2026-10-13, `lot/conditions-equipement`, décision de la
 * propriétaire (option 2) : le panneau POSE les questions exigées des
 * catégories qu'il suggère, et l'action accepte leurs réponses dans
 * `caracteristiques` — champ exigé pour cette catégorie dans ce régime, valeur
 * booléenne stricte, rien d'autre. Ce qui manque reste refusé en bloc ; une
 * clé ou une valeur hors de ce cadre aussi.]
 *
 * ~~Les refus lèvent une exception.~~ [Rayé le 2026-10-13 (revue de
 * `lot/conditions-equipement`) : Next masque en production le message d'une
 * exception levée par une action serveur, et le panneau affichait alors un
 * texte générique à la place du refus. Les refus RETOURNENT
 * `{ status: "error", message }`, le motif de `EquipementActionState` ; seul
 * le contrôle d'appartenance lève encore, comme partout.]
 */
export async function creerEquipementsDepuisPreRemplissage(
  etablissementId: string,
  entrees: {
    categorie: CategorieEquipement;
    libelle: string;
    /** Les seules réponses aux questions exigées, posées par le panneau. */
    caracteristiques?: Partial<Record<ChampTriEtat, boolean>>;
  }[],
): Promise<ResultatPreRemplissage> {
  await assertEtablissementOwnership(etablissementId);
  // Le tableau vient du client : un tableau, pas plus d'entrées que de
  // catégories (ASVS V2.2.1, `lot/securite-owasp-1013`), avant de le parcourir.
  // [2026-10-14, intégration avec `lot/conditions-equipement` : la catégorie et
  // le libellé gardent leurs portes nommées, plus bas, qui disent pourquoi ;
  // `preRemplissageSchema` ne tient plus que le doublon de catégorie, après
  // elles. Un refus se retourne, comme les autres.]
  if (!Array.isArray(entrees) || entrees.length > CATEGORIES_EQUIPEMENT.length) {
    return { status: "error", message: "Sélection invalide : aucun équipement ajouté." };
  }
  if (entrees.length === 0) return { status: "success", created: 0 };

  // LA PORTE DES RÉPONSES EXIGÉES TIENT AUSSI ICI (reprise des suites du lot 3,
  // 2026-10-13). ~~Le pré-remplissage ne propose aucune catégorie dont une réponse
  // est exigée (`suggererEquipements` sondé sur 288 contextes : neuf catégories,
  // aucune avec une question exigée dans aucun des 16 régimes essayés),~~
  // [Rayé le 2026-10-13 (`lot/conditions-equipement`) : faux depuis que la
  // réponse au groupe électrogène est exigée en ERP — `suggererEquipements`
  // propose l'installation électrique à tout ERP. Le panneau pose donc la
  // question (`PreRemplissagePanel`), et `components/equipements/PreRemplissagePanel.questions.test.tsx`
  // vérifie, contexte par contexte, que toute catégorie suggérée à question
  // exigée a sa question dans le panneau.]
  // Mais cette action est un point d'entrée serveur : un POST forgé y créait un
  // appareil sans les réponses que `creerEquipement` exige. Le refus lit ce qui
  // fait foi, `questionsExigeesPour` dans le régime de l'établissement — D29
  // pour le levage, la décision du 2026-10-08 pour le désenfumage d'un ERP des
  // quatre premières catégories —, et non la seule liste de D29. ~~Une ligne
  // créée ici n'a aucune caractéristique : toute question exigée y manque.~~
  // [2026-10-13 : elle porte désormais les réponses que le panneau a posées,
  // et seulement elles ; ce qui manque est refusé.]
  // Refusé en bloc, avant toute écriture.
  //
  // La catégorie d'abord (revue du 2026-10-13, R1) : le type ne tient rien à
  // l'exécution, et `questionsExigeesPour` met en cache, sans condition, ce
  // qu'on lui passe — une valeur forgée y aurait laissé une entrée par appel.
  const inconnues = [
    ...new Set(
      entrees
        .map((e) => e.categorie as string)
        .filter((c) => !(CATEGORIES_EQUIPEMENT as readonly string[]).includes(c)),
    ),
  ];
  if (inconnues.length > 0) {
    return {
      status: "error",
      message: `Catégorie d'équipement inconnue (${inconnues.join(", ")}) : rien n'a été créé.`,
    };
  }
  // Le libellé (revue du 2026-10-13) : la règle de la création manuelle,
  // `libelleEquipementSchema`, jamais recopiée — chaîne, rognée, 1 à 200.
  const libelles = entrees.map((e) => libelleEquipementSchema.safeParse(e.libelle));
  if (libelles.some((r) => !r.success)) {
    return {
      status: "error",
      message:
        "Libellé refusé : il doit être un texte de 1 à 200 caractères. Rien n'a été créé.",
    };
  }
  // Une catégorie au plus une fois (`preRemplissageSchema`, ASVS V2.2.1). Le
  // schéma ne sert qu'à REFUSER : ce qu'il rend écarterait les réponses.
  if (!preRemplissageSchema.safeParse(entrees).success) {
    return {
      status: "error",
      message: "Sélection invalide : une catégorie au plus une fois. Rien n'a été créé.",
    };
  }
  const regime = await regimeDe(etablissementId);
  // Les réponses fournies (2026-10-13) : un objet simple, dont chaque clé est
  // une question EXIGÉE pour cette catégorie dans ce régime, et chaque valeur
  // un booléen. Rien d'autre n'entre dans le JSON de l'appareil par ici.
  // Les lectures ne voient que les clés PROPRES (`Object.hasOwn`, revue du
  // 2026-10-13) : une valeur portée par le prototype passait la porte des
  // manquantes sans être écrite, et l'appareil naissait muet.
  const horsCadre = entrees.filter((e) => {
    const c = e.caracteristiques;
    if (c === undefined) return false;
    if (c === null || typeof c !== "object" || Array.isArray(c)) return true;
    const exigeesIci: readonly string[] = questionsExigeesPour(e.categorie, regime);
    return Object.entries(c).some(
      ([cle, v]) => !exigeesIci.includes(cle) || typeof v !== "boolean",
    );
  });
  if (horsCadre.length > 0) {
    return {
      status: "error",
      message: `Réponses refusées (${[...new Set(horsCadre.map((e) => e.categorie))].join(", ")}) : le pré-remplissage n'accepte que « oui » ou « non » aux questions exigées. Rien n'a été créé.`,
    };
  }
  const manquantes = [
    ...new Set(
      entrees
        .filter((e) =>
          questionsExigeesPour(e.categorie, regime).some(
            (champ) =>
              !(
                e.caracteristiques &&
                Object.hasOwn(e.caracteristiques, champ) &&
                typeof e.caracteristiques[champ] === "boolean"
              ),
          ),
        )
        .map((e) => e.categorie),
    ),
  ];
  if (manquantes.length > 0) {
    return {
      status: "error",
      message: `Le pré-remplissage ne crée pas d'appareil sans les réponses exigées (${manquantes.join(", ")}) : répondez oui ou non à la question posée à côté de la case. Rien n'a été créé.`,
    };
  }

  const batiment = await batimentParDefaut(etablissementId);
  const result = await prisma.equipement.createMany({
    data: entrees.map((e, i) => ({
      etablissementId,
      batimentId: batiment.id,
      categorie: e.categorie,
      libelle: libelles[i].data as string,
      ...(e.caracteristiques && Object.keys(e.caracteristiques).length > 0
        ? { caracteristiques: e.caracteristiques as Prisma.InputJsonValue }
        : {}),
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
    status: "success",
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
  const eq = await appareilDuCompte(equipementId);
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
  //
  // Revue du 2026-10-13 : `AND "actif" = true` (R2) — un appareil retiré
  // entre la lecture et l'écriture est en lecture seule (`retrait.ts`), la
  // garde de plus haut ne voyait que la photo. `NOW() AT TIME ZONE 'UTC'`
  // (R3) — `updatedAt` est un TIMESTAMP(3) sans fuseau où Prisma range des
  // instants UTC (ADR-011 § 1) ; `NOW()` seul y écrirait l'heure locale de la
  // session.
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
           "updatedAt" = NOW() AT TIME ZONE 'UTC'
     WHERE "id" = ${equipementId}
       AND "etablissementId" = ${eq.etablissementId}
       AND "actif" = true`;
  // L'appareil vient d'être lu : zéro ligne veut dire qu'il a disparu ou
  // quitté le parc entre-temps. Se taire afficherait une réponse que rien
  // n'a enregistrée.
  if (lignes === 0) {
    return {
      status: "error",
      message:
        "Cet équipement a été supprimé ou retiré du parc entre-temps : la réponse n'a pas été enregistrée.",
    };
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
