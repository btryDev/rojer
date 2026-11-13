// La borne de tas du processus de rendu, contrôlée par l'enfant avant tout
// rendu (lot pdf-b1, ADR-059). Pur, pour ses tests ; sans dépendance, pour
// le paquet de l'enfant.

/**
 * Écart toléré entre la limite que V8 annonce (`heap_size_limit`) et le tas
 * demandé. V8 y ajoute la jeune génération, constante pour une version :
 * mesuré le 2026-11-10, + 48 Mo sous Node 22, + 192 Mo sous Node 24 (que
 * Clever Cloud prend), de 32 à 2 048 Mo demandés. Ce contrôle n'attrape
 * qu'un écart grossier (1 310 Mo pour 64 avec un `worker_thread`) ; le
 * contrôle exact est celui du drapeau (`drapeauQuiLEmporte`).
 */
export const ECART_TOLERE_MO = 256;

const DRAPEAU = /--max[-_]old[-_]space[-_]size=(\d+)/g;

/**
 * La valeur de `--max-old-space-size` qui s'applique : la DERNIÈRE vue, les
 * options de `NODE_OPTIONS` étant lues avant les arguments de la commande
 * (le drapeau en argument l'emporte, éprouvé le 2026-11-10). `null` si
 * aucun n'est posé.
 */
export function drapeauQuiLEmporte(execArgv: readonly string[], nodeOptions: string | undefined): number | null {
  const valeurs = [nodeOptions ?? "", ...execArgv].flatMap((s) => [...s.matchAll(DRAPEAU)].map((m) => Number(m[1])));
  return valeurs.length > 0 ? valeurs[valeurs.length - 1] : null;
}

/** Le problème de borne, s'il y en a un ; `null` si elle est tenue. */
export function problemeDeBorne(contexte: {
  tasMaxMo: number;
  execArgv: readonly string[];
  nodeOptions: string | undefined;
  limiteMo: number;
}): string | null {
  const { tasMaxMo, limiteMo } = contexte;
  if (!Number.isInteger(tasMaxMo) || tasMaxMo < 1) return `tas demandé illisible (${tasMaxMo})`;
  const drapeau = drapeauQuiLEmporte(contexte.execArgv, contexte.nodeOptions);
  if (drapeau !== tasMaxMo) return `drapeau ${drapeau ?? "absent"} pour ${tasMaxMo} Mo demandés`;
  if (limiteMo > tasMaxMo + ECART_TOLERE_MO) {
    return `${Math.round(limiteMo)} Mo de limite pour ${tasMaxMo} demandés`;
  }
  return null;
}
