import "server-only";

// La garde des déclarations de « Ce qui doit être en place », tirée de
// `actions.ts` le 2026-11-05 : le dépôt d'un fichier (ADR-056) en a besoin, et
// un module `"use server"` ne doit exporter que des actions — une fonction
// exportée y devient appelable par une requête.

import type { Db } from "@/lib/auth/compte";
import { etabliParLesTitres } from "./par-les-titres";
import { etabliParLeParc } from "./par-le-parc";
import { obligationParId } from "@/lib/referentiels/conformite";
import { modeDeclarationApplique } from "./regle";
import {
  determineObligationsApplicables,
  projeterEtablissement,
  type EtablissementMatching,
} from "@/lib/matching";

export type Declarabilite =
  | { statut: false }
  | { statut: "etabli_par_les_titres" }
  | { statut: "etabli_par_le_parc" }
  | { statut: true; projete: EtablissementMatching };

/**
 * Vérifie que l'obligation existe ET qu'elle relève bien de cet écran, **pour
 * cet établissement-là**.
 *
 * Sans ce contrôle, un formulaire trafiqué pourrait déclarer « en place » une
 * échéance récurrente ou une obligation événementielle — c'est-à-dire écrire en
 * base une affirmation que l'écran n'a jamais proposée, et que rien ensuite ne
 * viendrait contredire. Le garde-fou est ici et non dans le composant : une
 * validation qui vit dans le rendu n'est pas une validation.
 *
 * ## Pourquoi la garde a dû devenir asynchrone
 *
 * Sa première version appelait `modeDeclaration(o)` sur la seule obligation du
 * référentiel, sans l'établissement. Elle ignorait donc les **surcharges de
 * prescription** : une obligation `etat_permanent` à qui un arrêté préfectoral
 * donne un rythme quitte cet écran pour le calendrier, mais un POST forgé
 * passait la garde et écrivait une ligne que l'écran n'affichera jamais.
 *
 * Aucun franchissement de compte — `assertEtablissementOwnership` tient ce
 * plan-là. Mais c'était **la double surface que le commentaire de ce module
 * prétend empêcher**, atteignable par requête directe. Une garde qui protège
 * d'un formulaire trafiqué et cède à une requête forgée ne garde rien : les
 * deux sont le même geste.
 *
 * Le coût est une passe de matching par déclaration. C'est une action
 * utilisateur, pas une boucle de rendu, et la garde ne peut pas être juste sans
 * connaître le dossier.
 */
export async function obligationDeclarable(
  db: Db,
  etablissementId: string,
  obligationId: string,
): Promise<Declarabilite> {
  if (!obligationParId(obligationId)) return { statut: false };

  const etablissement = await db.etablissement.findUnique({
    where: { id: etablissementId },
    include: { entreprise: { select: { effectif: true } } },
  });
  if (!etablissement) return { statut: false };

  const equipements = await db.equipement.findMany({
    where: { etablissementId, actif: true },
    select: { id: true, libelle: true, categorie: true, caracteristiques: true },
  });

  const projete = projeterEtablissement(etablissement);
  const applicables = determineObligationsApplicables(
    projete,
    equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<
        string,
        unknown
      > | null,
    })),
  );

  const app = applicables.find((a) => a.obligation.id === obligationId);
  // Non applicable à ce dossier : la déclarer n'aurait aucun sens, et l'écran
  // ne l'a jamais montrée. C'est un second cas que l'ancienne garde laissait
  // passer, celui-là sans même invoquer une surcharge.
  if (!app) return { statut: false };

  const mode = modeDeclarationApplique(app);
  if (mode === null) return { statut: false };
  // Établie d'après les titres déclarés : elle ne se coche pas, une case à
  // côté des titres referait deux vérités. LE prédicat de la lecture
  // (`etabliParLesTitres`), pas un voisin (revue du 2026-10-16).
  if (etabliParLesTitres(app.obligation, mode.mode)) {
    return { statut: "etabli_par_les_titres" };
  }
  // Établie d'après le parc (ADR-057 § 4) : même raison, l'appareil déclaré
  // fait foi. LE prédicat de la lecture (`etabliParLeParc`). La seule
  // déclaration qu'une telle ligne admet encore — le DAE partagé — passe par
  // sa propre action (`basculerDaePartage`), qui lit la table.
  if (etabliParLeParc(app.obligation, mode.mode)) {
    return { statut: "etabli_par_le_parc" };
  }
  return { statut: true, projete };
}

