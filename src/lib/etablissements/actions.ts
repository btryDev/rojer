"use server";

import {
  clesDesEtablissements,
  libererFichiers,
} from "@/lib/suppression/fichiers";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NOM_BATIMENT_PRINCIPAL } from "@/lib/batiments/schema";
import {
  COOKIE_ETABLISSEMENT_ACTIF,
  assertEntrepriseOwnership,
  assertEtablissementOwnership,
} from "@/lib/auth/scope";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import {
  etablissementCreationSchema,
  etablissementSchema,
  reponseEpiCoherente,
  reponseSommeilSuivantLeType,
  typesErpAutresCoherents,
} from "./schema";
import { typesErpAutresPostes } from "./types-erp-affiches";
import { refusDuFiltre, rEntre, sansReponseEnfants } from "./types-refuses";

export type EtablissementActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; id: string }
  | { status: "success_avec_avertissement"; id: string; message: string };

/**
 * Champs dont dépend le moteur de matching (ADR-004 : régimes cumulables +
 * enums de précision, et seuils d'effectif). Les modifier change l'ensemble
 * des obligations applicables : une boutique qui devient ERP hérite de la
 * vérification électrique annuelle par organisme agréé ; passer de la 5e à la
 * 3e catégorie ajoute le SSI triennal.
 *
 * Jusqu'ici `modifierEtablissement` faisait `update` + `revalidatePath` sans
 * jamais régénérer le calendrier — contrairement à toutes les mutations
 * d'équipement. L'établissement gardait donc ses anciennes obligations
 * indéfiniment, et le « self-healing » de la page calendrier ne rattrapait
 * rien : il ne se déclenche que sur un calendrier totalement vide.
 */
const CHAMPS_STRUCTURANTS = [
  "estEtablissementTravail",
  "estERP",
  "estIGH",
  "estHabitation",
  "typeErp",
  // ADR-045 : un type ajouté ou retiré fait entrer ou sortir des lignes.
  "typesErpAutres",
  "categorieErp",
  // `classeIgh` et `familleHabitation` ont quitté cette liste le 2026-09-03
  // avec les questions qui les posaient : plus aucun formulaire ne les poste,
  // et un champ structurant qui n'est jamais soumis ne peut rien restructurer.
  "effectifSurSite",
  "personnesPresentesHabituellement",
  "manipuleMatieresR422722",
  // ~~`chiffonsImpregnes`~~ (R. 4227-26, C45) — retiré le 2026-10-08 avec la
  // question : plus aucun formulaire ne le poste (même raison que
  // `classeIgh` ci-dessus), et la ligne des chiffons est au niveau audit.
  // Répondre « non » à la question des locaux à sommeil retire quatre lignes
  // de PE 4 § 1, PE 33, PE 35 et PE 37 ; répondre « oui » les fixe. Dans les
  // deux cas le calendrier change, donc le champ est structurant — l'omettre
  // ici laisserait la réponse sans effet visible jusqu'à la prochaine
  // modification d'un autre champ.
  "comporteLocauxSommeilPublic",
  // Depuis l'ADR-041, la présence d'EPI conditionne la consigne d'utilisation
  // (R. 4323-105) ; la fiche la corrige depuis le 2026-10-12 (audit B2), et la
  // checklist régénérait déjà après sa réponse.
  "epiPresents",
  // DF 10 § 3 (2026-10-12) : la réponse retire ou fixe la triennale du
  // désenfumage mécanique.
  "ssiCategorieAouB",
] as const;

type ChampStructurant = (typeof CHAMPS_STRUCTURANTS)[number];
type ProfilStructurant = Record<ChampStructurant, unknown>;

// Note : ce module porte la directive `"use server"`, qui interdit d'exporter
// autre chose que des fonctions `async`. Les helpers purs restent donc privés ;
// ils sont couverts par les tests des server actions qui les utilisent.

