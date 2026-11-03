import { requireInvitationDeLaSession } from "@/lib/auth/scope";
import { libelleRole } from "@/lib/auth/roles";
import { ReponseInvitation } from "./ReponseInvitation";

export const metadata = {
  title: "Invitation — Rojer",
};

/**
 * Le lien de l'e-mail d'invitation (ADR-054 § 5). Sans session, la garde de
 * session renvoie à la connexion, qui revient ici. Une invitation adressée à
 * une autre adresse, expirée ou inexistante répond 404, sans rien en dire.
 */
export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, invitation } = await requireInvitationDeLaSession(id);
  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <h1 className="board-titre m-0 text-[clamp(29px,3vw,39px)]">Rejoindre « {invitation.compte} »</h1>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {invitation.invitePar} vous invite à travailler sur ce compte Rojer, en tant que{" "}
          <strong>{libelleRole(invitation.role)}</strong>. Vous êtes connecté avec {user.email}.
        </p>
        <section className="carte-board mt-7 px-7 py-6 sm:px-8">
          <ReponseInvitation invitationId={invitation.id} />
        </section>
      </div>
    </main>
  );
}
