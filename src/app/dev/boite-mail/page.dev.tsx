import { lireBoite, BOITE_CAPACITE } from "@/lib/email/dev-outbox";
import { formaterDateHeureFr } from "@/lib/dates";

/**
 * Boîte mail de développement — la lecture des messages que le driver
 * `console` n'a envoyés nulle part.
 *
 * **Cette page n'existe pas en production.** Son nom de fichier est
 * `page.dev.tsx`, et `next.config.ts` n'ajoute `dev.tsx` à `pageExtensions`
 * qu'hors production : dans un build de production elle n'est pas compilée en
 * route. Le module qu'elle importe lève par ailleurs à son chargement sous
 * `NODE_ENV=production`. Les raisons de ce dispositif, et surtout ce qu'il ne
 * couvre pas, sont écrites dans `src/lib/email/dev-outbox.ts`.
 *
 * On lit ici le lien et le code comme le destinataire les lirait dans sa
 * boîte : c'est le même message, au même endroit. Le demandeur d'une
 * signature, lui, ne reçoit pas le code — c'est toute la valeur du dispositif
 * et il n'y a pas de raccourci qui le contourne.
 */
export const dynamic = "force-dynamic";

const RE_LIEN_ACCES = /https?:\/\/\S+\/acces\/[A-Za-z0-9_-]+/;

export default async function BoiteMailDevPage() {
  const messages = lireBoite();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
      <header className="space-y-2">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Développement
        </p>
        <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em]">
          Boîte mail locale
        </h1>
        <p className="text-[0.9rem] leading-relaxed text-[color:var(--muted-foreground)]">
          Les {BOITE_CAPACITE} derniers messages produits par le driver{" "}
          <code>console</code>, dans l&apos;ordre d&apos;arrivée inverse. Ils
          n&apos;ont été envoyés à personne. Cette page n&apos;est pas compilée
          en production.
        </p>
      </header>

      {messages.length === 0 ? (
        <p className="mt-10 rounded-[18px] bg-[color:var(--board-card)] p-6 text-[0.9rem] text-[color:var(--muted-foreground)] ring-1 ring-[color:var(--board-slate-line)]">
          Aucun message. Demandez une signature depuis une fiche : le lien et
          le code de confirmation arriveront ici.
        </p>
      ) : (
        <ol className="mt-10 space-y-6">
          {messages.map((m) => {
            const lien = m.text.match(RE_LIEN_ACCES)?.[0];
            return (
              <li
                key={m.id}
                className="rounded-[18px] bg-[color:var(--board-card)] p-6 ring-1 ring-[color:var(--board-slate-line)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="m-0 text-[13px] font-semibold text-[color:var(--board-ink)]">
                    {m.subject}
                  </p>
                  <p className="m-0 font-mono text-[11px] text-[color:var(--board-slate-soft)]">
                    {formaterDateHeureFr(m.recuLe)}
                  </p>
                </div>
                <p className="mt-1 text-[12.5px] text-[color:var(--muted-foreground)]">
                  À : {m.to}
                </p>

                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-[12px] bg-[color:var(--board-slate-line)]/30 p-4 font-mono text-[12.5px] leading-relaxed text-[color:var(--board-ink)]">
                  {m.text}
                </pre>

                {lien && (
                  <a
                    href={lien}
                    className="mt-4 inline-block font-mono text-[0.8rem] uppercase tracking-[0.12em] text-[color:var(--board-blue-ink)] hover:underline"
                  >
                    Ouvrir la page d&apos;accès ↗
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
