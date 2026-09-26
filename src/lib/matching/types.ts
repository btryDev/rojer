import type {
  CategorieErp,
  CategorieEquipement,
  ClasseIgh,
  FamilleHabitation,
  Periodicite,
  Realisateur,
  TypeErp,
} from "@/lib/referentiels/types-communs";
import type {
  Obligation,
  PorteurObligation,
} from "@/lib/referentiels/conformite/types";
// Type seul : l'import est effacé à la compilation, il ne crée donc pas de
// cycle avec `prescriptions/schema.ts`, qui importe une valeur d'ici.
import type { SourcePrescription } from "@/lib/prescriptions/schema";

/**
 * Types utilisés par le moteur de matching (étape 5, ADR-005).
 *
 * On projette volontairement `Etablissement` et `Equipement` Prisma vers des
 * formes **minimales** pour garder le moteur pur et testable sans Prisma.
 */

export type EtablissementMatching = {
  id: string;
  /**
   * Les travailleurs du SITE, salariés et apprentis — la question posée à la
   * création. C'est le nombre des textes qui comptent l'établissement ou des
   * personnes présentes (R. 4228-22/-23, R. 4227-34).
   */
  effectifSurSite: number;
  /**
   * L'effectif de l'ENTREPRISE (`Entreprise.effectif`), tous établissements
   * confondus, apprentis non compris (L. 1111-2, L. 1111-3 1°). C'est le
   * nombre des seuils que le texte compte sur l'entreprise — CSE, règlement
   * intérieur (`TypologieApplication.effectifMaille`).
   *
   * Requis, pour la raison que portent les champs ci-dessous : une projection
   * qui l'omettrait compilerait, et le moteur retomberait sur un nombre qui
   * n'est pas le sien.
   */
  effectifEntreprise: number;
  estEtablissementTravail: boolean;
  estERP: boolean;
  estIGH: boolean;
  estHabitation: boolean;
  typeErp: TypeErp | null;
  categorieErp: CategorieErp | null;
  classeIgh: ClasseIgh | null;
  /**
   * Famille d'habitation (arrêté du 31 janvier 1986). `null` = non renseignée,
   * ce qui est le cas de tous les dossiers créés avant le 2026-09-01.
   *
   * **Requis dans la projection, comme `personnesPresentesHabituellement` et
   * pour la même raison** : six modules projettent un établissement vers le
   * moteur, et un champ optionnel s'omet sans que rien ne le signale. `null`
   * est une réponse — c'est l'absence de réponse qui est interdite.
   *
   * Contrairement à `categorieErp`, `null` ne fait perdre aucune obligation :
   * le moteur retient et signale « à confirmer » (cf. `evaluerHabitation`).
   */
  familleHabitation: FamilleHabitation | null;
  /**
   * Personnes habituellement présentes, salariés + public + tiers réguliers
   * (R. 4227-34 : « occupées ou réunies habituellement »).
   *
   * `null` ⇒ le moteur ne le remplace par rien. Il en déduit une **borne
   * basse** — la catégorie d'ERP, puis l'effectif salarié — qui ne conclut que
   * vers le haut, et retient l'obligation « à confirmer » quand elle ne conclut
   * pas et que l'établissement reçoit du public (cf.
   * `evaluerPersonnesPresentes`). Jusqu'au 2026-09-02 le silence retombait sur
   * `effectifSurSite` traité comme le total, ce qui retirait en silence la
   * consigne de sécurité incendie et les exercices semestriels à tout ERP.
   *
   * **Requis, et il l'est devenu pour une raison mesurée.** Il était optionnel
   * « pour ne pas casser les projections existantes ». Quatre modules
   * projettent un établissement vers le moteur ; trois omettaient ce champ, et
   * l'omission compilait. Un établissement manipulant des matières R. 4227-22
   * voyait son calendrier engendrer trois obligations incendie quand le guide
   * « Chez vous » n'en annonçait qu'une et que la fiche équipement badgeait
   * « aucune échéance datable ». Faux négatif muet, invisible aux tests.
   *
   * Requis, l'omission ne compile plus, et un cinquième site devra répondre.
   * `null` reste une réponse — c'est l'absence de réponse qui est interdite.
   */
  personnesPresentesHabituellement: number | null;
  /**
   * Manipulation et mise en œuvre de matières visées par R. 4227-22
   * (explosives, comburantes, extrêmement inflammables). `null` ⇒ lu comme
   * « non » : cette branche ne fait qu'ajouter des cas, aucun établissement
   * ne peut perdre une obligation par son silence.
   *
   * Requis pour la même raison que le champ ci-dessus, et par le même
   * incident.
   */
  manipuleMatieresR422722: boolean | null;
  /**
   * L'établissement comporte-t-il, **pour le public**, des locaux à sommeil
   * (arrêté du 25 juin 1980, Livre III — PE 4 § 1, PE 33, PE 35, PE 37) ?
   *
   * **Requis dans la projection, comme `familleHabitation` et
   * `personnesPresentesHabituellement`, et pour la raison qu'ils ont chacun
   * payée** : huit modules projettent un établissement vers le moteur, et un
   * champ optionnel s'omet sans que rien ne le signale. `null` est une
   * réponse — c'est l'absence de réponse qui est interdite.
   *
   * `null` ne fait perdre aucune obligation : le moteur retient et signale
   * « à confirmer » (cf. `evaluerLocauxSommeil`). Il fait en revanche perdre
   * un allègement de régime, ce qui est le même choix vu de l'autre côté.
   */
  comporteLocauxSommeilPublic: boolean | null;
};

