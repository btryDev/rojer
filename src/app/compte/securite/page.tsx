import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { fermerSessionsAction } from "@/lib/auth/actions";
import { decrireAppareil } from "@/lib/auth/appareil";
import { auth } from "@/lib/auth/better-auth";
import { requireUser } from "@/lib/auth/require-user";
import { formaterDateHeureFr } from "@/lib/dates";
import { ChangerMotDePasseForm } from "./ChangerMotDePasseForm";

export const metadata = {
  title: "Sécurité du compte — Rojer",
};

/**
 * Sécurité du compte (ADR-052, lot 3a) : changer de mot de passe, voir les
 * sessions ouvertes et les fermer (ASVS V7.4.5). Les sessions viennent de
 * Better Auth, qui ne liste que celles du compte connecté ; la page n'en
 * affiche que l'identifiant, jamais le jeton.
 */
export default async function SecuriteComptePage() {
  const user = await requireUser();
  const entetes = await headers();
  const [courante, sessions] = await Promise.all([
    auth.api.getSession({ headers: entetes }),
    auth.api.listSessions({ headers: entetes }),
  ]);
  const triees = [...sessions].sort((a, b) => +b.createdAt - +a.createdAt);
  const autres = triees.filter((s) => s.id !== courante?.session.id);

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <Link
          href="/entreprises"
          className="text-[13px] text-[color:var(--board-slate-mid)] underline decoration-[color:var(--board-slate-soft)] underline-offset-4 hover:text-[color:var(--board-ink)]"
        >
          ← Retour au dossier
        </Link>
        <p className="board-eyebrow m-0 mt-6 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Compte
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">Sécurité du compte</h1>
        <p className="m-0 mt-3 text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {user.email} — votre mot de passe et les appareils connectés à votre compte.
        </p>

        <section className="carte-board mt-7 px-7 py-6 sm:px-8" aria-labelledby="titre-mdp">
          <h2 id="titre-mdp" className="m-0 text-[17px] font-semibold text-[color:var(--board-ink)]">
            Mot de passe
          </h2>
          <p className="m-0 mt-1 mb-5 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            Changer de mot de passe ferme vos sessions sur les autres appareils.
          </p>
          <ChangerMotDePasseForm />
        </section>

        <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-sessions">
          <h2 id="titre-sessions" className="m-0 text-[17px] font-semibold text-[color:var(--board-ink)]">
            Sessions ouvertes
          </h2>
          <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            Un appareil que vous ne reconnaissez pas ? Fermez sa session, puis changez votre mot de passe.
          </p>
          <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
            {triees.map((s) => {
              const ici = s.id === courante?.session.id;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-4 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[13.5px] font-medium text-[color:var(--board-ink)]">
                      {decrireAppareil(s.userAgent)}
                      {ici ? (
                        <span className="ml-2 text-[11.5px] font-normal text-[color:var(--board-blue-ink)]">
                          cet appareil
                        </span>
                      ) : null}
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] text-[color:var(--board-slate-mid)]">
                      Ouverte le {formaterDateHeureFr(new Date(s.createdAt))}
                      {s.ipAddress ? ` · ${s.ipAddress}` : ""}
                    </p>
                  </div>
                  {ici ? null : (
                    <form action={fermerSessionsAction}>
                      <input type="hidden" name="session" value={s.id} />
                      <Button type="submit" variant="boardClair" size="boardSm">
                        Fermer
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {autres.length > 1 ? (
            <form action={fermerSessionsAction} className="mt-5">
              <input type="hidden" name="session" value="autres" />
              <Button type="submit" variant="boardClair" size="board" className="w-full">
                Fermer toutes les autres sessions
              </Button>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
