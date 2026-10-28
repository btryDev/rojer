"use client";

// L'îlot de visite guidée, en bas à droite d'une page d'entrée : il propose
// une courte vidéo qui montre la page en action, et l'ouvre dans un panneau.
// Rendu par `VisiteGuidee`, qui l'écarte si le cookie le demande.
//
// Deux façons de le faire partir, et elles ne disent pas la même chose :
// - la croix le retire pour cette visite de la page seulement ;
// - « Ne plus afficher » l'écrit dans un cookie et le retire tout de suite
//   (dans le panneau : à la fermeture, et décocher défait le choix).
// La vidéo ne démarre qu'à l'ouverture du panneau, et pas d'elle-même si le
// système demande de réduire les animations.

import { useState } from "react";
import { Play, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { ecrireCookieClient } from "@/lib/navigateur/cookie-client";
import { VISITES, cookieVisiteMasquee, fichiersVisite, type CleVisite } from "@/lib/visite/visites";

export function IlotVideoVisite({ cle }: { cle: CleVisite }) {
  const { duree, titre, titreVideo, etapes } = VISITES[cle];
  const { video, affiche, vignette } = fichiersVisite(cle);
  const [visible, setVisible] = useState(true);
  const [ouvert, setOuvert] = useState(false);
  const [lectureAuto, setLectureAuto] = useState(true);
  const [nePlusAfficher, setNePlusAfficher] = useState(false);

  if (!visible) return null;

  const memoriser = (masquer: boolean) => {
    setNePlusAfficher(masquer);
    ecrireCookieClient(cookieVisiteMasquee(cle), masquer ? "1" : null);
  };
  const ouvrir = () => {
    setLectureAuto(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    setOuvert(true);
  };
  const fermerPanneau = () => {
    setOuvert(false);
    if (nePlusAfficher) setVisible(false);
  };

  return (
    <>
      {/* Réserve, en bas de page, la hauteur de l'îlot : sans elle, il
          couvrirait la fin de la liste. */}
      <div aria-hidden className="h-36 flex-none" />
      <aside
        aria-label="Visite guidée de la page"
        // Sur l'encre, comme le rail : l'îlot se détache des cartes blanches
        // de la page sans emprunter une couleur d'état (charte, § 1.5).
        className="fixed bottom-5 right-5 z-40 w-[384px] max-w-[calc(100vw-32px)] rounded-[22px] bg-[color:var(--board-ink)] px-3.5 pb-2.5 pt-3.5 text-white shadow-[0_18px_40px_-14px_rgba(13,18,36,.55)]"
      >
        <div className="flex items-start gap-3.5">
          <button type="button" onClick={ouvrir} className="group flex min-w-0 flex-1 items-start gap-3.5 text-left">
            <span className="relative block w-[118px] flex-none overflow-hidden rounded-[14px] bg-[color:var(--board-canvas)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- vignette statique, déjà à la bonne taille */}
              <img src={vignette} alt="" className="block aspect-video w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-[rgba(10,10,10,.06)] transition-colors group-hover:bg-[rgba(10,10,10,.16)]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--board-ink)] text-white shadow-[0_4px_12px_-4px_rgba(13,18,36,.5)]">
                  <Play className="ml-0.5 size-3.5 fill-current" />
                </span>
              </span>
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="board-eyebrow block text-[9.5px] tracking-[0.16em] text-[#a3a3a3]">
                Visite guidée · {duree}
              </span>
              <span className="board-titre mt-1 block text-[16px] text-white">{titre}</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-pale)] group-hover:underline">
                <Play className="size-3 fill-current" />
                Regarder la vidéo
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Masquer pour cette fois"
            className="-mr-1 -mt-1 flex size-7 flex-none items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2.5 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => {
              memoriser(true);
              setVisible(false);
            }}
            className="text-[12.5px] text-[#bdbdbd] underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            Ne plus afficher
          </button>
        </div>
      </aside>

      <PanneauModal ouvert={ouvert} surFermer={fermerPanneau} surtitre={`Visite guidée · ${duree}`} titre={titreVideo} largeur="large">
        <video
          src={video}
          poster={affiche}
          controls
          autoPlay={lectureAuto}
          muted
          playsInline
          aria-describedby={`etapes-visite-${cle}`}
          className="block aspect-video w-full rounded-[18px] bg-[color:var(--board-slate-pale)]"
        />
        <ol id={`etapes-visite-${cle}`} className="sr-only">
          {etapes.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-4 border-t border-[color:var(--board-slate-line)] pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[color:var(--board-slate-mid)]">
            <input
              type="checkbox"
              checked={nePlusAfficher}
              onChange={(e) => memoriser(e.target.checked)}
              className="size-4 accent-[color:var(--board-ink)]"
            />
            Ne plus afficher
          </label>
          <button type="button" onClick={fermerPanneau} className={buttonVariants({ variant: "boardClair", size: "boardSm" })}>
            Fermer
          </button>
        </div>
      </PanneauModal>
    </>
  );
}
