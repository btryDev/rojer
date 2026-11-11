"use client";

import Image from "next/image";
import { useId } from "react";
import { Button } from "@/components/ui/button";

/**
 * La fenêtre d'accueil de la mise en place (2026-11-11, décision de la
 * propriétaire) : avant la première question, dire ce qui vient et combien
 * de temps ça prend. Elle s'ouvre sur le parcours flouté derrière elle, et
 * « Commencer » la referme sur l'étape 1 — le parcours continue la fenêtre.
 *
 * Pas `PanneauModal` : son en-tête (sur-titre + titre + croix) et son
 * rembourrage ne laissent pas l'illustration aller bord à bord. Même
 * comportement pour le reste : Échap ferme, le focus est posé dedans, et sur
 * téléphone la fenêtre monte du bas. Rendue en place et non en portail :
 * elle s'affiche dès le rendu serveur, sans flash du formulaire nu. Tout le
 * reste de la page étant `inert`, le focus ne peut pas en sortir : Échap se
 * lit sur la fenêtre elle-même, sans écouteur sur `document`.
 */
export function AccueilParcours({ surCommencer }: { surCommencer: () => void }) {
  const titreId = useId();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titreId}
      onKeyDown={(e) => {
        if (e.key === "Escape") surCommencer();
      }}
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[rgba(13,18,36,.28)] backdrop-blur-[6px]"
      />
      <div className="relative max-h-[92dvh] w-full max-w-[600px] overflow-y-auto overscroll-contain rounded-t-[26px] bg-[color:var(--board-card)] shadow-[0_0_0_1px_rgba(13,18,36,.06),0_24px_60px_-24px_rgba(13,18,36,.45)] md:rounded-[26px]">
        {/* Le dessin est l'emblème d'un lieu, pas un portrait du vôtre :
            décoratif, comme les planches du tableau de bord. */}
        <div className="relative h-[170px] bg-[color:var(--board-blue-pale)] md:h-[210px]">
          <Image
            src="/illustrations/batiments/restaurant.webp"
            alt=""
            width={1000}
            height={772}
            preload
            sizes="(min-width: 768px) 236px, 190px"
            className="absolute left-1/2 top-4 h-auto w-[190px] -translate-x-1/2 md:w-[236px]"
          />
        </div>
        <div className="flex flex-col gap-6 px-5 pb-[calc(22px+env(safe-area-inset-bottom,0px))] pt-6 md:px-9 md:pb-8 md:pt-7">
          <div className="flex flex-col gap-2.5">
            <h1 id={titreId} className="board-titre m-0 text-[clamp(25px,2.4vw,29px)]">
              Mettez en place votre établissement
            </h1>
            <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Quelques informations essentielles, en trois étapes : comptez
              environ 5 minutes. Rojer en déduit les obligations qui s&apos;y
              appliquent et prépare votre calendrier.
            </p>
          </div>
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
