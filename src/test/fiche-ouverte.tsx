// Ouvrir la fiche de « Ce qui doit être en place » sur UNE ligne, pour les
// tests qui vérifient ce qu'elle dit (2026-10-21 : remplace `LigneEtat`,
// retirée de l'écran par la fiche `RevueEnPlace`). Environnement jsdom requis.
// Rangé sous `src/test/` : hors des chemins que les gardes de source lisent
// comme du code d'écran.

import { fireEvent, render } from "@testing-library/react";
import {
  RevueEnPlace,
  useOuvrirFiche,
  type FicheLigne,
} from "@/components/etats-permanents/RevueEnPlace";

// jsdom ne connaît pas `showModal` / `close` : on les réduit à l'attribut.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

function Ouvrir({ id }: { id: string }) {
  const ouvrir = useOuvrirFiche();
  return (
    <button type="button" onClick={() => ouvrir(id)}>
      ouvrir la fiche
    </button>
  );
}

/** Rend la fiche de `fiche`, ouverte. `boite` est le `<dialog>`. */
export function rendreFicheOuverte(fiche: FicheLigne) {
  const r = render(
    <RevueEnPlace etablissementId="etab-1" lignes={[fiche]}>
      <Ouvrir id={fiche.obligationId} />
    </RevueEnPlace>,
  );
  fireEvent.click(r.getByRole("button", { name: "ouvrir la fiche" }));
  return { ...r, boite: r.container.querySelector("dialog")! };
}
