// Outils exposés par le serveur MCP — **définis hors du transport**.
//
// Un outil est ici une donnée : un nom, une description, un schéma d'entrée,
// et une fonction qui rend du texte. Rien dans ce fichier ne sait qu'il
// tourne derrière stdio. C'est ce découplage qui doit permettre de brancher
// un jour le même jeu d'outils derrière un serveur HTTP authentifié en OAuth
// sans y toucher : seul le code qui fabrique le `ContexteMcp` change.
//
// Deux règles de sécurité s'écrivent dans les types plutôt que dans un
// commentaire :
//
//   1. **La portée n'est pas un argument d'outil.** `executer` reçoit un
//      `ContexteMcp` d'un côté (fourni par le serveur) et les arguments du
//      client de l'autre. Aucun schéma d'entrée ne comporte
//      d'`etablissementId` : un client qui en enverrait un ne serait pas
//      seulement rejeté, il n'a aucun champ où l'écrire.
//   2. **Lecture seule.** Les outils sont annoncés `readOnlyHint` au
//      protocole, et aucun n'appelle autre chose que les lectures de
//      `./queries`.
//
// L'horloge est injectée (ADR-011) : `now` vient du contexte, jamais d'un
// `new Date()` planté au milieu d'un formatage.

import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { z } from "zod";
import type { StatutAction } from "@prisma/client";
import { formaterDateFr } from "@/lib/dates";
import { estVerificationRealisee } from "@/lib/dates/retard";
import { LIBELLE_SANS_ECHEANCE } from "@/lib/calendrier/etats";
import { ageEnMois, EFFECTIF_MAJ_ANNUELLE } from "@/lib/dashboard/duerp";
import { mentionAConfirmer } from "@/lib/matching/effectif-entreprise";
import {
  getEtatDuerp,
  getNomEtablissement,
  getFicheEtablissement,
  getFraicheurCalendrier,
  listerActions,
  listerEquipements,
  listerVerifications,
  type ActionLue,
  type EquipementLu,
  type EtatDuerpLu,
  type FicheEtablissement,
  type VerificationLue,
} from "./queries";
import { phraseFraicheur } from "@/lib/calendrier/fraicheur";
import {
  MAJ_DUERP_AMENAGEMENT_IMPORTANT,
  MAJ_DUERP_ANNUELLE,
  MAJ_DUERP_INFORMATION_NOUVELLE,
  enMinuscule,
} from "@/lib/referentiels/conformite/texte-r4121-2";

/**
 * Consigne transmise au client à l'ouverture de session, et relayée par lui
 * au modèle.
 *
 * C'est le seul levier que le protocole offre pour cadrer l'interprétation :
 * une **consigne**, pas une contrainte. Le client reste libre de la
 * présenter comme il veut, et le modèle d'en dévier — on réduit la
 * probabilité d'une extrapolation, on ne l'empêche pas. La seule garantie
 * dure resterait de ne pas exposer la donnée.
 *
 * Ce qu'elle vise précisément : Rojer produit des documents à valeur légale
 * par des règles déterministes, sans IA (principe fondateur du projet). Un
 * assistant qui, par-dessus, qualifie juridiquement un état applicatif —
 * « ce document n'est pas opposable », « vous êtes en infraction » — rend
 * une réponse qui sera lue comme venant de l'outil. D'où la distinction
 * demandée ici : restituer ce que les outils rendent, et signaler comme
 * sienne toute lecture qui va au-delà.
 */
export const CONSIGNE_SERVEUR = `Ce serveur donne accès en lecture au dossier de conformité santé-sécurité d'un établissement, tenu dans Rojer.

Restitue ce que les outils rendent, sans le compléter.

- Ne qualifie jamais juridiquement un état : ni « conforme », ni « en infraction », ni « opposable ».
- Les outils rendent des faits (dates, statuts, cotations). Seul l'état du DUERP cite des articles ; les autres outils n'en rendent aucun. Aucun outil ne rend de conclusion de droit, et il n'y en a pas à en tirer.
- Ne cite aucune référence réglementaire qui ne figure pas dans une réponse d'outil.
- « Version validée » est un état de l'application, pas une catégorie juridique : n'en déduis aucune conséquence de droit.
- Si tu ajoutes une analyse, une priorisation ou une recommandation, dis explicitement qu'elle vient de toi et non de Rojer.
- Quand une information manque, dis-le plutôt que de l'inférer.

Rojer calcule, il n'avise pas.`;

