"use server";

import {
  clesDesEtablissements,
  libererFichiers,
} from "@/lib/suppression/fichiers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertEtablissementDuCompte, assertEtablissementOwnership } from "@/lib/auth/scope";
import { poserEtablissementActif } from "./etablissement-actif";
import { sirenDuSiret } from "./siret";
import { supprimerEntrepriseSiVide } from "@/lib/entreprises/cycle-de-vie";

/** Le refus d'un SIRET dont le SIREN n'est pas celui de l'entreprise de l'établissement. */
function refusSiretAutreEntreprise(): EtablissementActionState {
  return {
    status: "error",
    message: "Formulaire invalide",
    fieldErrors: {
      siret: [
        "Ce SIRET relève d'une société que votre compte ne suit pas encore. Pour suivre un établissement d'une autre entreprise, ajoutez-le depuis « Ajouter un établissement ».",
      ],
    },
  };
}
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import {
  etablissementSchema,
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
  // ~~"epiPresents"~~ — retiré le 2026-10-22 : la fiche ne pose plus la
  // question des EPI, devenue un fait d'activité (DUERP, Équipe), dont
  // l'écrivain régénère lui-même le calendrier.
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
    siret: raw.siret,
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
    // Même protection : la question n'est rendue qu'aux ERP des quatre
    // premières catégories ; ailleurs, rien n'est posté et rien ne s'écrit.
    ...(raw.ssiCategorieAouB === undefined
      ? {}
      : { ssiCategorieAouB: raw.ssiCategorieAouB }),
  };
}

// ~~`creerEtablissement` — la seconde porte de création (ADR-028)~~
// [2026-10-26 : retirée. Tout établissement naît du parcours d'onboarding
// (`finaliserOnboarding`), qui porte les mêmes refus de périmètre : une seule
// porte, une seule règle.] `poserEtablissementActif` a rejoint
// `etablissement-actif.ts`, partagé avec le parcours.

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
  const { user, db } = await assertEtablissementDuCompte(id);
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
  const avant = await db.etablissement.findUnique({
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
      effectifPublicAdmis: true,
      manipuleMatieresR422722: true,
      comporteLocauxSommeilPublic: true,
      ssiCategorieAouB: true,
      entrepriseId: true,
      entreprise: { select: { siren: true } },
    },
  });
  if (!avant) {
    return { status: "error", message: "Établissement introuvable" };
  }

  // UN SITE APPARTIENT À L'ENTREPRISE DE SON SIREN (2026-10-26), dans le
  // compte — la même règle qu'au parcours. Trois cas quand le SIREN du SIRET
  // n'est pas celui de l'entreprise de l'établissement :
  //  - une autre entreprise du compte porte ce SIREN : l'établissement la rejoint.
  //    C'est le cas d'un dossier ancien, d'avant le SIRET obligatoire, dont la
  //    société a été ouverte depuis par un second établissement ;
  //  - l'entreprise de l'établissement n'a pas de SIREN (dossier ancien) : elle le reçoit ;
  //  - sinon, refus : passer sous une société que le compte ne suit pas
  //    demanderait sa raison sociale et son effectif, qui fixent des seuils —
  //    ce que la fiche ne demande pas. On ouvre alors un établissement.
  // La recherche est bornée au compte de la session : un SIREN suivi par un
  // autre compte n'est ni lu ni signalé.
  const siren = sirenDuSiret(parsed.data.siret);
  let entrepriseCible = avant.entrepriseId;
  let sirenAPoser = false;
  if (avant.entreprise.siren !== siren) {
    const autre = await db.entreprise.findFirst({
      where: { userId: user.id, siren },
      select: { id: true },
    });
    if (autre) entrepriseCible = autre.id;
    else if (avant.entreprise.siren === null) sirenAPoser = true;
    else return refusSiretAutreEntreprise();
  }
  const changeDEntreprise = entrepriseCible !== avant.entrepriseId;

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
  const donnees = reponseSommeilSuivantLeType({
    ...saisie,
    typesErpAutres: typesErpAutresApres,
  });
  let etab;
  try {
    etab = await db.$transaction(async (tx) => {
      if (sirenAPoser) {
        await tx.entreprise.update({
          where: { id: avant.entrepriseId },
          data: { siren },
        });
      }
      const ecrit = await tx.etablissement.update({
        where: { id },
        data: changeDEntreprise ? { ...donnees, entrepriseId: entrepriseCible } : donnees,
      });
      // L'établissement a rejoint l'entreprise de son SIREN : celle qu'il quitte part
      // si elle n'a plus d'établissement.
      if (changeDEntreprise) await supprimerEntrepriseSiVide(tx, avant.entrepriseId);
      return ecrit;
    });
  } catch (e) {
    // Une autre entreprise du compte a pris ce SIREN entre la lecture et
    // l'écriture : l'unicité `(userId, siren)` tranche. Rare (deux onglets) ;
    // un nouvel enregistrement rattachera l'établissement à cette entreprise.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return refusSiretAutreEntreprise();
    }
    throw e;
  }

  revalidatePath(`/entreprises/${etab.entrepriseId}`);
  revalidatePath(`/etablissements/${id}`);

  // Changer d'entreprise change l'effectif sur lequel se comptent le CSE et le
  // règlement intérieur : le calendrier se recalcule comme pour la typologie.
  if (changeDEntreprise || typologieAChange(avant, donnees)) {
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
  const { db } = await assertEtablissementDuCompte(id);

  const etab = await db.etablissement.findUnique({
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
    cles = await db.$transaction(async (tx) => {
      const c = await clesDesEtablissements(tx, [id]);
      await tx.etablissement.delete({ where: { id } });
      // Le dernier parti, l'entreprise part avec lui (2026-10-26).
      await supprimerEntrepriseSiVide(tx, etab.entrepriseId);
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
  // L'aiguilleur : l'établissement actif s'il en reste un, sinon l'onboarding.
  redirect("/entreprises");
}
