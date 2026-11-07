// Changer de formule, pour un abonnement qui paie (ADR-053 § 10) : chaque
// option dit, AVANT le clic, quand elle s'applique et ce qu'elle fait — une
// montée tout de suite (différence prélevée), une baisse à la fin de la
// période payée ; ce qui dépasserait passe en lecture seule, et trop
// d'utilisateurs empêchent la baisse (§ 14).

import { BoutonEnvoi } from "./BoutonEnvoi";
import { annulerBaisseAction, changerFormuleAction } from "@/lib/abonnements/actions";
import { LIBELLES_PLAFONDS } from "@/lib/abonnements/formules";
import type { Depassement } from "@/lib/abonnements/quotas";
import { formaterDateLongueFr } from "@/lib/dates";

export type OptionDeFormule = {
  cle: string;
  libelle: string;
  /** « 89 € HT par mois », ou `null` si le prix manque. */
  prix: string | null;
  sens: "montee" | "baisse";
  /** Ce que fait ce changement, dit avant le clic (le cas du rythme compris). */
  effet: string;
  depassements: Depassement[];
};

const texte = "m-0 text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]";

export function ChangerDeFormule({
  options,
  baisse,
}: {
  options: OptionDeFormule[];
  /** Une baisse déjà planifiée : vers quoi, et quand. */
  baisse: { libelle: string; le: Date } | null;
}) {
  return (
    <section className="mt-6" aria-labelledby="titre-changer">
      <h3 id="titre-changer" className="m-0 text-[15px] font-semibold">
        Changer de formule
      </h3>
      {baisse && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3">
          <p className="m-0 text-[13.5px] leading-[1.5]">
            Passage à {baisse.libelle} prévu le {formaterDateLongueFr(baisse.le)}.
          </p>
          <form action={annulerBaisseAction}>
            <BoutonEnvoi variant="boardClair">Garder ma formule</BoutonEnvoi>
          </form>
        </div>
      )}
      <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
        {options.map((o) => {
          const tropDeMembres = o.depassements.find((d) => d.quota === "membres");
          const enLecture = o.depassements.filter((d) => d.quota !== "membres");
          return (
            <li key={o.cle} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(10,10,10,.1)]">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="m-0 text-[14px] font-semibold">
                  {o.libelle}
                  {o.prix && <span className="font-normal text-[color:var(--board-slate-mid)]"> — {o.prix}</span>}
                </p>
                <p className={texte}>{o.effet}</p>
                {tropDeMembres && (
                  <p id={`refus-${o.cle}`} className="m-0 text-[13.5px] leading-[1.5] text-[color:var(--board-signal-ink)]">
                    Retirez d&apos;abord {LIBELLES_PLAFONDS.membres(tropDeMembres.utilise - tropDeMembres.plafond)} : vous
                    en avez {tropDeMembres.utilise}, cette formule en permet {tropDeMembres.plafond}.
                  </p>
                )}
                {!tropDeMembres && enLecture.length > 0 && (
                  <p className={texte}>
                    Passeront en lecture seule (consultables, plus modifiables) :{" "}
                    {enLecture
                      .map((d) => LIBELLES_PLAFONDS[d.quota as keyof typeof LIBELLES_PLAFONDS]?.(d.utilise - d.plafond) ?? `${d.utilise - d.plafond}`)
                      .join(", ")}
                    , {enLecture.length === 1 && enLecture[0].utilise - enLecture[0].plafond === 1 ? "le plus récent" : "les plus récents"}.
                  </p>
                )}
              </div>
              <form action={changerFormuleAction}>
                <input type="hidden" name="formule" value={o.cle} />
                <BoutonEnvoi
                  variant={o.sens === "montee" ? "board" : "boardClair"}
                  disabled={!o.prix || !!tropDeMembres}
                  describedBy={tropDeMembres ? `refus-${o.cle}` : undefined}
                >
                  {o.sens === "montee" ? "Passer à cette formule" : "Prévoir ce changement"}
                </BoutonEnvoi>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
