import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Nouveau mot de passe — Rojer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    // Même enveloppe que /login : colonne étroite centrée sur le canvas. Cf.
    // le commentaire de `login/page.tsx` sur `mx-auto max-w-*`.
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Réinitialisation
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">
          Choisissez un nouveau mot de passe.
        </h1>

        <div className="carte-board mt-7 px-7 py-6 sm:px-8">
          <ResetPasswordForm token={token ?? null} />
        </div>
      </div>
    </main>
  );
}