/** Portée de la session : l'établissement que le serveur a le droit de lire. */
export type ScopeMcp = { etablissementId: string };

export type ContexteMcp = {
  scope: ScopeMcp;
  /** Horloge injectée — cf. ADR-011. */
  now: Date;
};

export type OutilMcp<Schema extends z.ZodTypeAny> = {
  nom: string;
  titre: string;
  description: string;
  schema: Schema;
  executer: (ctx: ContexteMcp, args: z.infer<Schema>) => Promise<string>;
};

// ---------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------

const tiret = (v: string | null | undefined) => v ?? "—";

function formaterRegimes(f: FicheEtablissement): string {
  const regimes: string[] = [];
  if (f.estEtablissementTravail) regimes.push("établissement de travail");
  if (f.estERP) {
    const precisions = [f.typeErp, f.categorieErp ? `catégorie ${f.categorieErp}` : null]
      .filter(Boolean)
      .join(", ");
    regimes.push(precisions ? `ERP (${precisions})` : "ERP");
  }
  if (f.estIGH) regimes.push("IGH");
  if (f.estHabitation) regimes.push("habitation");
  return regimes.length > 0 ? regimes.join(" · ") : "aucun régime déclaré";
}

function formaterFiche(f: FicheEtablissement): string {
  // Le nom est déjà porté par le préfixe commun (cf. `avecEtablissement`).
  return [
    `Adresse : ${f.adresse}`,
    `Régimes : ${formaterRegimes(f)}`,
    `Effectif sur site : ${f.effectifSurSite}`,
    `Code NAF : ${tiret(f.codeNaf ?? f.entreprise.codeNaf)}`,
    "",
    `Entreprise : ${f.entreprise.raisonSociale}`,
    `SIRET : ${tiret(f.entreprise.siret)}`,
    `Effectif entreprise : ${f.entreprise.effectif}`,
    "",
    `Équipements déclarés : ${f._count.equipements}`,
    `Vérifications au calendrier : ${f._count.verifications}`,
    `Actions au plan d'actions : ${f._count.actions}`,
  ].join("\n");
}

/**
 * Résumé d'ancienneté du DUERP.
 *
 * Le vocabulaire est contraint par la règle n°8 du projet : l'outil
 * constate qu'une échéance de mise à jour est ou non dépassée, il ne dit
 * jamais que le dossier est « conforme ».
 */
