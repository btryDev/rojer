"use client";

// Apparition au défilement. L'observateur pose lui-même l'attribut sur le
// nœud puis se débranche : pas d'état React, pas de rendu supplémentaire,
// et rien ne rejoue au retour en arrière — c'est ce qui distingue une page
// qui se pose d'une page qui clignote.
// Rien n'est caché dans le HTML : c'est l'effet qui cache ce qui est sous
// l'écran, puis le montre. Sans JS, ou avant qu'il tourne, tout est visible.
// `prefers-reduced-motion` est traité en CSS (.lp-reveal) : rien ne bouge.

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  delai = 0,
  className,
  as: Balise = "div",
  ample,
}: {
  children: React.ReactNode;
  /** Décalage de l'apparition, en ms — pour cascader une rangée. */
  delai?: number;
  className?: string;
  as?: "div" | "li" | "section" | "header";
  /** Apparition plus lente, déclenchée plus tard : « texte » monte de plus
   *  loin, « media » monte et se dézoome. Pour les sections qu'on découvre. */
  ample?: "texte" | "media";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Déjà à l'écran (ou au-dessus) au chargement : il reste tel quel, on ne
    // le cache pas pour le refaire apparaître. Sans IntersectionObserver
    // (très vieux navigateur), rien n'est caché.
    if (typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    // Au téléphone, pas d'apparition : le contenu est simplement là
    // (décision de la propriétaire, 2026-11-07). La vidéo, elle, se lit.
    if (window.matchMedia("(max-width: 767px)").matches) return;
    el.dataset.vu = "false";
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.vu = "true";
          obs.disconnect();
        }
      },
      // Ample : l'élément attend d'être bien entré dans l'écran (un quart),
      // pour qu'on le voie arriver plutôt que de le trouver déjà posé.
      ample
        ? { rootMargin: "0px 0px -25% 0px", threshold: 0 }
        : { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ample]);

  return (
    <Balise
      // @ts-expect-error — ref polymorphe sur un jeu de balises fermé.
      ref={ref}
      style={delai ? ({ "--lp-delai": `${delai}ms` } as React.CSSProperties) : undefined}
      className={cn("lp-reveal", ample && `lp-reveal-${ample}`, className)}
    >
      {children}
    </Balise>
  );
}
