"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormulaireTitre } from "./FormulaireTitre";

/**
 * La déclaration d'un titre, dans une modale (refonte de la fiche, 2026-10-24).
 *
 * Le formulaire occupait une carte entière en bas de la fiche, quatorze
 * paragraphes de loi compris. Il s'ouvre désormais à la demande : depuis
 * « Ajouter un titre », ou depuis une ligne qui appelle un geste (« Déclarer »
 * sur ce qui manque, « Renouveler » sur un titre échu), avec ce titre déjà
 * choisi. Une seule modale par fiche : les boutons ne font que l'ouvrir.
 *
 * `<dialog>` natif, comme la fiche de « Ce qui doit être en place »
 * (`RevueEnPlace.tsx`) : le piège du focus, Échap et l'arrière-plan inerte
 * viennent du navigateur.
 */
const Contexte = createContext<{ ouvrir: (obligationId?: string) => void } | null>(null);

type Props = Omit<ComponentProps<typeof FormulaireTitre>, "initial" | "onSucces"> & {
  /** « Clara Martin » : la modale dit pour qui l'on déclare. */
  personne: string;
  children: ReactNode;
};

export function DeclarationTitre({ personne, children, ...formulaire }: Props) {
  const boite = useRef<HTMLDialogElement>(null);
  // Chaque ouverture remonte le formulaire : un état d'erreur ou des dates
  // d'une ouverture précédente ne doivent pas réapparaître sur un autre titre.
  const [ouverture, setOuverture] = useState<{ n: number; initial?: string }>({ n: 0 });

  const ouvrir = useCallback((obligationId?: string) => {
    setOuverture((o) => ({ n: o.n + 1, initial: obligationId }));
    if (!boite.current?.open) boite.current?.showModal?.();
  }, []);
  const fermer = useCallback(() => boite.current?.close(), []);
  // Mémoïsée : sans quoi chaque bouton consommateur se re-rend à l'ouverture.
  const valeur = useMemo(() => ({ ouvrir }), [ouvrir]);

  return (
    <Contexte.Provider value={valeur}>
      {children}
      <dialog
        ref={boite}
        aria-labelledby="modale-titre-intitule"
        onClick={(e) => {
          if (e.target === e.currentTarget) fermer();
        }}
        className="m-auto w-[min(1040px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-auto rounded-[26px] border-0 bg-[color:var(--board-card)] p-0 shadow-[0_24px_64px_-24px_rgba(13,18,36,.45)] backdrop:bg-[rgba(10,10,10,.42)]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-6 py-4 sm:px-8">
          <h2 id="modale-titre-intitule" className="board-titre m-0 text-[20px]">
            Déclarer un titre pour {personne}
          </h2>
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer"
            className="grid size-9 flex-none place-items-center rounded-full text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)] focus-visible:outline-2 focus-visible:outline-[color:var(--board-blue-strong)]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        {ouverture.n > 0 && (
          <FormulaireTitre
            key={ouverture.n}
            {...formulaire}
            initial={ouverture.initial}
            onSucces={fermer}
          />
        )}
      </dialog>
    </Contexte.Provider>
  );
}

function useOuvrir() {
  const c = useContext(Contexte);
  if (!c) throw new Error("Un bouton de déclaration vit sous <DeclarationTitre>.");
  return c.ouvrir;
}

/** « Ajouter un titre » — la modale s'ouvre sans titre choisi. */
export function BoutonAjouterTitre() {
  const ouvrir = useOuvrir();
  return (
    <Button variant="board" size="boardSm" type="button" onClick={() => ouvrir()}>
      <Plus aria-hidden />
      Ajouter un titre
    </Button>
  );
}

/** « Déclarer » ou « Renouveler » sur une ligne : la modale s'ouvre sur ce titre. */
export function BoutonDeclarer({
  obligationId,
  children,
  plein = false,
}: {
  obligationId: string;
  children: ReactNode;
  /** Le bouton plein, quand la ligne est en retard : c'est le geste attendu. */
  plein?: boolean;
}) {
  const ouvrir = useOuvrir();
  return (
    <Button
      variant={plein ? "board" : "boardClair"}
      size="boardSm"
      type="button"
      onClick={() => ouvrir(obligationId)}
    >
      {children}
    </Button>
  );
}
