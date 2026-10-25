"use client";

// Le sélecteur de lecture (par mois / par équipement), posé dans la barre
// de réglage collante. Il ne possède pas son état : la lecture vit dans
// l'URL (`?vue=equipement`), écrite d'un `history.replaceState` sans
// repasser serveur — `AnneeCalendrier` la lit par `useSearchParams` et
// bascule ses blocs, les filtres la reconduisent dans leurs liens, un
// partage ou un favori la capture.

import { useSearchParams } from "next/navigation";
import type { Lecture } from "./AnneeCalendrier";

/** Écrit la lecture dans l'URL, sans navigation serveur. */
export function ecrireLecture(l: Lecture) {
  const url = new URL(window.location.href);
  if (l === "equipement") url.searchParams.set("vue", "equipement");
  else url.searchParams.delete("vue");
  window.history.replaceState(null, "", url);
}

/** La lecture portée par des params d'URL. */
export function lectureDesParams(params: URLSearchParams): Lecture {
  return params.get("vue") === "equipement" ? "equipement" : "mois";
}

export function SelecteurLecture() {
  const lecture = lectureDesParams(useSearchParams());

  return (
    <div className="flex flex-none items-center gap-1 rounded-full bg-[color:var(--board-card)] p-1 shadow-[0_0_0_1px_rgba(13,18,36,.08)]">
      <Onglet actif={lecture === "mois"} onClick={() => ecrireLecture("mois")}>
        Par mois
      </Onglet>
      <Onglet
        actif={lecture === "equipement"}
        onClick={() => ecrireLecture("equipement")}
      >
        Par équipement
      </Onglet>
    </div>
  );
}

function Onglet({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={
        "rounded-full px-[18px] py-[9px] text-[13px] font-semibold leading-none transition-colors " +
        (actif
          ? "bg-[color:var(--board-ink)] text-white"
          : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
      }
    >
      {children}
    </button>
  );
}
