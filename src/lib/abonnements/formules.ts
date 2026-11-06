// Les formules d'abonnement (ADR-053 § 11), comme les référentiels : du
// TypeScript versionné (ADR-003). Une formule = des quotas ; toutes donnent
// accès à tout Rojer. Les PRIX restent chez Stripe, qui les facture : ce
// fichier n'en porte aucun.
//
// La formule d'un compte se lit sur la `lookup_key` du prix de son abonnement
// Stripe (`Abonnement.formule`, recopiée par le webhook) :
// `rojer_<formule>_<periodicite>`. Une clé inconnue ne donne aucune formule.
//
// CATALOGUE : grille arrêtée avec la propriétaire le 2026-11-05
// (`docs/marketing/rojer-offres-abonnement-2026-11.pdf`, branche
// `docs/offres-abonnement`, ab9caea3) ; les limites propres à l'essai n'y
// sont pas encore.
// « Sur mesure » se vend sur devis : il n'a pas de clé en libre-service.

export const PERIODICITES = ["mensuel", "annuel"] as const;
export type Periodicite = (typeof PERIODICITES)[number];

/** Ce que l'écran dit d'une périodicité : « facturation mensuelle », « par mois ». */
export const LIBELLE_PERIODICITE = {
  mensuel: { adjectif: "mensuelle", unite: "mois" },
  annuel: { adjectif: "annuelle", unite: "an" },
} as const satisfies Record<Periodicite, { adjectif: string; unite: string }>;

/** L'intervalle Stripe d'une périodicité (prix récurrent). */
export const INTERVALLE_STRIPE = { mensuel: "month", annuel: "year" } as const satisfies Record<Periodicite, string>;

/**
 * `null` : illimité. Les plafonds « par an » repartent à la date anniversaire
 * du premier abonnement payant du compte, comptés dans un journal que rien
 * n'efface (ADR-053 § 14).
 * `membres` compte aussi les invitations en attente.
 */
export type Quotas = {
  etablissements: number | null;
  membres: number | null;
  /** Sans limite dans les formules payantes ; bornés pendant l'essai (`LIMITES_ESSAI`). */
  equipements: number | null;
  unitesTravail: number | null;
  zones: number | null;
  prescriptions: number | null;
  permisDeFeuParAn: number | null;
  plansDePreventionParAn: number | null;
  prestataires: number | null;
  liensAccesActifs: number | null;
  signaturesParAn: number | null;
  stockageGo: number | null;
  importsDuerp: number | null;
  connecterUnAssistant: boolean;
  heuresExpertParAn: number;
};

export type Formule = { libelle: string; pourQui: string; quotas: Quotas };

export const FORMULES = {
  essentiel: {
    libelle: "Essentiel",
    pourQui: "Un seul site",
    quotas: {
      etablissements: 1,
      membres: 1,
      equipements: null,
      unitesTravail: null,
      zones: null,
      prescriptions: null,
      permisDeFeuParAn: 10,
      plansDePreventionParAn: 5,
      prestataires: 10,
      liensAccesActifs: 5,
      signaturesParAn: 20,
      stockageGo: 2,
      importsDuerp: 1,
      connecterUnAssistant: false,
      heuresExpertParAn: 0,
    },
  },
  pro: {
    libelle: "Pro",
    pourQui: "Plusieurs sites ou plusieurs personnes",
    quotas: {
      etablissements: 5,
      membres: 5,
      equipements: null,
      unitesTravail: null,
      zones: null,
      prescriptions: null,
      permisDeFeuParAn: 30,
      plansDePreventionParAn: 15,
      prestataires: 30,
      liensAccesActifs: 15,
      signaturesParAn: 60,
      stockageGo: 6,
      importsDuerp: 3,
      connecterUnAssistant: true,
      heuresExpertParAn: 1,
    },
  },
} as const satisfies Record<string, Formule>;

export type CleFormule = keyof typeof FORMULES;

/**
 * Les limites de l'essai gratuit (grille du 2026-11-05), qui priment sur la
 * formule essayée ; le reste suit ses volumes. Unités de travail comptées
 * hors « Risques transverses », comme l'ADR-033.
 */
