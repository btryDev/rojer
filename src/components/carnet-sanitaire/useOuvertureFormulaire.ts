"use client";

import { useState } from "react";
import type { CarnetActionState } from "@/lib/carnet-sanitaire/actions";

/**
 * Ouvert ou replié : l'état des trois formulaires du carnet sanitaire.
 *
 * Une CORRECTION réussie referme le formulaire — la carte montre le résultat.
 * Une saisie réussie ne le referme pas : on enchaîne les relevés.
 *
 * La fermeture se décide pendant le rendu, à l'arrivée d'un NOUVEL état
 * d'action (motif « ajuster un état quand une entrée change » de React) et
 * non dans un effet : un `useEffect` qui appelait `setOuvert(false)` coûtait
 * un rendu de plus avec le formulaire encore ouvert
 * (`react-hooks/set-state-in-effect`). Comparer l'état à celui déjà vu, et
 * non tester seulement `status === "success"`, garde ouvert un formulaire
 * rouvert après une correction réussie : ce succès-là est déjà consommé.
 */
export function useOuvertureFormulaire(
  state: CarnetActionState,
  correction: boolean,
) {
  const [ouvert, setOuvert] = useState(false);
  const [etatVu, setEtatVu] = useState(state);
  if (state !== etatVu) {
    setEtatVu(state);
    if (correction && state.status === "success") setOuvert(false);
  }
  return [ouvert, setOuvert] as const;
}