// Exportée pour `maj-a-confirmer.test.ts` : chaque sortie qui lit
// `soumisMajAnnuelle` y est confrontée au cas « à confirmer ».
export function formaterEtatDuerp(d: EtatDuerpLu): string {
  if (!d.existe || !d.etat) {
    return "Aucun DUERP n'a encore été ouvert pour cet établissement.";
  }

  const e = d.etat;
  const lignes: string[] = [];

  if (e.jamaisValide) {
    lignes.push(
      // ~~« (art. R. 4121-1) »~~ : un article attaché à un état de
      // l'application, ce que la consigne interdit (relecture du 2026-09-26).
      "Le DUERP est ouvert mais aucune version n'a encore été validée dans Rojer.",
    );
  } else if (d.derniereVersionAu) {
    const age = e.ageJours !== null ? ` (il y a ${ageEnMois(e.ageJours)} mois)` : "";
    lignes.push(
      `Dernière version validée : n°${d.derniereVersionNumero} du ${formaterDateFr(d.derniereVersionAu)}${age}.`,
    );
  }

  if (!e.soumisMajAnnuelle) {
    lignes.push(
      `Effectif de ${d.effectifEntreprise} salariés : le 1° de l'art. R. 4121-2 (« ${enMinuscule(MAJ_DUERP_ANNUELLE)} ») ne s'applique pas. Ses 2° et 3° valent quel que soit l'effectif : la mise à jour est réalisée « ${enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)} » et « ${enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)} ».`,
    );
  } else {
    // Soumis par la seule prudence (C37) : la ligne le dit, dans les mots des
    // autres surfaces.
    const doute = e.majAnnuelleAConfirmer
      ? ` (${mentionAConfirmer(EFFECTIF_MAJ_ANNUELLE)})`
      : "";
    if (e.majEchue) {
      lignes.push(
        e.dateLimiteMaj
          ? `Mise à jour annuelle échue depuis le ${formaterDateFr(e.dateLimiteMaj)}${doute}.`
          : `Mise à jour annuelle échue${doute}.`,
      );
    } else if (e.rappelMajProche && e.dateLimiteMaj) {
      lignes.push(`Mise à jour annuelle à prévoir avant le ${formaterDateFr(e.dateLimiteMaj)}${doute}.`);
    } else if (e.dateLimiteMaj) {
      lignes.push(`Prochaine mise à jour annuelle attendue le ${formaterDateFr(e.dateLimiteMaj)}${doute}.`);
    }
  }

  const nbRisques = d.unites.reduce((s, u) => s + u.risques.length, 0);
  lignes.push("", `${d.unites.length} unité(s) de travail, ${nbRisques} risque(s) coté(s).`);

  for (const u of d.unites) {
    lignes.push("", `— ${u.nom}${u.estTransverse ? " (transverse)" : ""}`);
    if (u.risques.length === 0) {
      lignes.push("   aucun risque coté");
      continue;
    }
    for (const r of u.risques) {
      const marqueurs = [
        `criticité ${r.criticite}`,
        `G${r.gravite}/P${r.probabilite}/M${r.maitrise}`,
        r.exposeCMR ? "CMR" : null,
        r.nbActions > 0 ? `${r.nbActions} action(s)` : "aucune action",
      ]
        .filter(Boolean)
        .join(", ");
      lignes.push(`   • ${r.libelle} — ${marqueurs}`);
    }
  }

  return lignes.join("\n");
}

const LIBELLE_ORIGINE: Record<ActionLue["origine"], string> = {
  duerp: "DUERP",
  verification: "vérification",
  libre: "libre",
};

/** Un filtre a-t-il été passé ? Sans filtre, une liste vide dit autre chose. */
const avecFiltre = (args: object) =>
  Object.values(args).some((v) => v !== undefined && v !== null && v !== false);

function formaterActions(actions: ActionLue[], filtre = true): string {
  if (actions.length === 0) {
    // ~~Toujours « ne correspond à ces critères »~~ : la même phrase sans
    // filtre et sur un plan vide (relecture du 2026-09-26).
    return filtre
      ? "Aucune action ne correspond à ces critères."
      : "Le plan d'actions ne contient aucune action.";
  }

  const enRetard = actions.filter((a) => a.enRetard).length;
  const entete =
    enRetard > 0
      ? `${actions.length} action(s), dont ${enRetard} en retard.`
      : `${actions.length} action(s), aucune en retard.`;

  const lignes = actions.map((a) => {
    const details = [
      `statut ${a.statut}`,
      a.criticite !== null ? `criticité ${a.criticite}` : null,
      a.echeance
        ? `échéance ${formaterDateFr(a.echeance)}${a.enRetard ? " — en retard" : ""}`
        : "sans échéance",
      `origine ${LIBELLE_ORIGINE[a.origine]}${a.origineLibelle ? ` : ${a.origineLibelle}` : ""}`,
    ]
      .filter(Boolean)
      .join(", ");
    return `• ${a.libelle} — ${details}`;
  });

  return [entete, "", ...lignes].join("\n");
}

// ---------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------

const STATUTS: readonly [StatutAction, ...StatutAction[]] = [
  "ouverte",
  "en_cours",
  "levee",
  "abandonnee",
];

const outilFiche: OutilMcp<z.ZodObject<Record<string, never>>> = {
  nom: "fiche_etablissement",
  titre: "Fiche de l'établissement",
  description:
    "Identité de l'établissement suivi : raison sociale, adresse, régimes réglementaires (travail, ERP, IGH, habitation), effectifs, et volume du dossier (équipements, vérifications, actions). À appeler en premier pour savoir de quel établissement on parle.",
  schema: z.object({}),
  executer: async (ctx) => {
    const fiche = await getFicheEtablissement(ctx.scope.etablissementId);
    if (!fiche) return "Établissement introuvable.";
    return formaterFiche(fiche);
  },
};

