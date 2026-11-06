"use client";

// Un passage d'une vidéo, joué en boucle, muet. `preload="none"` : rien
// n'est téléchargé avant que la section approche de l'écran. Avec
// `prefers-reduced-motion`, rien ne joue : l'image d'aperçu reste.
//
// Le passage est lu dans la visite entière, faute d'extrait coupé (FFmpeg
// n'est pas installé) : quand il le sera, `debut`/`fin` disparaissent au
// profit de l'attribut `loop`.

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

    // Ramène au début du passage hors des bornes — au premier départ comme
    // à chaque tour.
    const boucler = () => {
      if (video.currentTime >= fin || video.currentTime < debut - 0.5) {
        video.currentTime = debut;
      }
    };
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "200px 0px" },
    );
    video.addEventListener("timeupdate", boucler);
    observateur.observe(video);
    return () => {
      observateur.disconnect();
      video.removeEventListener("timeupdate", boucler);
    };
  }, [debut, fin]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="none"
      aria-label={label}
      className="block aspect-video w-full object-cover"
    />
  );
}
