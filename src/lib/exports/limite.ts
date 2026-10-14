import "server-only";

/**
 * Combien d'exports (PDF, ZIP de contrôle) le processus mène de front
 * (audit Next.js du 2026-10-14, H3).
 *
 * LA CAUSE. La mise en page `@react-pdf` est du calcul synchrone : pendant
 * qu'elle tourne, la boucle d'événements ne sert personne d'autre — mesuré
 * jusqu'à 250 ms d'un tenant par PDF, 470 ms avec quatre ZIP lancés ensemble
 * (`scripts/mesure-exports.ts`). Et quatre ZIP construits ensemble montaient
 * le processus à 1,8 Go. Sur Vercel chaque requête a son instance ; sur un
 * Node permanent à une instance (Clever Cloud), tous les utilisateurs
 * partagent cette boucle et cette mémoire.
 *
 * LE REMÈDE ICI. Un sémaphore de processus, partagé par toutes les routes
 * d'export : au plus `EXPORTS_SIMULTANES` exports à la fois, quelques-uns en
 * file, et au-delà une réponse 503 avec `Retry-After` — l'utilisateur
 * réessaie, le serveur reste disponible pour les autres. Sur Vercel, chaque
 * instance a le sien : sans danger, et sans effet.
 *
 * Ce n'est pas un ordonnanceur : rien n'est conservé entre deux requêtes, et
 * une file pleine se dit au lieu de grossir.
 */

/** Exports menés de front par défaut, sans `EXPORTS_SIMULTANES`. */
export const EXPORTS_SIMULTANES_DEFAUT = 2;
/** Exports en file, au-delà desquels on répond 503 tout de suite. */
export const EXPORTS_EN_ATTENTE_MAX = 8;
/** Attente maximale en file avant 503, en millisecondes. */
export const ATTENTE_EXPORT_MAX_MS = 20_000;
/** Ce que dit `Retry-After`, en secondes. */
export const REESSAYER_APRES_S = 5;

/** La valeur de `EXPORTS_SIMULTANES` : un entier ≥ 1, sinon le défaut. */
export function exportsSimultanes(valeur = process.env.EXPORTS_SIMULTANES): number {
  const n = Number(valeur);
  return Number.isInteger(n) && n >= 1 ? n : EXPORTS_SIMULTANES_DEFAUT;
}

export type Liberer = () => void;

export type Limiteur = {
  /** Une place, ou `null` si la file est pleine ou l'attente trop longue. */
  reserver(): Promise<Liberer | null>;
  etat(): { actifs: number; enAttente: number };
};

export function creerLimiteur(options: {
  simultanes: number;
  enAttenteMax: number;
  attenteMaxMs: number;
}): Limiteur {
  let actifs = 0;
  const file: { reveiller: () => void }[] = [];

  // La place se TRANSMET au suivant de la file sans repasser par `actifs` :
  // un export qui arrive entre la libération et le réveil ne la prend pas.
  const liberateur = (): Liberer => {
    let libere = false;
    return () => {
      if (libere) return;
      libere = true;
      const suivant = file.shift();
      if (suivant) suivant.reveiller();
      else actifs--;
    };
  };

  return {
    async reserver() {
      if (actifs < options.simultanes) {
        actifs++;
        return liberateur();
      }
      if (file.length >= options.enAttenteMax) return null;
      const servi = await new Promise<boolean>((resolve) => {
        const attente = {
          reveiller: () => {
            clearTimeout(minuteur);
            resolve(true);
          },
        };
        const minuteur = setTimeout(() => {
          const i = file.indexOf(attente);
          if (i !== -1) file.splice(i, 1);
          resolve(false);
        }, options.attenteMaxMs);
        file.push(attente);
      });
      return servi ? liberateur() : null;
    },
    etat: () => ({ actifs, enAttente: file.length }),
  };
}

/** Le limiteur du processus, partagé par toutes les routes d'export. */
const limiteur = creerLimiteur({
  simultanes: exportsSimultanes(),
  enAttenteMax: EXPORTS_EN_ATTENTE_MAX,
  attenteMaxMs: ATTENTE_EXPORT_MAX_MS,
});

/** La réponse d'une file pleine. */
export function reponseExportsSatures(): Response {
  return new Response(
    "Trop d'exports sont en cours de préparation. Réessayez dans quelques secondes.",
    {
      status: 503,
      headers: {
        "Retry-After": String(REESSAYER_APRES_S),
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Une place d'export, à libérer quand le travail lourd est fini — ou la
 * réponse 503 à rendre telle quelle. À appeler APRÈS les contrôles d'accès :
 * une requête refusée ne doit pas occuper la file.
 */
export async function reserverPlaceExport(
  l: Limiteur = limiteur,
): Promise<Liberer | Response> {
  return (await l.reserver()) ?? reponseExportsSatures();
}
