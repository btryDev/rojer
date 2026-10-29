// La règle de vie d'un équipement, posée en pied de sa tête de fiche.
//
// Le calendrier montre les mois qui viennent ; le registre montre les
// preuves déposées. Ni l'un ni l'autre ne montre le **cycle** : mis en
// service en 2022, vérifié deux fois, un écart à lever dans huit jours,
// prochaine visite en février. C'est cette phrase-là que la frise écrit
// d'un coup d'œil.
//
// Elle vit sur papier : les points portent un halo de la couleur du fond
// pour se détacher de la barre, comme les points de la règle annuelle se
// détachent du blanc de leur carte. Quelles étiquettes s'écrivent est
// décidé en amont (`construireFrise`) — la vue ne fait que poser.

import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import type { Frise, JalonPose } from "@/lib/equipements/frise";
import { formaterMoisAnneeFr } from "@/lib/dates";

/** Champ de la carte : c'est lui que les halos rejouent. */
const FOND = "var(--board-card)";

/**
 * Aligne l'étiquette d'un jalon selon sa place sur l'axe. Sur la moitié
 * centrale de l'axe, elle est centrée sur son point. Dans le quart de chaque
 * bord, elle glisse progressivement vers le bord : à 0 % elle est calée à
 * gauche, à 100 % calée à droite, et entre les deux le recul suit la position.
 * Une étiquette ne sort donc pas de la carte, sans quitter son point au milieu.
 *
 * ~~Centrée au milieu, calée sur les bords sous 6 % et au-delà de 94 %.~~
 * [2026-10-29 : sur téléphone, « 24 NOV. · VÉRIFICATION » centrée à 88 %
 * débordait de la carte — le seuil fixe ne tenait que sur une carte large.
 * Un premier remède faisait reculer l'étiquette de p % partout, et décalait
 * de son point une étiquette posée au quart (revue du même jour).]
 */
function ancrage(position: number): {
  style: React.CSSProperties;
  classe: string;
} {
  const p = Math.min(1, Math.max(0, position));
  // 0 → 0 %, 0,25 → 50 %, 0,75 → 50 %, 1 → 100 %.
  const recul = p < 0.25 ? p * 200 : p > 0.75 ? 50 + (p - 0.75) * 200 : 50;
  return {
    style: { left: `${p * 100}%`, transform: `translateX(-${recul}%)` },
    classe:
      recul < 25
        ? "items-start text-left"
        : recul > 75
          ? "items-end text-right"
          : "items-center text-center",
  };
}

function Etiquette({ jalon, mois }: { jalon: JalonPose; mois: boolean }) {
  const a = ancrage(jalon.position);
  return (
    <span
      className={`absolute flex flex-col gap-0.5 ${a.classe}`}
      style={a.style}
    >
      <span
        className="whitespace-nowrap font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em]"
        // L'encre de l'état, pas son champ : le vert et le jaune de champ
        // sont illisibles sur blanc.
        style={{ color: ENCRE_ETAT[jalon.etat] }}
      >
        {mois ? formaterMoisAnneeFr(jalon.date) : jalon.libelle}
      </span>
      {mois ? (
        <span className="whitespace-nowrap text-[12px] text-[color:var(--board-slate-mid)]">
          {jalon.libelle}
        </span>
      ) : null}
    </span>
  );
}

export function FriseEquipement({ frise }: { frise: Frise }) {
  // La barre pleine s'arrête au jour courant : elle mesure du **temps
  // écoulé**, pas de la conformité. Elle partait en vert sur ses 72 premiers
  // pour cent quoi qu'il arrive — une hotte de 2019 jamais vérifiée voyait
  // donc tout son passé peint en « fait ». Le passé est neutre ; seule
  // l'arrivée porte une couleur, celle du repère qui appelle un geste.
  const vedette = frise.jalons.find((j) => j.vedette);
  const passe = "var(--board-slate)";
  const arrivee = vedette ? CHAMP_ETAT[vedette.etat] : passe;
  const remplissage = `linear-gradient(90deg, ${passe} 0%, ${passe} 72%, ${arrivee} 100%)`;

  return (
    <div className="mt-6 border-t border-[color:var(--board-slate-line)] pt-5">
      <div className="flex items-center justify-between gap-4">
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          La vie de cet équipement
        </p>
        {/* `--board-slate` est un ton de graduation, pas d'encre : à ~1,6:1
            sur le fond, les bornes de l'axe étaient illisibles. */}
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-mid)]">
          {formaterMoisAnneeFr(frise.debut)} → {formaterMoisAnneeFr(frise.fin)}
        </p>
      </div>

      <div className="relative mt-6 h-1.5 rounded-full bg-[color:var(--board-slate-pale)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${frise.aujourdhui * 100}%`,
            background: remplissage,
          }}
        />

        {frise.jalons.map((j) => (
          <span
            key={j.cle}
            className="absolute top-1/2 rounded-full"
            style={{
              left: `${j.position * 100}%`,
              // Aux extrémités, le point mordrait hors de la barre : on le
              // rentre de son propre rayon plutôt que de le centrer.
              transform:
                j.position <= 0
                  ? "translate(-2px, -50%)"
                  : j.position >= 1
                    ? "translate(-14px, -50%)"
                    : "translate(-50%, -50%)",
              width: j.vedette ? 22 : 16,
              height: j.vedette ? 22 : 16,
              background: CHAMP_ETAT[j.etat],
              boxShadow: j.vedette
                ? `0 0 0 4px ${FOND}, 0 0 0 6px ${CHAMP_ETAT[j.etat]}`
                : `0 0 0 4px ${FOND}`,
            }}
          />
        ))}

        <span
          aria-hidden
          className="absolute -bottom-3.5 -top-3.5 w-0.5 rounded-sm bg-[color:var(--board-ink)]"
          style={{ left: `${frise.aujourdhui * 100}%` }}
        />
      </div>

      {/* Les étiquettes sont absolues : elles suivent leur point, pas
          l'ordre du flux. La hauteur est réservée en dur pour que la carte
          ne se replie pas dessus. */}
      <div className="relative mt-4 h-[52px]">
        {frise.jalons
          .filter((j) => j.etiquette && j.rangee === "haute")
          .map((j) => (
            <Etiquette key={j.cle} jalon={j} mois />
          ))}

        {(() => {
          // Le repère du jour s'ancre comme les autres : centré au milieu,
          // calé sur le bord quand il tombe à l'extrémité — sinon il sort
          // de la carte d'une demi-largeur, ce qui arrive dès que tout est
          // en retard et que l'axe s'arrête aujourd'hui.
          const a = ancrage(frise.aujourdhui);
          return (
            <span
              className={`absolute flex flex-col ${a.classe}`}
              style={a.style}
            >
              <span className="whitespace-nowrap font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[color:var(--board-ink)]">
                aujourd&apos;hui
              </span>
            </span>
          );
        })()}

        {/* La rangée basse porte ce qui appelle un geste : elle tombe
            presque toujours près d'aujourd'hui, et se cognerait à son
            repère sur une seule ligne. */}
        <div className="absolute inset-x-0 top-[26px]">
          {frise.jalons
            .filter((j) => j.etiquette && j.rangee === "basse")
            .map((j) => (
              <Etiquette key={j.cle} jalon={j} mois={false} />
            ))}
        </div>
      </div>
    </div>
  );
}