export const LIMITES_ESSAI = {
  etablissements: 1,
  membres: 1,
  unitesTravail: 3,
  zones: 1,
  equipements: 5,
  prescriptions: 1,
  // « Valider = s'abonner » (ADR-053 § 15) : une signature de test, comptée
  // par la porte, sous le verrou du compte.
  signaturesParAn: 1,
} as const satisfies Partial<Quotas>;
/** De la plus petite à la plus grande : la première est celle du refus par défaut. */
export const CLES_FORMULES = Object.keys(FORMULES) as CleFormule[];

/** La `lookup_key` du prix Stripe d'une formule et d'une périodicité. */
export const lookupKey = (formule: CleFormule, periodicite: Periodicite) => `rojer_${formule}_${periodicite}`;

/** Toutes les clés à demander à Stripe pour afficher les prix. */
export const LOOKUP_KEYS = CLES_FORMULES.flatMap((f) => PERIODICITES.map((p) => lookupKey(f, p)));

const estCle = (v: string): v is CleFormule => Object.hasOwn(FORMULES, v);

/** La formule et la périodicité d'une `lookup_key`, ou `null` si Rojer ne la connaît pas. */
export function formuleDeLookupKey(cle: string | null | undefined): { formule: CleFormule; periodicite: Periodicite } | null {
  const m = /^rojer_([a-z]+)_(mensuel|annuel)$/.exec(cle ?? "");
  if (!m || !estCle(m[1])) return null;
  return { formule: m[1], periodicite: m[2] as Periodicite };
}

/** Une clé de notre catalogue, et rien d'autre (une valeur reçue du navigateur). */
export const estLookupKey = (v: unknown): v is string => typeof v === "string" && formuleDeLookupKey(v) !== null;

/**
 * La formule d'un prix Stripe : sa `lookup_key`, ou à défaut celle que ses
 * `metadata` désignent. Un prix remplacé perd sa clé (`transfer_lookup_key`) ;
 * ses abonnés restent sur lui, et leur formule ne doit pas disparaître.
 */
export function formuleDuPrix(prix: { lookup_key: string | null; metadata?: Record<string, string> | null }): string | null {
  const deMetadata = `rojer_${prix.metadata?.formule}_${prix.metadata?.periodicite}`;
  return [prix.lookup_key, deMetadata].find(estLookupKey) ?? null;
}

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Ce qu'un plafond appliqué compte, dit au dirigeant (ADR-053 § 14). */
export const LIBELLES_PLAFONDS = {
  etablissements: (n: number) => pluriel(n, "établissement", "établissements"),
  membres: (n: number) => pluriel(n, "utilisateur", "utilisateurs"),
  equipements: (n: number) => pluriel(n, "équipement", "équipements"),
  unitesTravail: (n: number) => pluriel(n, "unité de travail", "unités de travail"),
  zones: (n: number) => pluriel(n, "zone", "zones"),
  prescriptions: (n: number) => pluriel(n, "prescription particulière", "prescriptions particulières"),
  prestataires: (n: number) => pluriel(n, "prestataire", "prestataires"),
  permisDeFeuParAn: (n: number) => `${pluriel(n, "permis de feu", "permis de feu")} par an`,
  plansDePreventionParAn: (n: number) => `${pluriel(n, "plan de prévention", "plans de prévention")} par an`,
  liensAccesActifs: (n: number) => pluriel(n, "lien d'accès actif", "liens d'accès actifs"),
  signaturesParAn: (n: number) => `${pluriel(n, "signature", "signatures")} par an`,
  importsDuerp: (n: number) => `${pluriel(n, "import de DUERP", "imports de DUERP")} par an`,
  stockageGo: (n: number) => `${n} Go de stockage`,
} as const satisfies Partial<Record<keyof Quotas, (n: number) => string>>;

/** Ce qui distingue une formule à l'écran, tiré des quotas — rien de non livré. */
export function pointsDeFormule(f: CleFormule): string[] {
  const q: Quotas = FORMULES[f].quotas;
  const usage =
    q.permisDeFeuParAn === null
      ? "Permis de feu et plans de prévention sans limite"
      : `${q.permisDeFeuParAn} permis de feu et ${q.plansDePreventionParAn ?? "∞"} plans de prévention par an`;
  return [
    q.etablissements === null ? "Établissements sans limite" : LIBELLES_PLAFONDS.etablissements(q.etablissements),
    q.membres === null ? "Utilisateurs sans limite" : LIBELLES_PLAFONDS.membres(q.membres),
    "Tous les modules de Rojer",
    usage,
  ];
}
