import type { ReleveTemperature } from "@prisma/client";
import { formaterJourMoisFr } from "@/lib/dates";

/**
 * Graph SVG simple de l'évolution des températures pour un point de
 * relevé. Affiche une ligne brisée + zone de seuil. Pas de lib, pas
 * d'interaction complexe — juste une visualisation lisible.
 *
 * Passage à la charte board (`docs/charte-board.md`). Le graphe porte un
 * **seuil** — ~~« réglementaire, l'arrêté du 1er février 2010 »~~ : ce texte
 * ne porte aucune température ; le seuil est celui que le dirigeant a fixé au
 * point, proposé d'après l'article 36 de l'arrêté du 23 juin 1978 —, et c'est
 * la seule chose que le remappage des couleurs ne
 * pouvait pas se permettre de déplacer. Trois choix en découlent :
 *
 * - **Le seuil garde le registre rouge.** `--minium` devient
 *   `--board-signal-ink` : encre plus sombre, même famille, même trait
 *   pointillé, même graduation chiffrée à gauche. La zone hors plage passe
 *   du `color-mix(--minium 8%)` au voile `--board-signal-wash`, qui est
 *   exactement le jeton que le board réserve à ça. Géométrie inchangée :
 *   la lecture « au-dessus / au-dessous de la ligne » ne bouge pas d'un
 *   pixel.
 * - **Rien ne peint « dans la plage ».** Le vert du board dit « fait »,
 *   pas « conforme » (interdits 16-17) ; une mesure dans la plage attendue
 *   n'est pas un fait accompli, c'est le cas normal. Les points dans la
 *   plage prennent donc l'encre de la série, et seuls ceux qui en sortent
 *   portent le signal.
 * - **La couleur n'y est jamais seule** (interdit 10) : c'est la position
 *   du point par rapport à la ligne pointillée et au voile qui dit de quel
 *   côté du seuil il tombe. La teinte ne fait que redoubler cette lecture,
 *   elle ne la porte pas.
 */
export function GraphTemperatures({
  releves,
  seuilMinCelsius,
  typeReseau,
  width = 600,
  height = 140,
}: {
  releves: ReleveTemperature[];
  seuilMinCelsius: number;
  typeReseau: string;
  width?: number;
  height?: number;
}) {
  if (releves.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[22px] bg-[color:var(--board-slate-pale)] text-[12.5px] text-[color:var(--board-slate-mid)]">
        Aucun relevé enregistré pour l&apos;instant.
      </div>
    );
  }

  // Tri chronologique
  const ordered = [...releves].sort(
    (a, b) => a.dateReleve.getTime() - b.dateReleve.getTime(),
  );

  const temps = ordered.map((r) => r.temperatureCelsius);
  const tMin = Math.min(...temps, seuilMinCelsius - 5);
  const tMax = Math.max(...temps, seuilMinCelsius + 10);
  const span = Math.max(5, tMax - tMin);

  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const w = width - padL - padR;
  const h = height - padT - padB;

  function xCoord(i: number): number {
    if (ordered.length === 1) return padL + w / 2;
    return padL + (i / (ordered.length - 1)) * w;
  }
  function yCoord(temp: number): number {
    const ratio = (temp - tMin) / span;
    return padT + (1 - ratio) * h;
  }

  const ySeuil = yCoord(seuilMinCelsius);

  const path = ordered
    .map((r, i) => `${i === 0 ? "M" : "L"} ${xCoord(i)} ${yCoord(r.temperatureCelsius)}`)
    .join(" ");

  // Part des relevés qui tombent du bon côté du seuil. Le champ s'appelle
  // encore `conforme` en base, mais l'outil ne prononce pas la conformité
  // d'un établissement : il constate qu'une mesure est dans la plage
  // attendue, ou qu'elle en sort (CLAUDE.md, règle 8).
  const nbDansLaPlage = ordered.filter((r) => r.conforme).length;
  const pourcent = Math.round((nbDansLaPlage / ordered.length) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          Évolution sur {ordered.length} relevé{ordered.length > 1 ? "s" : ""}
        </p>
        {/* Trois paliers, et l'ambre au milieu : `--warm` n'a pas
            d'équivalent board pour un accent d'impulsion, mais son rôle ici
            est celui de l'attention entre « tout va bien » et « il faut
            agir » — c'est la définition de l'ambre du board (interdit 4). */}
        <p
          className={
            "font-mono text-[11px] font-semibold tabular-nums " +
            (pourcent === 100
              ? "text-[color:var(--board-green-ink)]"
              : pourcent >= 80
                ? "text-[color:var(--board-amber-ink)]"
                : "text-[color:var(--board-signal-ink)]")
          }
        >
          {pourcent}% dans la plage
        </p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        {/* Zone hors plage teintée — sous le seuil pour l'ECS, au-dessus
            pour l'eau froide, dont le seuil est un maximum. */}
        {typeReseau !== "EFS" && (
          <rect
            x={padL}
            y={ySeuil}
            width={w}
            height={height - padB - ySeuil}
            fill="var(--board-signal-wash)"
          />
        )}
        {typeReseau === "EFS" && (
          <rect
            x={padL}
            y={padT}
            width={w}
            height={ySeuil - padT}
            fill="var(--board-signal-wash)"
          />
        )}

        {/* Ligne de seuil */}
        <line
          x1={padL}
          x2={width - padR}
          y1={ySeuil}
          y2={ySeuil}
          stroke="var(--board-signal-ink)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={padL - 4}
          y={ySeuil + 3}
          textAnchor="end"
          fontSize="9"
          fill="var(--board-signal-ink)"
          fontFamily="var(--font-mono), monospace"
        >
          {seuilMinCelsius}°
        </text>

        {/* Axe vertical temperatures indicatives */}
        {[Math.round(tMax), Math.round(tMin)].map((t) => (
          <text
            key={t}
            x={padL - 4}
            y={yCoord(t) + 3}
            textAnchor="end"
            fontSize="9"
            fill="var(--board-slate-soft)"
            fontFamily="var(--font-mono), monospace"
          >
            {t}°
          </text>
        ))}

        {/* Courbe — l'encre de la série, pas un état : le bleu glacier est
            le registre « calme et actif » du board. */}
        <path
          d={path}
          fill="none"
          stroke="var(--board-blue-ink)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points */}
        {ordered.map((r, i) => (
          <circle
            key={r.id}
            cx={xCoord(i)}
            cy={yCoord(r.temperatureCelsius)}
            r={3}
            fill={
              r.conforme
                ? "var(--board-blue-ink)"
                : "var(--board-signal-ink)"
            }
          />
        ))}

        {/* Date extrêmes */}
        <text
          x={padL}
          y={height - 6}
          fontSize="9"
          fill="var(--board-slate-soft)"
          fontFamily="var(--font-mono), monospace"
        >
          {formaterJourMoisFr(ordered[0].dateReleve)}
        </text>
        <text
          x={width - padR}
          y={height - 6}
          fontSize="9"
          fill="var(--board-slate-soft)"
          textAnchor="end"
          fontFamily="var(--font-mono), monospace"
        >
          {formaterJourMoisFr(ordered[ordered.length - 1].dateReleve)}
        </text>
      </svg>
    </div>
  );
}