/** Vrai si au moins un champ de matching change de valeur. */
function typologieAChange(
  avant: ProfilStructurant,
  apres: Partial<ProfilStructurant>,
): boolean {
  // Une liste se compare par son contenu, pas par sa référence : sans quoi
  // `typesErpAutres` « changerait » à chaque enregistrement. Et comme un
  // ENSEMBLE, triée : le même ensemble dans un autre ordre ne change aucune
  // obligation, il ne doit pas régénérer le calendrier (revue de c6).
  const valeur = (v: unknown) =>
    JSON.stringify(Array.isArray(v) ? [...v].sort() : (v ?? null));
  return CHAMPS_STRUCTURANTS.some(
    (c) => c in apres && valeur(apres[c]) !== valeur(avant[c]),
  );
}

/**
 * Normalise les données du formulaire avant validation Zod :
 *  - les checkboxes HTML envoient "on" ou rien ; Zod les attend en booléen
 *  - les selects vides arrivent en string "" ; on les transforme en undefined
 */
function normaliserFormData(fd: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(fd);
  const typesErpAutres = typesErpAutresPostes(fd);
  const bool = (k: string) => raw[k] !== undefined;
  const regime = (k: string) => raw[k] !== undefined && raw[k] !== "non";
  return {
    raisonDisplay: raw.raisonDisplay,
    adresse: raw.adresse,
    codeNaf: raw.codeNaf,
    effectifSurSite: raw.effectifSurSite,
    personnesPresentesHabituellement: raw.personnesPresentesHabituellement,
    manipuleMatieresR422722: raw.manipuleMatieresR422722,
    estEtablissementTravail: bool("estEtablissementTravail"),
    // Case cochée (« on », modification) ou « oui » / « non » (création,
    // 2026-09-27, A2). Absente en modification = case décochée = « non ».
    estERP: regime("estERP"),
    estIGH: regime("estIGH"),
    estHabitation: regime("estHabitation"),
    typeErp: raw.typeErp || undefined,
    // Plusieurs valeurs possibles (ADR-045) : `getAll`, pas `raw`, et un champ
    // témoin pour que des cases toutes décochées disent « aucun ». Non posté =
    // omis, et la valeur en base est gardée (`typesErpAutresCoherents`).
    ...(typesErpAutres === undefined ? {} : { typesErpAutres }),
    categorieErp: raw.categorieErp || undefined,
    // Filtre à l'accueil (2026-10-17) : vide = non posté.
    accueilEnfants: raw.accueilEnfants || undefined,
    natureActivite: raw.natureActivite,
    // Ces quatre champs ne sont rendus que dans le bloc `{estERP && (…)}` du
    // formulaire. Décocher la case les retire donc du FormData, et un
    // `undefined` transmis tel quel serait coercé en `null` par le schéma puis
    // écrit en base : les valeurs saisies disparaîtraient pour de bon. On les
    // omet plutôt, ce que Prisma traduit par « ne touche pas à cette colonne ».
    // C'est la protection que `typeErp` et `categorieErp` ont depuis toujours
    // par leur `|| undefined` ; elle manquait aux colonnes ajoutées avec la
    // fiche « Renseignements généraux » du registre.
    ...(raw.effectifPublicAdmis === undefined
      ? {}
      : { effectifPublicAdmis: raw.effectifPublicAdmis }),
    ...(raw.dateAutorisationOuverture === undefined
      ? {}
      : { dateAutorisationOuverture: raw.dateAutorisationOuverture }),
    ...(raw.dateCertificatConformite === undefined
      ? {}
      : { dateCertificatConformite: raw.dateCertificatConformite }),
    // [2026-09-20 : vrai pour les types à qui la question est posée. Hors
    // liste, `reponseSommeilSuivantLeType` remet la colonne à `null` à
    // l'écriture — la réponse suit le type.]
    // Même protection, et elle compte davantage ici : cette colonne DÉCIDE de
    // quatre obligations (PE 4 § 1, PE 33, PE 35, PE 37). Un « non » effacé en
    // décochant l'ERP les ferait toutes réapparaître « à confirmer » sans que
    // personne ne comprenne pourquoi.
    ...(raw.comporteLocauxSommeilPublic === undefined
      ? {}
      : { comporteLocauxSommeilPublic: raw.comporteLocauxSommeilPublic }),
    // Même protection : la fiche de création ne pose pas la question des EPI,
    // et un champ non posté ne doit rien écrire.
    ...(raw.epiPresents === undefined ? {} : { epiPresents: raw.epiPresents }),
    ...(raw.epiPresentsDetail === undefined
      ? {}
      : { epiPresentsDetail: raw.epiPresentsDetail }),
    // Même protection : la question n'est rendue qu'aux ERP des quatre
    // premières catégories ; ailleurs, rien n'est posté et rien ne s'écrit.
    ...(raw.ssiCategorieAouB === undefined
      ? {}
      : { ssiCategorieAouB: raw.ssiCategorieAouB }),
  };
}

