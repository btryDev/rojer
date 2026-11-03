import { CONDITIONS, VERSION_CONDITIONS } from "@/lib/abonnements/conditions";

export const metadata = {
  title: "Conditions générales — Rojer",
};

/**
 * Les conditions générales (ADR-053 § 8), publiques : lues avant de
 * démarrer l'essai, et par l'URL que Stripe affiche au paiement. La version
 * est écrite sur la page : c'est elle que la preuve d'acceptation enregistre.
 */
export default function ConditionsPage() {
  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <article className="mx-auto w-full max-w-[680px]">
        <h1 className="board-titre m-0 text-[clamp(29px,3vw,39px)]">Conditions générales</h1>
        <p className="m-0 mt-3 text-[13px] text-[color:var(--board-slate-mid)]">Version {VERSION_CONDITIONS}</p>
        {CONDITIONS.map((s) => (
          <section key={s.titre} className="mt-8">
            <h2 className="board-titre m-0 text-[20px]">{s.titre}</h2>
            {s.paragraphes.map((p) => (
              <p key={p} className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
