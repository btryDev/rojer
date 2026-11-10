/**
 * Un sémaphore de processus, borné en places, en file et en attente, avec une
 * part par demandeur (audit de sécurité du 2026-11-10). Sans dépendance : les
 * exports (`exports/limite.ts`) et la vérification publique des signatures
 * (`signatures/verification-publique.ts`) en ont chacun un.
 *
 * Ce n'est pas un ordonnanceur : rien n'est conservé entre deux requêtes, et
 * une file pleine se dit au lieu de grossir.
 */

export type Liberer = () => void;

export type Limiteur = {
  /**
   * Une place, ou `null` si la file est pleine, l'attente trop longue, ou si
   * le demandeur `cle` tient déjà sa part (`parDemandeurMax`).
   */
  reserver(cle?: string): Promise<Liberer | null>;
  /** Le demandeur `cle` tient-il déjà toute sa part ? (lu juste avant `reserver`, sans attente entre les deux) */
  partAtteinte(cle: string): boolean;
  etat(): { actifs: number; enAttente: number };
};

export function creerLimiteur(options: {
  simultanes: number;
  enAttenteMax: number;
  attenteMaxMs: number;
  /** Réservations (en cours + en attente) par demandeur ; sans clé, pas de part. */
  parDemandeurMax?: number;
}): Limiteur {
  let actifs = 0;
  const file: { reveiller: () => void }[] = [];
  const parDemandeur = new Map<string, number>();

  const prendre = (cle: string | undefined) => {
    if (cle !== undefined) parDemandeur.set(cle, (parDemandeur.get(cle) ?? 0) + 1);
  };
  const rendre = (cle: string | undefined) => {
    if (cle === undefined) return;
    const n = (parDemandeur.get(cle) ?? 1) - 1;
    if (n > 0) parDemandeur.set(cle, n);
    else parDemandeur.delete(cle);
  };

  // La place se TRANSMET au suivant de la file sans repasser par `actifs` :
  // un export qui arrive entre la libération et le réveil ne la prend pas.
  const liberateur = (cle: string | undefined): Liberer => {
    let libere = false;
    return () => {
      if (libere) return;
      libere = true;
      rendre(cle);
      const suivant = file.shift();
      if (suivant) suivant.reveiller();
      else actifs--;
    };
  };

  const partAtteinte = (cle: string) =>
    options.parDemandeurMax !== undefined && (parDemandeur.get(cle) ?? 0) >= options.parDemandeurMax;

  return {
    partAtteinte,
    async reserver(cle) {
      if (cle !== undefined && partAtteinte(cle)) return null;
      if (actifs < options.simultanes) {
        actifs++;
        prendre(cle);
        return liberateur(cle);
      }
      if (file.length >= options.enAttenteMax) return null;
      prendre(cle);
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
      if (!servi) {
        rendre(cle);
        return null;
      }
      return liberateur(cle);
    },
    etat: () => ({ actifs, enAttente: file.length }),
  };
}
