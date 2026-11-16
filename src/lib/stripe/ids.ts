// L'identifiant d'un objet Stripe, qu'il soit développé ou non. Module
// feuille : parcours.ts et synchronisation.ts le lisent sans s'importer
// l'un l'autre (revue du 2026-11-16, import circulaire).
export const idStripe = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));
