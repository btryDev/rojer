// Les formules d'abonnement (ADR-053 § 11), comme les référentiels : du
// TypeScript versionné (ADR-003). Une formule = des quotas ; toutes donnent
// accès à tout Rojer. Les PRIX restent chez Stripe, qui les facture : ce
// fichier n'en porte aucun.
//
// La formule d'un compte se lit sur la `lookup_key` du prix de son abonnement
// Stripe (`Abonnement.formule`, recopiée par le webhook) :
// `rojer_<formule>_<periodicite>`. Une clé inconnue ne donne aucune formule.
//
// CATALOGUE PROVISOIRE : repris de la proposition du 2026-11-03
// (`docs/marketing/benchmark-offres-abonnement-2026-11.md`, branche
// `docs/offres-abonnement`), pas encore arrêté par la propriétaire.
// « Sur mesure » se vend sur devis : il n'a pas de clé en libre-service.

export const PERIODICITES = ["mensuel", "annuel"] as const;
export type Periodicite = (typeof PERIODICITES)[number];

/** `null` : illimité. Les compteurs « par an » repartent à la date anniversaire. */
export type Quotas = {
  etablissements: number | null;
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
      permisDeFeuParAn: null,
      plansDePreventionParAn: null,
      prestataires: 50,
      liensAccesActifs: 50,
      signaturesParAn: 200,
      stockageGo: 20,
      importsDuerp: null,
      connecterUnAssistant: true,
      heuresExpertParAn: 1,
    },
  },
} as const satisfies Record<string, Formule>;

export type CleFormule = keyof typeof FORMULES;
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

/**
 * Peut-on créer un élément de plus ? `quota` nul : illimité. Au quota, seule
 * la création est refusée : ce qui existe reste lisible, exportable, suivi.
 */
export const sousLeQuota = (quota: number | null, dejaUtilises: number) => quota === null || dejaUtilises < quota;