export async function creerEtablissement(
  entrepriseId: string,
  _prev: EtablissementActionState,
  formData: FormData,
): Promise<EtablissementActionState> {
  await assertEntrepriseOwnership(entrepriseId);

  // ADR-028 : le verrou qui redirigeait vers l'établissement existant plutôt
  // que d'en créer un second est parti avec l'invariant qu'il gardait. Une
  // entreprise porte autant d'établissements qu'elle en a ; créer le deuxième
  // est le même geste que créer le premier.
  //
  // Et « le même geste » vaut aussi pour ce qu'on refuse : c'est le schéma de
  // CRÉATION qui valide ici, celui qui exige la famille d'habitation
  // (ADR-025 § 4) et porte ~~les deux refus de périmètre~~ [2026-10-18 : les
  // refus de périmètre — effectif, ERP en IGH, et le filtre à l'accueil]
  // (ADR-031). Les deux
  // lots ayant été écrits en parallèle, ce chemin est resté un instant sur le
  // schéma de modification — un dossier refusé à l'onboarding se serait alors
  // créé en deux clics par l'autre porte. C'est la porte, pas le parcours, qui
  // doit porter la règle.
  // EN CRÉATION, LES TROIS RÉGIMES EXIGENT UNE RÉPONSE (2026-09-27, A2) : le
  // formulaire les pose en Oui / Non sans présélection, et la porte refuse
  // leur absence au lieu de la lire « non » — même règle qu'à l'onboarding.
  const regimesSansReponse = (["estERP", "estIGH", "estHabitation"] as const).filter(
    (k) => formData.get(k) !== "oui" && formData.get(k) !== "non",
  );
  if (regimesSansReponse.length > 0) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: Object.fromEntries(
        regimesSansReponse.map((k) => [k, ["Répondez oui ou non."]]),
      ),
    };
  }
  const parsed = etablissementCreationSchema.safeParse(
    normaliserFormData(formData),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // La réponse « accueil d'enfants » ne s'écrit pas : elle ne sert qu'au
  // filtre (`types-refuses.ts`, choix assumé du 2026-10-17).
  const saisie = sansReponseEnfants(parsed.data);
  const etab = await prisma.etablissement.create({
    data: {
      entrepriseId,
      ...reponseSommeilSuivantLeType({
        ...saisie,
        typesErpAutres: typesErpAutresCoherents(saisie),
      }),
      // ADR-019 : tout établissement naît avec son bâtiment principal.
      batiments: { create: { nom: NOM_BATIMENT_PRINCIPAL, ordre: 0 } },
    },
  });

  // Le calendrier naît avec l'établissement, comme à l'onboarding : sans
  // équipement, les obligations d'établissement sont dues quand même
  // (ADR-022). Raté, il reste marqué périmé et le premier affichage le reprend.
  await regenererApresMutation(etab.id, "etablissements/creation");

  revalidatePath(`/entreprises/${entrepriseId}`);
  // On vient de le créer et on y atterrit : c'est lui, l'établissement actif.
  // Sans ce trait, le second établissement se créerait puis l'accueil
  // renverrait au premier — l'utilisateur aurait rempli un formulaire pour se
  // retrouver ailleurs.
  await poserEtablissementActif(etab.id);
  redirect(`/etablissements/${etab.id}`);
}

