"use client";

import Image from "next/image";
import { useEffect, useId } from "react";
import { Button } from "@/components/ui/button";

/**
 * La fenêtre d'accueil de la mise en place (2026-11-11, décision de la
 * propriétaire) : avant la première question, dire ce qui vient et combien
 * de temps ça prend. Elle s'ouvre sur le parcours flouté derrière elle, et
 * « Commencer » la referme sur l'étape 1 — le parcours continue la fenêtre.
 *
 * Pas `PanneauModal` : son en-tête (sur-titre + titre + croix) ne laisse
 * pas place au bandeau qui porte le titre et le dessin côte à côte. Même
 * comportement pour le reste : Échap ferme, le focus est posé dedans, et sur
 * téléphone la fenêtre monte du bas. Rendue en place et non en portail :
 * elle s'affiche dès le rendu serveur, sans flash du formulaire nu. Tout le
 * reste de la page étant `inert`, on n'y saisit rien ; mais le focus peut
 * retomber sur `<body>` (un clic hors du bouton), donc Échap s'écoute sur
 * `document`. Un clic sur le voile ferme aussi, comme `PanneauModal`, et la
 * page ne défile pas derrière tant que la fenêtre est ouverte.
 */
export function AccueilParcours({ surCommencer }: { surCommencer: () => void }) {
  const titreId = useId();

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") surCommencer();
    };
    document.addEventListener("keydown", surTouche);
    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = debordement;
    };
  }, [surCommencer]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titreId}
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4"
    >
      <div
        aria-hidden
        onClick={surCommencer}
        className="absolute inset-0 bg-[rgba(13,18,36,.28)] backdrop-blur-[6px]"
      />
      <div className="relative max-h-[92dvh] w-full max-w-[600px] overflow-y-auto overscroll-contain rounded-t-[26px] bg-[color:var(--board-card)] shadow-[0_0_0_1px_rgba(13,18,36,.06),0_24px_60px_-24px_rgba(13,18,36,.45)] md:rounded-[26px]">
        {/* Le titre et le dessin dans le bandeau bleu de marque (décision de
            la propriétaire, 2026-11-11) : le bâtiment, blanc à liseré bleu
            comme l'illustration de la landing, à droite ; le titre à gauche,
            « votre établissement » d'un seul tenant. Le dessin est l'emblème
            d'un lieu, pas un portrait du vôtre : décoratif. */}
        <div className="flex h-[180px] items-center gap-4 overflow-hidden bg-[color:var(--board-sky)] px-5 md:h-[210px] md:gap-7 md:px-9">
          <h1
            id={titreId}
            className="board-titre m-0 flex-none text-[22px] md:text-[25px]"
          >
            {/* L'espace garde au nom lu « place votre » ses deux mots. */}
            Mettez en place{" "}
            <br />
            <span className="whitespace-nowrap">votre établissement</span>
          </h1>
          {/* Le filet sépare le titre du dessin, à la hauteur du titre. */}
          <span
            aria-hidden
            className="h-12 w-px flex-none bg-[color:var(--board-blue-ink)] opacity-40 md:h-14"
          />
          {/* Le dessin tient entier dans le bandeau, socle compris : la
              hauteur le borne, quel que soit le format de la planche. */}
          <div className="flex min-w-0 flex-1 items-center justify-center self-stretch py-4">
            <Image
              src="/illustrations/batiments/restaurant.webp"
              alt=""
              // Les dimensions de ce fichier : à changer avec la planche.
              width={1000}
              height={901}
              preload
              sizes="(min-width: 768px) 200px, 140px"
              className="max-h-full w-auto object-contain"
            />
          </div>
        </div>
        <div className="flex flex-col gap-6 px-5 pb-[calc(22px+env(safe-area-inset-bottom,0px))] pt-6 md:px-9 md:pb-8 md:pt-7">
          <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Quelques informations essentielles, en trois étapes : comptez
            environ 5 minutes. Rojer en déduit les obligations qui s&apos;y
            appliquent et prépare votre calendrier.
          </p>
          <div className="flex flex-col-reverse items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-center text-[12.5px] leading-[1.5] text-[color:var(--board-slate-soft)] md:text-left">
              Rien n&apos;est enregistré avant la dernière étape.
            </span>
            <Button
              type="button"
              variant="board"
              size="board"
              autoFocus
              onClick={surCommencer}
              className="h-12 flex-none px-7 text-[14.5px]"
            >
              Commencer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
