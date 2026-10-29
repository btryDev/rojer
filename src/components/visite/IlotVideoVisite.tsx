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
// système demande de réduire les animations. Elle démarre avec sa musique ;
// un navigateur qui refuse le son sans geste la relance en sourdine.

import { useState } from "react";
import { Play, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { ecrireCookieClient } from "@/lib/navigateur/cookie-client";
import { VISITES, cookieVisiteMasquee, fichiersVisite, type CleVisite } from "@/lib/visite/visites";

/** Lance la lecture avec le son ; refusée, la relance en sourdine. */
function lancer(video: HTMLVideoElement) {
  if (!video.paused) return;
  try {
    video.play()?.catch(() => {
      video.muted = true;
      video.play()?.catch(() => {});
    });
  } catch {
    // Pas de lecture possible ici (environnement sans média) : l'image
    // d'aperçu et les contrôles restent.
  }
}

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
      <div aria-hidden className="h-20 flex-none md:h-36" />
      <aside
        aria-label="Visite guidée de la page"
        // Sur l'encre, comme le rail : l'îlot se détache des cartes blanches
        // de la page sans emprunter une couleur d'état (charte, § 1.5).
        // Sur téléphone, l'îlot se pose au-dessus de la barre du bas
        // (`--reserve-nav-bas`, nulle ailleurs) et se réduit à une pastille
        // d'une ligne : en carte, il couvrait 160 px de la liste. « Ne plus
        // afficher » reste dans la fenêtre de la vidéo.
        className="fixed bottom-[calc(var(--reserve-nav-bas)_+_12px)] right-[var(--board-gutter)] z-40 w-[384px] max-w-[calc(100vw_-_2_*_var(--board-gutter))] md:bottom-5 md:right-5 rounded-[22px] bg-[color:var(--board-ink)] px-3.5 pb-2.5 pt-3.5 text-white max-md:w-auto max-md:rounded-full max-md:py-1.5 max-md:pl-2 max-md:pr-1.5 shadow-[0_18px_40px_-14px_rgba(13,18,36,.55)]"
      >
        <div className="flex items-start gap-3.5 max-md:items-center max-md:gap-1">
          <button type="button" onClick={ouvrir} className="group flex min-w-0 flex-1 items-start gap-3.5 text-left max-md:min-h-9 max-md:items-center max-md:gap-2.5">
            <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-white text-[color:var(--board-ink)] md:hidden">
              <Play className="ml-0.5 size-3 fill-current" />
            </span>
            <span className="relative hidden w-[118px] flex-none overflow-hidden rounded-[14px] bg-[color:var(--board-canvas)] md:block">
              {/* eslint-disable-next-line @next/next/no-img-element -- vignette statique, déjà à la bonne taille */}
              <img src={vignette} alt="" className="block aspect-video w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-[rgba(10,10,10,.06)] transition-colors group-hover:bg-[rgba(10,10,10,.16)]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--board-ink)] text-white shadow-[0_4px_12px_-4px_rgba(13,18,36,.5)]">
                  <Play className="ml-0.5 size-3.5 fill-current" />
                </span>
              </span>
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="board-eyebrow hidden text-[9.5px] tracking-[0.16em] text-[#a3a3a3] md:block">
                Visite guidée · {duree}
              </span>
              <span className="board-titre mt-1 block text-[16px] text-white max-md:mt-0 max-md:text-[14px]">
                {titre}
                <span className="ml-1.5 font-sans text-[12px] font-normal text-[#a3a3a3] md:hidden">{duree}</span>
              </span>
              <span className="mt-1.5 hidden items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-pale)] group-hover:underline md:inline-flex">
                <Play className="size-3 fill-current" />
                Regarder la vidéo
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Masquer pour cette fois"
            className="-mr-1 -mt-1 flex size-7 flex-none items-center justify-center rounded-full text-[#a3a3a3] max-md:m-0 max-md:size-9 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2.5 hidden border-t border-white/10 pt-2 md:block">
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
          ref={(v) => {
            if (v && lectureAuto) lancer(v);
          }}
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
