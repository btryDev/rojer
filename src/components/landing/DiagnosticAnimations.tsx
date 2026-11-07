"use client";

// Diagnostic provisoire des apparitions au défilement, affiché seulement
// avec `?diag` dans l'adresse : ce que le navigateur annonce (mouvement
// réduit, observateur), et l'état des blocs. Pour comprendre un téléphone
// où rien ne s'anime (2026-11-07) — à retirer une fois tranché.

import { useEffect, useState } from "react";

export function DiagnosticAnimations() {
  const [texte, setTexte] = useState<string | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("diag")) return;
    const lire = () => {
      const blocs = [...document.querySelectorAll<HTMLElement>(".lp-reveal")].filter((e) => e.offsetParent);
      const compte = (v: string | undefined) => blocs.filter((e) => e.dataset.vu === v).length;
      setTexte(
        [
          `mouvement réduit : ${matchMedia("(prefers-reduced-motion: reduce)").matches ? "OUI" : "non"}`,
          `IntersectionObserver : ${typeof IntersectionObserver === "undefined" ? "ABSENT" : "oui"}`,
          `écran : ${window.innerWidth}×${window.innerHeight}, défilé ${Math.round(window.scrollY)}`,
          `blocs : ${blocs.length} — cachés ${compte("false")}, apparus ${compte("true")}, jamais cachés ${compte(undefined)}`,
          navigator.userAgent,
        ].join("\n"),
      );
    };
    lire();
    window.addEventListener("scroll", lire, { passive: true });
    return () => window.removeEventListener("scroll", lire);
  }, []);

  if (!texte) return null;
  return (
    <pre className="fixed inset-x-2 bottom-2 z-[100] m-0 whitespace-pre-wrap rounded-[12px] bg-black/85 p-3 text-[11px] leading-[1.4] text-white">
      {texte}
    </pre>
  );
}
