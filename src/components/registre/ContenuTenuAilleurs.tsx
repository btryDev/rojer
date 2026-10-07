// Le contenu d'une fiche que l'application tient sur un autre écran.
//
// Trente et une des quarante-neuf fiches sont dans ce cas : l'inventaire des
// moyens de secours, c'est le parc d'équipements ; les vérifications, c'est
// le calendrier. La première version de cet écran se contentait de le dire
// et de poser un lien — on ouvrait une fiche de son registre pour lire
// « rien ici, allez voir ailleurs ». C'est un cul-de-sac : le dirigeant
// venait justement voir CE que contient la fiche.
//
// Elle montre donc son contenu, en lecture. Pas de formulaire, jamais : la
// donnée se saisit là où elle vit, sinon deux copies divergent. Mais on la
// lit ici, parce que c'est ici qu'elle s'imprimera.

import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { BadgeStatut } from "@/components/calendrier/BadgeStatut";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";
import { MentionRythmeRetenu } from "@/components/referentiel/MentionRythmeRetenu";
import type { ContenuAilleurs } from "@/lib/registre/contenu-ailleurs";

// Les lignes arrivent en donnée pure (`lib/registre/contenu-ailleurs`) : ce
// composant est le seul à savoir qu'un statut se peint en pastille, et la
// lib le seul à savoir quelle table alimente quelle partie.
export function ContenuTenuAilleurs({ lignes, source, vide }: ContenuAilleurs) {
  return (
    <div className="flex flex-col gap-4">
      {lignes.length === 0 ? (
        <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          {vide}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {lignes.map((ligne) => {
            const contenu = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 text-[14px] font-semibold leading-[1.35] tracking-[-0.015em] text-[color:var(--board-ink)]">
                    <span className="min-w-0 truncate">{ligne.titre}</span>
                    {/* Le registre est le document qu'on présente à la
                        commission : une échéance d'assurance qui s'y lirait
                        comme réglementaire est l'erreur la plus coûteuse du
                        lot (ADR-032). */}
                    {ligne.contractuelle && <MentionContractuelle />}
                    {/* ADR-039 § 5 : un rythme que Rojer retient ne s'y lit
                        pas comme celui du texte. */}
                    <MentionRythmeRetenu mention={ligne.rythmeRetenu} />
                  </span>
                  {ligne.meta && (
                    <span className="mt-0.5 block truncate text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {ligne.meta}
                    </span>
                  )}
                </span>
                {ligne.statut && <BadgeStatut statut={ligne.statut} />}
                {ligne.href && (
                  <ChevronRight
                    aria-hidden
                    className="size-4 flex-none text-[color:var(--board-slate-soft)]"
                  />
                )}
              </>
            );
            return (
              <li
                key={ligne.id}
                className="border-t border-[color:var(--board-slate-line)] first:border-t-0"
              >
                {ligne.href ? (
                  <Link
                    href={ligne.href}
                    className="-mx-3 flex items-center gap-4 rounded-[16px] px-3 py-3 transition-colors hover:bg-[color:var(--board-slate-pale)]"
                  >
                    {contenu}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 py-3">{contenu}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-[color:var(--board-slate-line)] pt-4">
        <Link
          href={source.href}
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
        >
          Ouvrir {source.libelle}
          <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
        <p className="m-0 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Ces lignes se modifient depuis {source.libelle}, jamais ici : une
          seconde saisie du même fait finirait par le contredire.
        </p>
      </div>
    </div>
  );
}