export type EquipementMatching = {
  id: string;
  libelle: string;
  categorie: CategorieEquipement;
  caracteristiques: Record<string, unknown> | null;
};

/**
 * Résultat du matching pour une obligation donnée.
 *
 * `equipementsConcernes` est vide pour les obligations dont
 * `categoriesEquipement` contient une catégorie universelle ou quand aucun
 * équipement n'était requis (cas rare ; aucune à ce stade du référentiel).
 * `raisons` est le mode "explain" : liste ordonnée d'explications
 * déterministes, en français, destinées à être affichées en UI ou au support.
 */
export type ObligationApplicable = {
  obligation: Obligation;
  /**
   * Les équipements qui **déclenchent** l'obligation. Vide lorsque le porteur
   * est l'établissement (ADR-022) : la ligne existe alors quand même, et une
   * liste vide n'y signifie pas « aucune ligne ». Lire `porteur` pour trancher,
   * jamais `equipementsConcernes.length`.
   */
  equipementsConcernes: EquipementMatching[];
  /**
   * Sur quoi porte l'échéance à engendrer (ADR-022) — `"equipement"` produit
   * une ligne par entrée d'`equipementsConcernes`, `"etablissement"` en produit
   * exactement une.
   */
  porteur: PorteurObligation;
  raisons: string[];
  /**
   * Surcharges de périodicité imposées par une prescription particulière
   * (ADR-035), par identifiant d'équipement. Absent = périodicité du
   * référentiel pour tous les équipements déclencheurs.
   */
  surcharges?: Record<string, SurchargePeriodicite>;
};

// -----------------------------------------------------------------------------
// Prescriptions particulières (ADR-035)
// -----------------------------------------------------------------------------

export type SurchargePeriodicite = {
  periodicite: Periodicite;
  prescriptionId: string;
  raison: string;
};

/** Projection minimale d'une `PrescriptionParticuliere` active. */
export type PrescriptionMatching = {
  id: string;
  /**
   * `SourcePrescription` et non `string` : la table de libellés de
   * `libelleSource()` est indexée par ce type, donc une source ajoutée à
   * l'enum sans libellé ne compile plus. En `string`, elle retombait
   * silencieusement sur le mot générique « prescription » — et une demande
   * d'assureur s'y serait fondue sans que personne s'en aperçoive.
   */
  source: SourcePrescription;
  effet: "renforce_periodicite" | "obligation_sur_mesure";
  reference: string;
  autorite: string | null;
  dateDocument: Date;
  dateFin: Date | null;
  obligationId: string | null;
  libelle: string | null;
  description: string | null;
  periodicite: Periodicite;
  realisateurRequis: Realisateur[];
  categorieEquipement: CategorieEquipement | null;
  equipementId: string | null;
};

/** Obligation hors référentiel, créée par une prescription `obligation_sur_mesure`. */
export type ObligationSurMesureApplicable = {
  prescription: PrescriptionMatching;
  equipementsConcernes: EquipementMatching[];
  raisons: string[];
};

/** Prescription non appliquée, avec la raison en clair (mode explain). */
export type PrescriptionIgnoree = {
  prescription: PrescriptionMatching;
  raison: string;
};
