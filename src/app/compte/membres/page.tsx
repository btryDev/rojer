import { FilRetour } from "@/components/ui-kit/FilRetour";
import { requireCompte } from "@/lib/auth/compte";
import { invitationsDuCompte, membresDuCompte } from "@/lib/auth/membres";
import { libelleRole } from "@/lib/auth/roles";
import { formaterDateLongueFr } from "@/lib/dates";
import { AnnulationInvitation, ChoixRole, DepartDuCompte, FormulaireInvitation, RetraitMembre } from "./GestesMembres";

export const metadata = {
  title: "Membres du compte — Rojer",
};

/**
 * Les personnes qui travaillent sur le compte (ADR-054). Le propriétaire
 * invite, change un rôle, retire ; chacun voit qui a accès, et peut partir.
 * Les membres et les invitations sont lus pour le compte vérifié par
 * `requireCompte`, jamais pour un identifiant reçu.
 */
export default async function MembresPage({
  searchParams,
}: {
  searchParams: Promise<{ reserve?: string }>;
}) {
  const { user, compte } = await requireCompte();
  const { reserve } = await searchParams;
  const proprietaire = compte.role === "owner";
  const [membres, invitations] = await Promise.all([
    membresDuCompte(compte.compteId),
    proprietaire ? invitationsDuCompte(compte.compteId) : Promise.resolve([]),
  ]);

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[640px]">
        <FilRetour provenance={null} canonique={{ href: "/entreprises", label: "Mon dossier" }} />
        <h1 className="board-titre m-0 mt-6 text-[clamp(29px,3vw,39px)]">Membres du compte</h1>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Les personnes qui travaillent sur vos dossiers. Chacune voit tous les établissements du compte, selon son
          rôle. Les prestataires n&apos;en font pas partie : ils accèdent par un lien.
        </p>

        {reserve === "proprietaire" && !proprietaire ? (
          <p className="m-0 mt-6 text-[14px] leading-[1.45] text-[color:var(--board-slate-ink)]">
            Ce geste est réservé à un propriétaire du compte : demandez-le à l&apos;un d&apos;eux.
          </p>
        ) : null}

        <section className="carte-board mt-7 px-7 py-6 sm:px-8" aria-labelledby="titre-membres">
          <h2 id="titre-membres" className="board-titre m-0 text-[22px]">
            Membres
          </h2>
          <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
            {membres.map((m) => {
              const moi = m.userId === user.id;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-4 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {m.nom || m.email}
                      {moi ? (
                        <span className="ml-2 text-[11.5px] font-normal text-[color:var(--board-blue-ink)]">vous</span>
                      ) : null}
                    </p>
                    <p className="m-0 mt-0.5 truncate text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {m.email} · {libelleRole(m.role)}
                    </p>
                  </div>
                  {proprietaire && !moi ? (
                    <div className="flex flex-wrap items-start gap-2">
                      <ChoixRole membreId={m.id} role={m.role} />
                      <RetraitMembre membreId={m.id} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {proprietaire ? (
          <>
            <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-inviter">
              <h2 id="titre-inviter" className="board-titre m-0 text-[22px]">
                Inviter une personne
              </h2>
              <p className="m-0 mt-1 mb-5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Elle reçoit un lien valable 7 jours, et crée son mot de passe si elle n&apos;a pas encore de compte
                Rojer.
              </p>
              <FormulaireInvitation />
            </section>

            {invitations.length > 0 ? (
              <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-invitations">
                <h2 id="titre-invitations" className="board-titre m-0 text-[22px]">
                  Invitations en attente
                </h2>
                <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
                  {invitations.map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center gap-4 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-[15px] font-semibold text-[color:var(--board-ink)]">{i.email}</p>
                        <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                          {libelleRole(i.role)} · valable jusqu&apos;au {formaterDateLongueFr(i.expireLe)}
                        </p>
                      </div>
                      <AnnulationInvitation invitationId={i.id} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-depart">
          <h2 id="titre-depart" className="board-titre m-0 text-[22px]">
            Quitter le compte
          </h2>
          <p className="m-0 mt-1 mb-5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Vous perdez l&apos;accès à ses dossiers ; ce que vous y avez saisi reste au compte. Le dernier
            propriétaire ne peut pas partir : il nomme d&apos;abord un autre propriétaire.
          </p>
          <DepartDuCompte />
        </section>
      </div>
    </main>
  );
}
