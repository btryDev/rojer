import Link from "next/link";
import { ListFilter } from "lucide-react";
import type { ReactNode } from "react";
import { LABEL_TOUT_ETABLISSEMENT } from "@/lib/calendrier/labels";
import { nomDeZone } from "@/lib/batiments/nom-zone";

/**
 * Rangée de chips « Tout l'établissement · Zone A · Zone B ».
 *
 * Un filtre d'écran vit dans l'URL (ADR-015) : chaque chip est un lien
 * vers la même page avec `?batiment=`. Le composant est serveur, sans état
 * — la page relit le paramètre et filtre. Il n'est rendu qu'à partir de
 * deux zones (ADR-029) : l'appelant le garantit, lui ne fait que
 * dessiner.
 *
 * Deux tons, parce que le produit a deux grammaires visuelles et qu'un
 * filtre doit parler celle de l'écran qui le porte : `papier` pour les
 * écrans-fiche (encre sur fond clair, filets), `board` pour le bandeau du
 * parc, où la chip prend la forme et le champ des compteurs qu'elle
 * jouxte. Rien d'autre ne change : mêmes liens, même règle.
 */
export type TonSelecteurBatiment = "papier" | "board";

const CLASSES_ETIQUETTE: Record<TonSelecteurBatiment, string> = {
  papier:
    "font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground",
  board:
    "board-eyebrow text-[9.5px] tracking-[0.14em] text-[color:var(--board-slate-soft)]",
};

/**
 * ~~`max-w-[66ch]`~~ [2026-10-24 : la mesure commune, `--board-mesure`] dans
 * les deux tons : la légende est du texte courant, et elle
 * courait jusqu'au bord — une phrase de deux lignes s'étalait sur 1 200 px d'un
 * seul trait, quand les autres phrases de périmètre du produit tiennent entre
 * 46 et 68 caractères. La mesure se pose ici plutôt que chez chaque appelant :
 * il y en a deux, et le second l'aurait oubliée.
 */
const CLASSES_LEGENDE: Record<TonSelecteurBatiment, string> = {
  papier: "m-0 max-w-[var(--board-mesure)] text-[0.8rem] leading-relaxed text-muted-foreground",
  board:
    "m-0 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]",
};

export function SelecteurBatiment({
  baseHref,
  batiments,
  actif,
  compteurs,
  legende,
  ton = "papier",
}: {
  baseHref: string;
  batiments: { id: string; nom: string }[];
  /** Id de la zone filtrée — `undefined` = tout l'établissement. */
  actif: string | undefined;
  /** Nombre affiché à droite du nom (équipements, échéances…). */
  compteurs?: Map<string, number>;
  /** Phrase sous la rangée : ce que le filtre couvre, et ce qu'il ne
   *  couvre pas. Le produit dit toujours son périmètre. */
  legende?: ReactNode;
  /** La grammaire visuelle de l'écran qui porte le filtre. */
  ton?: TonSelecteurBatiment;
}) {
  return (
    <nav aria-label="Filtrer par zone" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {ton === "board" ? (
          // [2026-10-25] « Zone » seul, devant des pilules grises, ne se
          // lisait pas comme un filtre (contrôle visuel de la propriétaire) :
          // le verbe le dit, et les options se rangent dans un même cadre,
          // comme une commande à choix unique.
          <span className="mr-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--board-slate-ink)]">
            <ListFilter aria-hidden className="size-4" />
            Filtrer par zone
          </span>
        ) : (
          <span className={CLASSES_ETIQUETTE[ton]}>Zone</span>
        )}
        <span
          className={
            ton === "board"
              ? "inline-flex flex-wrap items-center gap-1 rounded-full bg-[color:var(--board-card)] p-1 ring-1 ring-[color:rgba(13,18,36,.12)]"
              : "contents"
          }
        >
        <Chip href={baseHref} actif={!actif} ton={ton}>
          {LABEL_TOUT_ETABLISSEMENT}
        </Chip>
        {batiments.map((b) => (
          <Chip
            key={b.id}
            href={`${baseHref}?batiment=${encodeURIComponent(b.id)}`}
            actif={actif === b.id}
            ton={ton}
          >
            {nomDeZone(b.nom)}
            {compteurs?.has(b.id) ? (
              <span className="ml-1.5 tabular-nums opacity-60">
                {compteurs.get(b.id)}
              </span>
            ) : null}
          </Chip>
        ))}
        </span>
      </div>
      {legende ? <p className={CLASSES_LEGENDE[ton]}>{legende}</p> : null}
    </nav>
  );
}

/** Les classes de chaque ton, choisi et au repos. La chip « board »
 *  reprend la pilule des compteurs du bandeau, encrée quand elle est
 *  choisie : le filtre et les chiffres qu'il gouverne ont le même objet.
 *  [2026-10-25] Au repos, sans fond, dans le cadre commun : des pilules
 *  grises séparées se lisaient comme des étiquettes. */
const CLASSES_CHIP: Record<
  TonSelecteurBatiment,
  { commun: string; actif: string; repos: string }
> = {
  papier: {
    commun: "rounded-full border px-3 py-1 text-[0.8rem] transition-colors",
    actif: "border-ink bg-ink text-background",
    repos: "border-rule text-foreground/80 hover:border-ink",
  },
  board: {
    commun:
      "rounded-full px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors",
    actif: "bg-[color:var(--board-ink)] text-white",
    repos:
      "text-[color:var(--board-slate-ink)] hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]",
  },
};

function Chip({
  href,
  actif,
  ton,
  children,
}: {
  href: string;
  actif: boolean;
  ton: TonSelecteurBatiment;
  children: ReactNode;
}) {
  const c = CLASSES_CHIP[ton];
  return (
    <Link
      href={href}
      aria-current={actif ? "true" : undefined}
      className={`${c.commun} ${actif ? c.actif : c.repos}`}
    >
      {children}
    </Link>
  );
}
