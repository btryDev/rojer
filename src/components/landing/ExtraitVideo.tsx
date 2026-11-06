"use client";

// Un passage d'une vidéo, joué en boucle, muet. La vidéo n'est chargée que
// lorsque la section approche de l'écran : la page ne paie pas ses
// mégaoctets à l'ouverture. Avec `prefers-reduced-motion`, rien ne joue :
// l'image d'aperçu reste.
//
// TODO lot suivant : couper l'extrait en fichier à part (FFmpeg) pour ne
// plus télécharger la visite entière.

import { useEffect, useRef } from "react";

export function ExtraitVideo({
  src,
  poster,
  debut,
  fin,
  label,
}: {
  src: string;
  poster: string;
  /** Début et fin du passage, en secondes. */
  debut: number;
  fin: number;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const boucler = () => {
      if (video.currentTime >= fin || video.currentTime < debut - 0.5) {
        video.currentTime = debut;
      }
    };
    const demarrer = () => {
      video.currentTime = debut;
      void video.play().catch(() => {});
    };

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) {
          video.pause();
          return;
        }
        if (!video.src) {
          video.src = src;
          video.addEventListener("loadedmetadata", demarrer, { once: true });
        } else {
          void video.play().catch(() => {});
        }
      },
      { rootMargin: "200px 0px" },
    );
    video.addEventListener("timeupdate", boucler);
    observateur.observe(video);
    return () => {
      observateur.disconnect();
      video.removeEventListener("timeupdate", boucler);
    };
  }, [src, debut, fin]);

  return (
    <video
      ref={ref}
      poster={poster}
      muted
      playsInline
      preload="none"
      aria-label={label}
      className="block aspect-video w-full object-cover"
    />
  );
}
