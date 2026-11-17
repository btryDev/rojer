import { CHAMP_ETAT } from "@/lib/calendrier/etats";
import type { FriseAffichee } from "@/lib/abonnements/etat-affiche";
import { formaterDateLongueFr } from "@/lib/dates";

/**
 * La période d'un abonnement ou d'un essai, avec aujourd'hui dessus
 * (2026-11-17) : l'abonnement est une échéance comme les autres, il se lit
 * avec les couleurs du calendrier (`CHAMP_ETAT`) — rien à faire tant qu'elle
 * est loin, paille quand elle approche, saumon quand la saisie est fermée.
 */
export function FrisePeriode({ frise, maintenant }: { frise: FriseAffichee; maintenant: Date }) {
  const { debut, fin, libelleDebut, libelleFin, etat } = frise;
  const duree = fin.getTime() - debut.getTime();
  const part = duree > 0 ? (maintenant.getTime() - debut.getTime()) / duree : 1;
  const pct = Math.round(Math.min(1, Math.max(0, part)) * 1000) / 10;
  // L'étiquette « aujourd'hui » s'aligne sur son trait sans sortir de la piste.
  const position = pct < 15 ? { left: 0 } : pct > 85 ? { right: 0 } : { left: `${pct}%`, transform: "translateX(-50%)" };
  return (
    <div className="mt-9">
      <div className="relative h-3 rounded-full bg-[color:var(--board-slate-pale)]">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: CHAMP_ETAT[etat] }} />
        <span
          aria-hidden
          className="absolute -top-1.5 bottom-[-6px] w-0.5 -translate-x-1/2 rounded bg-[color:var(--board-ink)]"
          style={{ left: `${pct}%` }}
        />
        <p className="absolute -top-7 m-0 whitespace-nowrap text-[12.5px] font-semibold text-[color:var(--board-ink)]" style={position}>
          Aujourd&apos;hui
        </p>
      </div>
      <div className="mt-3 flex justify-between gap-4 text-[13px] leading-[1.35] text-[color:var(--board-slate-mid)]">
        <p className="m-0 flex flex-col gap-0.5">
          <span className="board-titre text-[16px] tracking-[-0.02em]">{formaterDateLongueFr(debut)}</span>
          {libelleDebut}
        </p>
        <p className="m-0 flex flex-col items-end gap-0.5 text-right">
          <span className="board-titre text-[16px] tracking-[-0.02em]">{formaterDateLongueFr(fin)}</span>
          {libelleFin}
        </p>
      </div>
    </div>
  );
}