/**
 * Pose le cookie de l'établissement actif (ADR-028).
 *
 * `httpOnly` : rien côté client n'a à le lire. Il ne porte aucun droit — le
 * scoping le revalide à chaque lecture (`getOptionalUserEtablissement`) — mais
 * un cookie que du JavaScript peut écrire est un cookie qu'une extension ou un
 * script tiers écrit aussi, et le premier symptôme serait un dirigeant qui
 * atterrit chez lui sur le mauvais dossier sans comprendre pourquoi.
 *
 * Un an : c'est une préférence de navigateur, pas une session. La reperdre à
 * chaque déconnexion obligerait à recommuter à chaque retour.
 */
async function poserEtablissementActif(etablissementId: string): Promise<void> {
  (await cookies()).set(COOKIE_ETABLISSEMENT_ACTIF, etablissementId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Commute l'établissement actif — l'action du sélecteur de `BarreCompte`.
 *
 * `assertEtablissementOwnership` d'abord, et ce n'est pas une formalité : la
 * cible arrive d'un formulaire, donc du client. Sans elle, on écrirait dans le
 * cookie l'identifiant de n'importe quel établissement — la lecture le
 * refuserait bien (le `where` remonte à `entreprise.userId`), mais l'utilisateur
 * serait renvoyé en boucle vers un dossier qui n'est pas le sien et qu'il ne
 * verrait jamais s'ouvrir. Mieux vaut un 404 franc au moment du geste.
 */
export async function choisirEtablissementActif(
  etablissementId: string,
): Promise<never> {
  await assertEtablissementOwnership(etablissementId);
  await poserEtablissementActif(etablissementId);
  redirect(`/etablissements/${etablissementId}`);
}

/** Les seuls refus de TYPE du filtre, lus sur la saisie brute (le schéma a échoué). */
async function refusDeTypesALaTransition(id: string, brut: Record<string, unknown>) {
  const avant = await prisma.etablissement.findUnique({
    where: { id },
    select: { estERP: true, typeErp: true, typesErpAutres: true },
  });
  const typeErp = typeof brut.typeErp === "string" ? brut.typeErp : (avant?.typeErp ?? null);
  const autres = Array.isArray(brut.typesErpAutres) ? (brut.typesErpAutres as string[]) : (avant?.typesErpAutres ?? []);
  return refusDuFiltre(
    { estERP: brut.estERP === true, typeErp, typesErpAutres: autres },
    avant?.estERP ? { typeErp: avant.typeErp, typesErpAutres: avant.typesErpAutres } : null,
  ).filter((r) => r.champ !== "accueilEnfants");
}

export async function modifierEtablissement(
  id: string,
  _prev: EtablissementActionState,
  formData: FormData,
): Promise<EtablissementActionState> {
  await assertEtablissementOwnership(id);
  const brut = normaliserFormData(formData);
  const parsed = etablissementSchema.safeParse(brut);
  if (!parsed.success) {
    // Filtre à l'accueil (2026-10-17) : un type refusé qui ENTRE se dit en
    // premier — sinon la fiche réclamerait d'abord la réponse au sommeil
    // d'un type que Rojer ne prendra pas. Ce chemin masque alors les autres
    // erreurs du formulaire, qui reviendront une fois le type corrigé : choix
    // assumé (revue du 2026-10-17, R1).
    const typesRefuses = await refusDeTypesALaTransition(id, brut);
    if (typesRefuses.length > 0)
      return {
        status: "error",
        message: "Formulaire invalide",
        fieldErrors: Object.fromEntries(typesRefuses.map((r) => [r.champ, [r.message]])),
      };
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // État avant modification : c'est lui qui dit si le calendrier doit être
  // recalculé.
  const avant = await prisma.etablissement.findUnique({
    where: { id },
    select: {
      estEtablissementTravail: true,
      estERP: true,
      estIGH: true,
      estHabitation: true,
      typeErp: true,
      typesErpAutres: true,
      categorieErp: true,
      classeIgh: true,
      familleHabitation: true,
      effectifSurSite: true,
      personnesPresentesHabituellement: true,
      manipuleMatieresR422722: true,
      comporteLocauxSommeilPublic: true,
      epiPresents: true,
      ssiCategorieAouB: true,
    },
  });
  if (!avant) {
    return { status: "error", message: "Établissement introuvable" };
  }

  // LE FILTRE À L'ACCUEIL, À LA TRANSITION (2026-10-17, `types-refuses.ts`).
  // Un type refusé qui n'était pas en base, ou un R qui entre sans réponse ou
  // avec des enfants, est refusé ; un dossier créé avant le filtre
  // s'enregistre comme avant. La réponse n'est acceptée que là où la question
  // est posée — à l'entrée de R — et ne s'écrit jamais.
  const accueilEnfants = parsed.data.accueilEnfants;
  const saisie = sansReponseEnfants(parsed.data);
  // Le premier type qui restera en base : le posté, sinon l'enregistré
  // (`|| undefined` en amont le laisse en place quand il n'est pas posté).
  // Calculé une fois, pour le filtre et pour l'écriture (revue, R2).
  const typeErpApres = saisie.typeErp ?? avant.typeErp;
  const typesErpAutresApres = typesErpAutresCoherents(
    { ...saisie, typeErp: typeErpApres },
    avant.typesErpAutres,
  );
  const typesApres = { estERP: saisie.estERP, typeErp: typeErpApres, typesErpAutres: typesErpAutresApres };
  const avantTypes = avant.estERP
    ? { typeErp: avant.typeErp, typesErpAutres: avant.typesErpAutres }
    : null;
  const refus = refusDuFiltre({ ...typesApres, accueilEnfants }, avantTypes);
  if (accueilEnfants !== undefined && !rEntre(typesApres, avantTypes)) {
    refus.push({
      champ: "accueilEnfants",
      message: "La question de l'accueil d'enfants n'est posée qu'à l'entrée du type R.",
    });
  }
  if (refus.length > 0) {
    return {
      status: "error",
      message: "Formulaire invalide",
      fieldErrors: Object.fromEntries(refus.map((r) => [r.champ, [r.message]])),
    };
  }

  // Les autres types d'abord : la réponse sur le sommeil se lit sur
  // l'ensemble des types (ADR-045), y compris ceux que le formulaire n'a pas
  // postés et que la base garde.
  const donnees = reponseEpiCoherente(
    reponseSommeilSuivantLeType({ ...saisie, typesErpAutres: typesErpAutresApres }),
  );
  const etab = await prisma.etablissement.update({
    where: { id },
    data: donnees,
  });

  revalidatePath(`/entreprises/${etab.entrepriseId}`);
  revalidatePath(`/etablissements/${id}`);

  if (typologieAChange(avant, donnees)) {
    // Le garde est celui de `calendrier/regeneration-sure`, comme partout
    // ailleurs. Il était ici recopié à la main — c'est en migrant les six
    // appels qui n'en avaient AUCUN qu'on a vu que deux autres en avaient un,
    // écrit deux fois.
    if (await regenererApresMutation(id, "etablissements")) {
      revalidatePath(`/etablissements/${id}/calendrier`);
    } else {
      return {
        status: "success_avec_avertissement",
        id,
        // Le message reste PROPRE À CET ÉCRAN : « vos obligations » y dit
        // mieux ce qui n'a pas bougé que le libellé générique du module.
        message:
          "Fiche enregistrée. Vos obligations n'ont pas pu être recalculées " +
          "à l'instant : elles le seront automatiquement à la prochaine " +
          "ouverture du tableau de bord ou du calendrier.",
      };
    }
  }

  return { status: "success", id };
}

/**
 * Résultat d'une demande de suppression. La suppression peut être **refusée**
 * par la loi : ce n'est pas une erreur technique, et l'utilisateur a droit à
 * une explication, pas à une page d'erreur Next.
 */
export type SuppressionResult = {
  statut: "refus";
  message: string;
  /** Où aller pour récupérer ses documents avant toute autre démarche. */
  exportHref: string;
};

/**
 * Message de refus commun à la suppression d'un établissement et à celle
 * d'une entreprise. Formulé pour un dirigeant non-juriste : ce qui bloque,
 * pourquoi, et ce qu'il peut faire à la place.
 */
function messageConservationDuerp(nbVersions: number): string {
  return (
    `Suppression impossible : ${nbVersions} version${nbVersions > 1 ? "s" : ""} ` +
    `de votre document unique d'évaluation des risques ${nbVersions > 1 ? "sont" : "est"} ` +
    "archivée" +
    (nbVersions > 1 ? "s" : "") +
    " ici. Le Code du travail les fait conserver 40 ans " +
    "(art. R. 4121-4 du Code du travail) : elles servent à prouver, des " +
    "décennies plus tard, à quels risques un salarié a été exposé. Ce refus " +
    "s'applique même à une demande d'effacement (art. 17.3 du RGPD, obligation " +
    "légale). Vous pouvez en revanche exporter l'intégralité de vos documents."
  );
}

/**
 * Compte les versions de DUERP figées rattachées à un établissement.
 * Sert de garde applicatif **avant** de tenter la suppression : la base la
 * refuserait de toute façon (`onDelete: Restrict` posé par la migration
 * `20260810120000_integrite_et_conservation`), mais avec une erreur Prisma
 * P2003 illisible.
 */
async function compterVersionsDuerp(etablissementId: string): Promise<number> {
  return prisma.duerpVersion.count({
    where: { duerp: { etablissementId } },
  });
}

/**
 * Supprime un établissement — ou explique pourquoi c'est impossible.
 *
 * En cas de succès, la fonction ne rend pas la main : elle redirige. Elle ne
 * retourne donc qu'en cas de **refus**.
 */
export async function supprimerEtablissement(
  id: string,
): Promise<SuppressionResult> {
  await assertEtablissementOwnership(id);

  const etab = await prisma.etablissement.findUnique({
    where: { id },
    select: { id: true, entrepriseId: true },
  });
  if (!etab) {
    return {
      statut: "refus",
      message: "Établissement introuvable.",
      exportHref: "/",
    };
  }

  const nbVersions = await compterVersionsDuerp(id);
  if (nbVersions > 0) {
    return {
      statut: "refus",
      message: messageConservationDuerp(nbVersions),
      exportHref: `/etablissements/${id}/controle`,
    };
  }

  // Les clés des fichiers stockés, lues DANS la transaction de la
  // suppression : après, les lignes qui les portaient n'existent plus
  // (`suppression/fichiers.ts`, 2026-09-27). Elles ne sont libérées qu'une
  // fois la base d'accord.
  let cles: string[];
  try {
    cles = await prisma.$transaction(async (tx) => {
      const c = await clesDesEtablissements(tx, [id]);
      await tx.etablissement.delete({ where: { id } });
      return c;
    });
  } catch (err) {
    // Filet de sécurité : une version de DUERP a pu être créée entre le
    // comptage et la suppression, ou un autre `Restrict` a été ajouté depuis.
    // Dans tous les cas, l'utilisateur ne doit jamais voir « P2003 ».
    console.error(`[etablissements] suppression refusée pour ${id}`, err);
    return {
      statut: "refus",
      message:
        "Suppression impossible : cet établissement porte des documents à " +
        "conservation obligatoire. Exportez votre dossier de conformité, puis " +
        "contactez le support si vous souhaitez fermer le compte.",
      exportHref: `/etablissements/${id}/controle`,
    };
  }

  // La base a tranché : les fichiers se libèrent. Un échec est journalisé et
  // n'annule rien — l'établissement est supprimé.
  await libererFichiers(cles, "etablissements/suppression");

  revalidatePath(`/entreprises/${etab.entrepriseId}`);
  redirect(`/entreprises/${etab.entrepriseId}`);
}
