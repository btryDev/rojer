"use client";

// Relevé provisoire des hauteurs d'écran, affiché seulement avec `?ecran`
// dans l'adresse : Safari et Chrome sur iPhone ne mesurent pas l'écran de
// la même façon (barre flottante ou barres fixes), et le hero doit tomber
// juste dans les deux (2026-11-07). À retirer une fois réglé.

import { useEffect, useState } from "react";

function hauteur(unite: string): number {
  const d = document.createElement("div");
  d.style.cssText = `position:fixed;top:0;left:0;width:1px;height:${unite};visibility:hidden`;
  document.body.appendChild(d);
  const h = d.getBoundingClientRect().height;
  d.remove();
  return Math.round(h);
}

export function MesuresEcran() {
  const [texte, setTexte] = useState<string | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("ecran")) return;
    const lire = () => {
      const hero = document.querySelector("section")?.getBoundingClientRect();
      setTexte(
        [
          `innerHeight ${window.innerHeight} · visualViewport ${Math.round(window.visualViewport?.height ?? 0)} · écran ${screen.height}`,
          `100svh ${hauteur("100svh")} · 100dvh ${hauteur("100dvh")} · 100lvh ${hauteur("100lvh")}`,
          `bas du hero ${Math.round(hero?.bottom ?? 0)} · défilé ${Math.round(window.scrollY)}`,
          /CriOS/.test(navigator.userAgent) ? "Chrome" : /Safari/.test(navigator.userAgent) ? "Safari" : navigator.userAgent,
        ].join("\n"),
      );
    };
    lire();
    window.addEventListener("resize", lire);
    window.addEventListener("scroll", lire, { passive: true });
    return () => {
      window.removeEventListener("resize", lire);
      window.removeEventListener("scroll", lire);
    };
  }, []);

  if (!texte) return null;
  return (
    <pre className="fixed inset-x-2 top-24 z-[100] m-0 whitespace-pre-wrap rounded-[12px] bg-black/85 p-3 text-[12px] leading-[1.45] text-white">
      {texte}
    </pre>
  );
}
