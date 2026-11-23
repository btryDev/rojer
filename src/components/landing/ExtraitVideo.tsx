"use client";

// Un court extrait vidéo, joué en boucle, muet. `preload="none"` : rien
// n'est téléchargé avant que la section approche de l'écran. Avec
// `prefers-reduced-motion`, rien ne joue : l'image d'aperçu reste. Si le
// navigateur refuse la lecture automatique, un bouton la lance au toucher.
//
// ~~Le passage est lu dans la visite entière, faute d'extrait coupé (FFmpeg
// n'est pas installé)~~ [2026-11-23, relecture de la page publique : le
// passage est coupé à part (`public/videos/extrait-*.mp4`, 17 s, sans piste
// son — 0,78 Mo au lieu de la visite entière, son compris) ; `debut`/`fin`
// cèdent la place à l'attribut `loop`.] Un bouton met en pause : une vidéo
// qui tourne plus de cinq secondes doit pouvoir s'arrêter (WCAG 2.2.2).

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function ExtraitVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  // `bloquee` : la lecture automatique a été refusée. `arretee` : la personne
  // a mis en pause — la vidéo ne repart plus d'elle-même.
  const [bloquee, setBloquee] = useState(false);
  const [arretee, setArretee] = useState(false);
  const arreteeRef = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.muted = true;
    video.defaultMuted = true;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting && !arreteeRef.current) {
          video.play().then(
            () => setBloquee(false),
            () => setBloquee(true),
          );
        } else video.pause();
      },
      { rootMargin: "200px 0px" },
    );
    observateur.observe(video);
    return () => observateur.disconnect();
  }, []);

  const basculer = () => {
    const video = ref.current;
    if (!video) return;
    const pause = !arreteeRef.current;
    arreteeRef.current = pause;
    setArretee(pause);
    if (pause) video.pause();
    else void video.play().then(() => setBloquee(false), () => setBloquee(true));
  };

  return (
    <div className="relative">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
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
            arreteeRef.current = false;
            setArretee(false);
            void video.play().then(() => setBloquee(false), () => {});
          }}
          aria-label={`Lire la vidéo : ${label}`}
          className="absolute inset-0 flex items-center justify-center bg-black/10"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-[color:var(--board-ink)] shadow-[0_8px_24px_rgba(13,18,36,0.25)]">
            <Play aria-hidden size={22} className="ml-0.5" fill="currentColor" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={basculer}
          aria-label={arretee ? `Reprendre la vidéo : ${label}` : `Mettre la vidéo en pause : ${label}`}
          className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/85 text-[color:var(--board-ink)] shadow-[0_4px_12px_rgba(13,18,36,0.2)] transition-colors hover:bg-white motion-reduce:hidden"
        >
          {arretee ? (
            <Play aria-hidden size={15} className="ml-0.5" fill="currentColor" />
          ) : (
            <Pause aria-hidden size={15} fill="currentColor" />
          )}
        </button>
      )}
    </div>
  );
}
