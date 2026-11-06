// Changer de formule, pour un abonnement qui paie (ADR-053 § 10) : chaque
// option dit, AVANT le clic, quand elle s'applique et ce qu'elle fait — une
// montée tout de suite (différence prélevée), une baisse à la fin de la
// période payée ; ce qui dépasserait passe en lecture seule, et trop
// d'utilisateurs empêchent la baisse (§ 14).

import { Button } from "@/components/ui/button";
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
  depassements: Depassement[];
};

const texte = "m-0 text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]";

export function ChangerDeFormule({
  options,
  finPeriode,
  baisse,
}: {
  options: OptionDeFormule[];
  finPeriode: Date | null;
  /** Une baisse déjà planifiée : vers quoi, et quand. */
  baisse: { libelle: string; le: Date } | null;
}) {
  const fin = finPeriode ? `le ${formaterDateLongueFr(finPeriode)}` : "à la fin de la période payée";
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
            <Button type="submit" variant="boardClair" size="board">
              Garder ma formule
            </Button>
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
                <p className={texte}>
                  {o.sens === "montee"
                    ? "Tout de suite : la différence pour la période en cours est prélevée maintenant."
                    : `À la fin de votre période payée, ${fin}, sans remboursement de la période en cours.`}
                </p>
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
                    , les plus récents.
                  </p>
                )}
              </div>
              <form action={changerFormuleAction}>
                <input type="hidden" name="formule" value={o.cle} />
                <Button
                  type="submit"
                  variant={o.sens === "montee" ? "board" : "boardClair"}
                  size="board"
                  disabled={!o.prix || !!tropDeMembres}
                  aria-describedby={tropDeMembres ? `refus-${o.cle}` : undefined}
                >
                  {o.sens === "montee" ? "Passer à cette formule" : "Prévoir ce changement"}
                </Button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