const outilDuerp: OutilMcp<z.ZodObject<Record<string, never>>> = {
  nom: "etat_duerp",
  titre: "État du DUERP",
  description:
    "État du document unique d'évaluation des risques professionnels : ancienneté de la dernière version validée, échéance de mise à jour annuelle (art. R. 4121-2, applicable à partir de 11 salariés), unités de travail et risques cotés avec leur criticité. À appeler pour toute question sur les risques évalués ou la fraîcheur du DUERP.",
  schema: z.object({}),
  executer: async (ctx) => {
    const etat = await getEtatDuerp(ctx.scope.etablissementId, ctx.now);
    return formaterEtatDuerp(etat);
  },
};

const schemaActions = z.object({
  statut: z
    .enum(STATUTS)
    .optional()
    .describe("Ne garder que les actions de ce statut."),
  enCoursSeulement: z
    .boolean()
    .optional()
    .describe("Ne garder que les actions encore à traiter (ouverte ou en cours)."),
  enRetardSeulement: z
    .boolean()
    .optional()
    .describe("Ne garder que les actions dont l'échéance est dépassée."),
  criticiteMin: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe("Criticité minimale des actions retournées."),
});

const outilActions: OutilMcp<typeof schemaActions> = {
  nom: "plan_actions",
  titre: "Plan d'actions",
  description:
    // La description ANNONÇAIT le responsable. Une description d'outil est lue
    // par le modèle avant tout appel : annoncer un nom de personne, c'est en
    // promettre un. Le champ n'est plus lu (cf. `listerActions`), la promesse
    // part avec lui.
    "Actions correctives de l'établissement, qu'elles viennent du DUERP, d'un rapport de vérification ou d'une saisie libre : libellé, statut, criticité, échéance et retard éventuel. Filtrable par statut, criticité, actions en cours ou en retard. " +
    "Attention : les échéances rendues ici sont des échéances de **traitement**, que l'établissement se fixe. Elles sont distinctes des échéances des obligations suivies, rendues par l'outil `verifications`. Avant de conclure qu'une date n'existe pas dans le dossier, interroger les deux.",
  schema: schemaActions,
  executer: async (ctx, args) => {
    const actions = await listerActions(ctx.scope.etablissementId, args, ctx.now);
    // Les échéances rendues ici sont de TRAITEMENT et non réglementaires (cf.
    // la description), mais les actions naissent en partie d'écarts relevés au
    // calendrier : un calendrier jamais calculé rend une liste courte pour une
    // raison que le lecteur doit connaître.
    return avecFraicheur(ctx.scope.etablissementId, formaterActions(actions, avecFiltre(args)));
  },
};

// ---------------------------------------------------------------------
// Équipements et calendrier
// ---------------------------------------------------------------------

/** Catégories du référentiel, rendues lisibles sans les traduire. */
// LA SEULE TABLE DU DÉPÔT INDEXÉE PAR `string` ET NON PAR `CategorieEquipement`,
// et c'est ce qui l'a fait manquer quatre fois de suite : `tsc` ne peut pas
// signaler une clé absente d'un `Record<string, …>`. Les quatre catégories de
// protection individuelle ouvertes le 2026-09-04 sortaient donc en
// « epi_antichute » au client MCP, par le repli `?? c.toLowerCase()`.
//
// Le repli est gardé — un serveur qui parle à un modèle ne doit pas casser sur
// une valeur neuve —, mais il n'excuse rien : il rend l'oubli SILENCIEUX.
export const LIBELLE_CATEGORIE: Record<string, string> = {
  INSTALLATION_ELECTRIQUE: "installation électrique",
  EXTINCTEUR: "extincteur",
  RIA: "robinet d'incendie armé",
  EPI: "équipement de protection individuelle",
  EPI_ANTICHUTE: "harnais antichute ou système d'arrêt de chute",
  EPI_RESPIRATOIRE: "appareil de protection respiratoire",
  EPI_GILET_SAUVETAGE: "gilet de sauvetage gonflable",
  BAES: "bloc autonome d'éclairage de sécurité",
  ALARME_INCENDIE: "alarme incendie",
  DESENFUMAGE: "désenfumage",
  VMC: "ventilation mécanique",
  CTA: "centrale de traitement d'air",
  HOTTE_PRO: "hotte professionnelle",
  APPAREIL_CUISSON_ERP: "appareil de cuisson",
  ASCENSEUR: "ascenseur",
  PORTE_AUTO: "porte automatique",
  PORTAIL_AUTO: "portail automatique",
  EQUIPEMENT_SOUS_PRESSION: "équipement sous pression",
  STOCKAGE_MATIERE_DANGEREUSE: "stockage de matières dangereuses",
  EQUIPEMENT_LEVAGE: "équipement de levage",
  INSTALLATION_FRIGORIFIQUE: "installation frigorifique",
  COMPACTEUR_PRESSE_DECHETS_MOTORISE:
    "compacteur à déchets ou presse à cartons motorisé",
  AUTRE: "autre",
};

