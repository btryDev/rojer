"use client";

// Un passage d'une vidéo, joué en boucle, muet. `preload="none"` : rien
// n'est téléchargé avant que la section approche de l'écran. Avec
// `prefers-reduced-motion`, rien ne joue : l'image d'aperçu reste. Si le
// navigateur refuse la lecture automatique, un bouton la lance au toucher.
//
// Le passage est lu dans la visite entière, faute d'extrait coupé (FFmpeg
// n'est pas installé) : quand il le sera, `debut`/`fin` disparaissent au
// profit de l'attribut `loop`.

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

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
  // Le navigateur a refusé la lecture automatique (iPhone en mode
  // économie d'énergie, réglage du navigateur) : un bouton la lance.
  const [bloquee, setBloquee] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Muette par la propriété, pas seulement par l'attribut : React ne
    // rend pas `muted` dans le HTML, et Safari iOS ne joue sans geste
    // qu'une vidéo muette.
    video.muted = true;
    video.defaultMuted = true;

    // Ramène au début du passage hors des bornes — au premier départ comme
    // à chaque tour.
    const boucler = () => {
      if (video.currentTime >= fin || video.currentTime < debut - 0.5) {
        video.currentTime = debut;
      }
    };
    // Au premier chargement, se placer au début du passage avant de jouer :
    // sinon l'image d'ouverture de la visite passe un instant.
    const placer = () => {
      video.currentTime = debut;
    };
    video.addEventListener("loadedmetadata", placer, { once: true });
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          video.play().then(
            () => setBloquee(false),
            () => setBloquee(true),
          );
        }
        else video.pause();
      },
      { rootMargin: "200px 0px" },
    );
    video.addEventListener("timeupdate", boucler);
    observateur.observe(video);
    return () => {
      observateur.disconnect();
      video.removeEventListener("timeupdate", boucler);
      video.removeEventListener("loadedmetadata", placer);
    };
  }, [debut, fin]);

  return (
    <div className="relative">
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
      {bloquee ? (
        <button
          type="button"
          onClick={() => {
            const video = ref.current;
            if (!video) return;
            video.muted = true;
            void video.play().then(() => setBloquee(false), () => {});
          }}
          aria-label={`Lire la vidéo : ${label}`}
          className="absolute inset-0 flex items-center justify-center bg-black/10"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-[color:var(--board-ink)] shadow-[0_8px_24px_rgba(13,18,36,0.25)]">
            <Play aria-hidden size={22} className="ml-0.5" fill="currentColor" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
