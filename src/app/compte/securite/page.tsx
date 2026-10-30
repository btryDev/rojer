import { Button } from "@/components/ui/button";
import { FilRetour } from "@/components/ui-kit/FilRetour";
import { fermerSessionsAction } from "@/lib/auth/actions";
import { decrireAppareil } from "@/lib/auth/appareil";
import { auth } from "@/lib/auth/better-auth";
import { entetesDeSession, requireUser } from "@/lib/auth/require-user";
import { formaterDateHeureFr } from "@/lib/dates";
import { ChangerMotDePasseForm } from "./ChangerMotDePasseForm";
import { DoubleAuthentification } from "./DoubleAuthentification";

export const metadata = {
  title: "Sécurité du compte — Rojer",
};

/**
 * Sécurité du compte (ADR-052, lots 3a et 3b) : changer de mot de passe, la
 * double authentification, voir les sessions ouvertes et les fermer
 * (ASVS V7.4.5). Les sessions viennent de
 * Better Auth, qui ne liste que celles du compte connecté ; la page n'en
 * affiche que l'identifiant, jamais le jeton.
 */
/**
 * Combien de codes de secours restent. Better Auth n'a pas de comptage : il
 * déchiffre la liste, dont on ne garde que la longueur — rien n'en sort de la
 * fonction. S'il échoue (secret du serveur changé, ligne absente), la page
 * reste servie : c'est d'elle qu'on désactive et qu'on régénère les codes.
 */
async function nombreCodesSecours(userId: string): Promise<number | null> {
  try {
    return (await auth.api.viewBackupCodes({ body: { userId } })).backupCodes.length;
  } catch (e) {
    console.error(JSON.stringify({ type: "codes_secours_illisibles", motif: String(e) }));
    return null;
  }
}

export default async function SecuriteComptePage() {
  const user = await requireUser();
  const entetes = await entetesDeSession();
  const [courante, sessions] = await Promise.all([
    auth.api.getSession({ headers: entetes }),
    auth.api.listSessions({ headers: entetes }),
  ]);
  const doubleAuth = courante?.user.twoFactorEnabled === true;
  const codesRestants = doubleAuth ? await nombreCodesSecours(user.id) : null;
  const triees = [...sessions].sort((a, b) => +b.createdAt - +a.createdAt);
  const autres = triees.filter((s) => s.id !== courante?.session.id);

  return (
    // Colonne étroite centrée, comme `/login` : une page de compte hors du
    // dossier, sans rail ni panneau — deux cartes de formulaire, rien à étaler
    // sur la largeur du canvas (cf. `login/page.tsx`).
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <FilRetour provenance={null} canonique={{ href: "/entreprises", label: "Mon dossier" }} />
        <h1 className="board-titre m-0 mt-6 text-[clamp(29px,3vw,39px)]">Sécurité du compte</h1>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {user.email} — votre mot de passe, la double authentification et les appareils connectés à votre compte.
        </p>

        <section className="carte-board mt-7 px-7 py-6 sm:px-8" aria-labelledby="titre-mdp">
          <h2 id="titre-mdp" className="board-titre m-0 text-[22px]">
            Mot de passe
          </h2>
          <p className="m-0 mt-1 mb-5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Changer de mot de passe ferme vos sessions sur les autres appareils.
          </p>
          <ChangerMotDePasseForm />
        </section>

        <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-2fa">
          <h2 id="titre-2fa" className="board-titre m-0 text-[22px]">
            Double authentification
          </h2>
          <p className="m-0 mt-1 mb-5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            {doubleAuth
              ? "Active : un code de votre application est demandé après le mot de passe."
              : "Facultative. Après le mot de passe, un code à six chiffres de votre téléphone : un mot de passe volé ne suffit plus."}
          </p>
          <DoubleAuthentification active={doubleAuth} codesRestants={codesRestants} />
        </section>

        <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-sessions">
          <h2 id="titre-sessions" className="board-titre m-0 text-[22px]">
            Sessions ouvertes
          </h2>
          <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
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
                    <p className="m-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {decrireAppareil(s.userAgent)}
                      {ici ? (
                        <span className="ml-2 text-[11.5px] font-normal text-[color:var(--board-blue-ink)]">
                          cet appareil
                        </span>
                      ) : null}
                    </p>
                    <p className="m-0 mt-0.5 text-[12.5px] tabular-nums text-[color:var(--board-slate-mid)]">
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
