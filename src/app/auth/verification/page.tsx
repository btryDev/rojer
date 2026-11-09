import { activerCompteAction } from "@/lib/auth/actions";
import { LIEN_ACTIVATION_INVALIDE } from "@/lib/auth/mot-de-passe";
import { FormulaireMotDePasse } from "../FormulaireMotDePasse";

export const metadata = {
  title: "Activer votre compte — Rojer",
};

/**
 * Le lien de confirmation d'adresse (ADR-052) : `/auth/verification?token=…`,
 * construit dans `better-auth.ts`. L'ouvrir ne confirme rien : on y choisit
 * son mot de passe, et l'envoi du formulaire confirme l'adresse
 * (`activerCompteAction`, audit du 2026-11-10). Aucune session n'est ouverte.
 */
export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    // Même enveloppe que /login et /auth/reinitialisation.
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Activation
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">
          Choisissez votre mot de passe.
        </h1>
        <p className="m-0 mt-3 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Votre adresse sera confirmée et votre compte activé avec ce mot de passe.
        </p>

        <div className="carte-board mt-7 px-7 py-6 sm:px-8">
          <FormulaireMotDePasse
            token={token ?? null}
            action={activerCompteAction}
            libelleChamp="Mot de passe"
            libelleBouton="Activer mon compte →"
            libelleEnCours="Activation…"
            lienInvalide={{ message: LIEN_ACTIVATION_INVALIDE, href: "/signup", libelle: "Refaire l'inscription →" }}
          />
        </div>
      </div>
    </main>
  );
}