const categorieLisible = (c: string) => LIBELLE_CATEGORIE[c] ?? c.toLowerCase();

function formaterEquipements(equipements: EquipementLu[]): string {
  if (equipements.length === 0) {
    return "Aucun équipement déclaré pour cet établissement.";
  }

  const lignes = equipements.map((e) => {
    const v = e.verifications;
    const etat =
      v.total === 0
        ? "aucune vérification au calendrier"
        : [
            `${v.total} vérification(s)`,
            v.enRetard > 0 ? `${v.enRetard} en retard` : null,
            v.aPlanifier > 0 ? `${v.aPlanifier} à planifier` : null,
          ]
            .filter(Boolean)
            .join(", ");

    const details = [
      categorieLisible(e.categorie),
      e.localisation ?? null,
      e.dateMiseEnService
        ? `en service depuis le ${formaterDateFr(e.dateMiseEnService)}`
        : null,
      e.actif ? null : "hors service",
    ]
      .filter(Boolean)
      .join(" · ");

    return `• ${e.libelle} — ${details}\n  ${etat}`;
  });

  return [`${equipements.length} équipement(s) déclaré(s).`, "", ...lignes].join(
    "\n",
  );
}

const LIBELLE_ETAT: Record<VerificationLue["etat"], string> = {
  en_retard: "en retard",
  a_planifier: "à planifier",
  a_venir: "à venir",
  planifiee: "planifiée",
  realisee: "réalisée",
  // Dit ce que l'application constate, sans le qualifier en droit : le
  // serveur rend des faits, jamais de conclusion (cf. ses instructions).
  ne_s_applique_plus: "ne s'applique plus",
  // Le mot du calendrier (`LIBELLE_SANS_RENDEZ_VOUS`), en minuscule.
  sans_rendez_vous: "sans rendez-vous",
};

