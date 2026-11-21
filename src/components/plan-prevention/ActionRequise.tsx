import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Les deux formes de « ce qui attend le dirigeant » sur la fiche du plan
 * (2026-11-21, maquette « Bloc Suivi / Bloc Plan » validée par la
 * propriétaire) :
 * - `CarteActionRequise`, en tête de l'onglet « Suivi », dans le bloc de la
 *   fiche : une carte intérieure à bord fin, un en-tête crème avec un point,
 *   l'étiquette (« À décider ») et la date à droite, puis le titre, la
 *   phrase, le contenu et le pied. Ambre pour la proposition à trancher,
 *   bleu pour ce que le dirigeant fait lui-même (correction, signature,
 *   lien à envoyer) ;
 * - `RappelSuivi`, sur l'onglet « Le plan » : une ligne du bloc, même point,
 *   qui mène au suivi, où le geste se fait.
 *
 * ~~Une carte à filet ambre~~, ~~une section à trait ambre~~ [2026-11-21].
 */

const TONS = {
  // Les teintes de la maquette, en un seul endroit : le board n'a pas de
  // jeton pour ce bord ni pour ce point.
  ambre: {
    bord: "border-[#efe0a6]",
    tete: "border-[#f4ead0] bg-[color:var(--board-amber-wash)]",
    point: "bg-[#e0a100] shadow-[0_0_0_4px_#fbefc9]",
    encre: "text-[color:var(--board-amber-ink)]",
  },
  bleu: {
    bord: "border-[color:var(--board-blue-soft)]",
    tete: "border-[color:var(--board-blue-soft)] bg-[color:var(--board-blue-pale)]",
    point: "bg-[color:var(--board-blue-mid)] shadow-[0_0_0_4px_var(--board-blue-pale)]",
    encre: "text-[color:var(--board-blue-ink)]",
  },
} as const;

export type TonAction = keyof typeof TONS;

function Point({ ton }: { ton: TonAction }) {
  return <span aria-hidden className={`size-2 flex-none rounded-full ${TONS[ton].point}`} />;
}

export function CarteActionRequise({
  id,
  ton = "ambre",
  etiquette,
  date,
  titre,
  phrase,
  pied,
  ecriture = false,
  children,
}: {
  /** L'identifiant du titre, pour `aria-labelledby`. */
  id: string;
  ton?: TonAction;
  /** « À décider », « À signer »… */
  etiquette: string;
  /** À droite de l'en-tête : « reçue le 21/11 à 18 h 06 ». */
  date?: string;
  titre: string;
  /** Sous le titre : qui, et ce que le geste déclenche. */
  phrase?: string;
  /** En bas : la phrase de conséquence et les boutons. */
  pied?: ReactNode;
  /** Toute la carte mène à une écriture : masquée en lecture seule (`data-ecriture`). */
  ecriture?: boolean;
  children?: ReactNode;
}) {
  const t = TONS[ton];
  return (
    <div className="px-6 pt-[22px] md:px-10">
      <section
        aria-labelledby={id}
        data-ecriture={ecriture ? "" : undefined}
        className={`overflow-hidden rounded-[22px] border bg-[color:var(--board-card)] ${t.bord}`}
      >
        <div className={`flex flex-wrap items-center gap-2.5 border-b px-[22px] py-3.5 ${t.tete}`}>
          <Point ton={ton} />
          <span className={`text-[13px] font-semibold ${t.encre}`}>{etiquette}</span>
          {date && <span className="ml-auto text-[13px] text-[color:var(--board-slate-mid)]">{date}</span>}
        </div>
        <div className="flex flex-col gap-3.5 px-[22px] pb-5 pt-[18px]">
          <div>
            <h2 id={id} className="board-titre m-0 text-[22px] leading-[1.15]">
              {titre}
            </h2>
            {phrase && <p className="m-0 mt-1 text-[14px] text-[color:var(--board-slate-ink)]">{phrase}</p>}
          </div>
          {children}
          {pied}
        </div>
      </section>
    </div>
  );
}

export function RappelSuivi({
  href,
  action,
  children,
}: {
  href: string;
  /** « Décider dans Suivi », « Terminer dans Suivi ». */
  action: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-wrap items-center gap-2.5 rounded-[16px] border px-4 py-[11px] text-[14px] text-[color:var(--board-ink)] ${TONS.ambre.bord}`}
    >
      <Point ton="ambre" />
      <span className="min-w-0 flex-[1_1_320px]">{children}</span>
      <span className={`ml-auto font-semibold ${TONS.ambre.encre}`}>{action}</span>
    </Link>
  );
}
