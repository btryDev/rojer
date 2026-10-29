// Une fiche du registre, vue depuis la liste.
//
// Le registre dépliait ses 49 fiches d'un bloc, formulaires ouverts compris :
// on descendait vingt écrans pour atteindre les événements, et un formulaire
// déplié repoussait tout le reste. Ici chaque fiche est une ligne, et
// s'ouvre sur sa propre page — le motif du calendrier et du parc
// d'équipements, où l'on choisit avant d'entrer.
//
// La ligne dit trois choses et pas une de plus : ce qu'est la fiche, où elle
// en est, et qu'on peut l'ouvrir. Ce qu'elle attend en détail se lit dans la
// fiche, pas dans la liste — une liste où chaque entrée s'explique n'est
// plus une liste.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Completude } from "@/lib/registre/completude";
import { PastilleCompletude } from "./PastilleCompletude";

export function LigneRegistre({
  titre,
  href,
  completude,
}: {
  titre: string;
  href: string;
  completude: Completude;
}) {
  return (
    <Link
      href={href}
      // Sur téléphone, la pastille passe sous le titre : à côté, elle
      // coupait « Renseignements généraux » à « Renseignements… ».
      className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-[20px] px-3 py-3 transition-colors hover:bg-[color:var(--board-slate-pale)] md:flex md:gap-4"
    >
      <span className="min-w-0 flex-1 text-[14.5px] max-md:line-clamp-2 md:truncate font-semibold leading-[1.3] tracking-[-0.015em] text-[color:var(--board-ink)]">
        {titre}
      </span>
      <PastilleCompletude completude={completude} className="flex-none max-md:col-start-1 max-md:row-start-2 max-md:justify-self-start" />
      <ChevronRight
        aria-hidden
        className="size-4 flex-none text-[color:var(--board-slate-soft)] max-md:col-start-2 max-md:row-span-2 max-md:row-start-1"
      />
    </Link>
  );
}

/**
 * Un groupe de fiches sous son numéro de partie.
 *
 * Le numéro est celui du registre imprimé (1, 2.1, 3.4) : il n'est pas
 * décoratif, c'est la référence que citera un inspecteur. Il reste donc
 * visible, et à sa place — devant le titre de la partie, jamais recopié sur
 * chaque fiche du groupe.
 */
export function PartieRegistre({
  numero,
  titre,
  children,
}: {
  numero: string;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="carte-board px-5 py-6 sm:px-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="board-eyebrow m-0 text-[10.5px] tabular-nums tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          {numero}
        </span>
        <h2 className="board-titre m-0 text-[17px]">{titre}</h2>
      </div>
      <div className="mt-3 flex flex-col">{children}</div>
    </section>
  );
}