function formaterVerifications(verifs: VerificationLue[], filtre = true): string {
  if (verifs.length === 0) {
    return filtre
      ? "Aucune vérification ne correspond à ces critères."
      : "Le calendrier ne contient aucune vérification.";
  }

  const enRetard = verifs.filter((v) => v.etat === "en_retard").length;
  const entete =
    enRetard > 0
      ? `${verifs.length} vérification(s), dont ${enRetard} en retard.`
      : `${verifs.length} vérification(s), aucune en retard.`;

  const lignes = verifs.map((v) => {
    const details = [
      // Sans catégorie, l'échéance porte sur l'établissement : on nomme
      // l'obligation plutôt qu'un appareil qui n'existe pas (ADR-022).
      v.categorie
        ? `${categorieLisible(v.categorie)} « ${v.equipement} »`
        : v.equipement,
      // ~~La valeur brute de l'énumération (`autre`, `six_semaines`)~~ :
      // `autre` veut dire « le texte n'écrit pas de rythme », et l'assistant
      // ne pouvait pas le savoir (relecture du 2026-09-26).
      v.periodicite === "autre"
        ? "sans rythme écrit (le texte n'en fixe pas)"
        : `périodicité ${LABEL_PERIODICITE[v.periodicite as Periodicite] ?? v.periodicite}`,
      // Depuis l'ADR-034 la ligne dit les deux : ce qui a été fait — lu sur le
      // dernier rapport — ET l'échéance ouverte.
      v.derniereRealisation
        ? `dernière réalisation le ${formaterDateFr(v.derniereRealisation)}`
        : null,
      // L'ÉCHÉANCE, TOUJOURS — sauf sur une obligation consommée, qui n'en
      // attend plus. Écrite en alternative avec la réalisation, elle
      // disparaissait sur une rangée gelée : l'assistant recevait « réalisée
      // le 01/03/2025, en retard, 196 jour(s) de retard » sans pouvoir dire
      // quelle échéance était passée (relecture du 2026-09-13). `datePrevue`
      // est ici l'échéance ouverte (`mcp/queries.ts`).
      // Et SANS ÉCHÉANCE CONNUE, on le dit au lieu d'imprimer la date de
      // génération comme une échéance (relecture système du 2026-09-14).
      // Sans rendez-vous : l'état le dit déjà, juste après. « sans échéance
      // connue » promettait une échéance à venir (limite 1, 2026-09-15).
      estVerificationRealisee(v) || v.etat === "sans_rendez_vous"
        ? null
        : v.echeanceConnue
          ? `échéance ${formaterDateFr(v.datePrevue)}`
          : LIBELLE_SANS_ECHEANCE.toLowerCase(),
      LIBELLE_ETAT[v.etat],
      v.joursRetard > 0 ? `${v.joursRetard} jour(s) de retard` : null,
      // Dit en toutes lettres, et non par une pastille : le destinataire est
      // un assistant, qui restituerait sinon un engagement d'assurance comme
      // une obligation légale (ADR-032). Le serveur a pour consigne de ne
      // jamais qualifier juridiquement un état — il lui faut donc de quoi
      // distinguer, et le mot doit voyager avec la ligne.
      v.contractuelle
        ? "engagement d'assurance, pas une obligation légale"
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    return `• ${v.libelleObligation} — ${details}`;
  });

  return [entete, "", ...lignes].join("\n");
}

const outilEquipements: OutilMcp<z.ZodObject<Record<string, never>>> = {
  nom: "equipements",
  titre: "Équipements déclarés",
  description:
    "Équipements déclarés de l'établissement (extincteurs, installation électrique, blocs de secours, ventilation, ascenseur…) avec leur catégorie, leur localisation, leur date de mise en service, et le nombre de vérifications en retard ou à planifier pour chacun. À appeler pour savoir de quel matériel dispose l'établissement.",
  schema: z.object({}),
  executer: async (ctx) => {
    const equipements = await listerEquipements(ctx.scope.etablissementId, ctx.now);
    return formaterEquipements(equipements);
  },
};

const schemaVerifications = z.object({
  recherche: z
    .string()
    .optional()
    .describe(
      "Filtre texte sur l'obligation, l'équipement ou sa catégorie — par exemple « extincteur » ou « électrique ».",
    ),
  enRetardSeulement: z
    .boolean()
    .optional()
    .describe("Ne garder que les vérifications dont l'échéance est dépassée."),
  horizonJours: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .optional()
    .describe(
      "Ne garder que les vérifications non réalisées dont l'échéance tombe dans ce nombre de jours, échéances dépassées comprises, ainsi que celles sans échéance connue (dues, jamais faites), listées en premier.",
    ),
});

/**
 * Préfixe la réponse d'un outil par l'état du calendrier, quand il n'est pas à
 * jour.
 *
 * POURQUOI ICI, ET PAS UNE GARDE. Le serveur MCP est en lecture seule —
 * « l'ajout d'une écriture ici ne serait pas un détail d'implémentation mais un
 * changement de nature du serveur » —, donc il ne peut pas régénérer, et il ne
 * doit pas. Ce qu'il peut faire, c'est ne pas laisser un modèle conclure d'une
 * liste vide qu'il n'y a rien à faire. C'était le cas : sur les quatre outils
 * qui rendent des échéances ou des compteurs de retard, aucun ne disait d'où
 * venait son silence.
 *
 * La phrase passe AVANT le contenu : un modèle qui tronque lit le début.
 */
async function avecFraicheur(
  etablissementId: string,
  rendu: string,
): Promise<string> {
  const phrase = phraseFraicheur(await getFraicheurCalendrier(etablissementId));
  return phrase === null ? rendu : `${phrase}\n\n${rendu}`;
}

const outilVerifications: OutilMcp<typeof schemaVerifications> = {
  nom: "verifications",
  titre: "Calendrier des vérifications",
  description:
    // ~~« vérifications périodiques obligatoires par équipement », « échéances
    // **réglementaires** »~~ : l'outil rend aussi des lignes portées par
    // l'établissement, des états permanents, et des engagements d'assurance
    // qu'il marque lui-même comme tels (relecture du 2026-09-26). Une
    // description est lue par le modèle avant tout appel.
    "Calendrier de l'établissement : les échéances que Rojer suit — vérifications d'équipements, obligations portées par l'établissement, et engagements d'assurance, marqués comme tels —, avec rythme, échéance, état (en retard, à planifier, à venir, réalisée) et ancienneté du retard. C'est l'outil à appeler pour toute question sur les vérifications — « mes extincteurs sont-ils à jour ? », « qu'est-ce qui est en retard ? », « qu'est-ce qui arrive le mois prochain ? ». " +
    "Attention : Rojer distingue deux échéances qui ne se recouvrent pas. Celles rendues ici sont les échéances des obligations suivies. Les échéances de traitement des actions correctives sont d'autres dates, rendues par l'outil `plan_actions`. Avant de conclure qu'une date n'existe pas dans le dossier, interroger les deux.",
  schema: schemaVerifications,
  executer: async (ctx, args) => {
    const verifs = await listerVerifications(
      ctx.scope.etablissementId,
      args,
      ctx.now,
    );
    return avecFraicheur(
      ctx.scope.etablissementId,
      formaterVerifications(verifs, avecFiltre(args)),
    );
  },
};

/**
 * Les outils servis par le serveur. Tous en lecture seule — l'ajout d'une
 * écriture ici ne serait pas un détail d'implémentation mais un changement
 * de nature du serveur, à instruire séparément.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- collection hétérogène : chaque outil porte son propre schéma zod.
const OUTILS_BRUTS: readonly OutilMcp<any>[] = [
  outilFiche,
  outilEquipements,
  outilVerifications,
  outilDuerp,
  outilActions,
];

/**
 * Préfixe chaque réponse par l'établissement qui a répondu.
 *
 * Un même client peut avoir plusieurs connecteurs Rojer branchés sur des
 * dossiers différents — les outils portent alors les mêmes noms et les mêmes
 * descriptions, et rien dans une réponse ne dit lequel a répondu. Une
 * réponse juste sur le mauvais dossier se lit exactement comme une réponse
 * fausse : c'est ce qui a fait chercher des extincteurs absents et une
 * échéance de juillet introuvable.
 *
 * Le rappel est posé ici, sur la sortie, et pas dans la consigne serveur :
 * une consigne, le client peut la diluer et le modèle l'oublier ; une ligne
 * de texte dans le résultat d'outil, non.
 */
function avecEtablissement<S extends z.ZodTypeAny>(
  outil: OutilMcp<S>,
): OutilMcp<S> {
  return {
    ...outil,
    executer: async (ctx, args) => {
      // ~~En parallèle, et le texte rendu même sans établissement~~ : sur un
      // établissement inconnu, quatre outils sur cinq décrivaient un dossier
      // vide — « aucun équipement déclaré », « aucun DUERP ouvert » —, un fait
      // faux dit comme un fait (relecture du 2026-09-26). L'outil n'est plus
      // exécuté.
      const nom = await getNomEtablissement(ctx.scope.etablissementId);
      if (!nom) {
        return "Établissement introuvable pour ce connecteur : son dossier ne peut pas être lu, et rien n'est à conclure de son contenu.";
      }
      const texte = await outil.executer(ctx, args);
      return `Établissement : ${nom}\n\n${texte}`;
    },
  };
}

/**
 * Les outils servis par le serveur. Tous en lecture seule — l'ajout d'une
 * écriture ici ne serait pas un détail d'implémentation mais un changement
 * de nature du serveur, à instruire séparément.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- collection hétérogène : chaque outil porte son propre schéma zod.
export const OUTILS_MCP: readonly OutilMcp<any>[] =
  OUTILS_BRUTS.map(avecEtablissement);
