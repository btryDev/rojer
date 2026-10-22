"use client";

// Une famille de « Ce qui doit être en place », repliée par défaut (2026-10-20,
// demande de la propriétaire : les familles hors incendie et secours en menu
// déroulant). L'en-tête — dessin, titre, compte — reste toujours visible ; les
// lignes se déplient au clic.
//
// Le titre est un h2 qui CONTIENT le bouton (et non l'inverse : un titre dans
// un bouton n'est plus un titre pour un lecteur d'écran). Le compte est un
// enfant direct du bandeau : le test du widget le lit en `section > div > p`.
//
// Une ancre qui vise une ligne repliée (lien du widget, `#etat-…`) ouvre la
// famille à l'arrivée : sinon le saut viserait un élément caché.

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function BandeauRepliable({
  id,
  titre,
  compte,
  fond,
  dessin,
  focusable,
  classeSection,
  children,
}: {
  id: string;
  titre: string;
  /** « x sur n », éventuellement précédé d'un sous-titre. */
  compte: string;
  fond: string;
  dessin: string | null;
  focusable: boolean;
  classeSection: string;
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  // La ligne visée par l'ancre, à amener à l'écran une fois la famille
  // ouverte : le saut du navigateur a eu lieu quand elle était encore cachée
  // (revue du 2026-10-21). Une ref, pas un état : rien à rendre.
  const ligneVisee = useRef<HTMLElement | null>(null);
  const contenu = useRef<HTMLDivElement>(null);
  const idContenu = useId();

  useEffect(() => {
    const viser = () => {
      const cible = window.location.hash.slice(1);
      if (!cible) return;
      if (cible === id) return setOuvert(true);
      const ligne = contenu.current?.querySelector<HTMLElement>(`[id="${CSS.escape(cible)}"]`);
      if (!ligne) return;
      // Déjà ouverte : le navigateur a sauté juste, rien à faire de plus.
      if (contenu.current?.hidden === false) return;
      ligneVisee.current = ligne;
      setOuvert(true);
    };
    viser();
    window.addEventListener("hashchange", viser);
    return () => window.removeEventListener("hashchange", viser);
  }, [id]);

  useEffect(() => {
    const ligne = ligneVisee.current;
    if (!ouvert || !ligne) return;
    ligneVisee.current = null;
    ligne.scrollIntoView?.({ block: "center" });
    ligne.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, [ouvert]);

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titre`}
      tabIndex={focusable ? -1 : undefined}
      className={classeSection}
    >
      <div
        className="flex cursor-pointer items-center gap-4 rounded-[30px] px-5 py-3.5"
        style={{ background: fond }}
        onClick={(e) => {
          // Le bouton gère lui-même son clic ; ailleurs dans le bandeau, même effet.
          if (!(e.target as HTMLElement).closest("button")) setOuvert((o) => !o);
        }}
      >
        {dessin && <Image src={dessin} alt="" width={56} height={56} className="flex-none" />}
        <h2 id={`${id}-titre`} className="board-titre m-0 min-w-0 flex-1 text-[20px]">
          <button
            type="button"
            aria-expanded={ouvert}
            aria-controls={idContenu}
            onClick={() => setOuvert((o) => !o)}
            className="w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--board-blue-strong)]"
          >
            {titre}
          </button>
        </h2>
        <p className="m-0 flex-none text-[12.5px] tabular-nums text-[color:var(--board-slate-mid)]">{compte}</p>
        <ChevronDown
          aria-hidden
          className={["size-5 flex-none text-[color:var(--board-slate-mid)] transition-transform", ouvert && "rotate-180"]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
      <div ref={contenu} id={idContenu} hidden={!ouvert} className="flex-col gap-3 [&:not([hidden])]:flex">
        {children}
      </div>
    </section>
  );
}
