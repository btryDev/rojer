import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "Vérifiez votre e-mail — Rojer",
};

export default async function VerificationEnAttentePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    // Colonne étroite centrée, comme les autres écrans d'authentification —
    // un peu plus large, celui-ci porte une carte et un déroulé. Cf. le
    // commentaire de `login/page.tsx` sur `mx-auto max-w-*`.
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Dernière étape
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">
          Vérifiez votre boîte mail.
        </h1>

        <div className="carte-board mt-7 px-7 py-6 sm:px-8">
          <div className="flex items-start gap-4">
            <PictoMail />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-ink)]">
                Un lien de confirmation a été envoyé à
                {email ? (
                  <>
                    {" "}
                    <span className="break-all font-semibold">{email}</span>
                  </>
                ) : (
                  " votre adresse"
                )}
                .
              </p>
              <p className="m-0 mt-2.5 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Cliquez dessus pour activer votre compte, puis revenez vous
                connecter.
              </p>
            </div>
          </div>
        </div>

        {/* La numérotation se garde : ces trois-là se font dans cet ordre.
            Les crans reprennent ceux de la page publique (« Une prise en
            main rapide ») — même pastille d'encre, même retrait du corps :
            c'est le premier écran après elle, il ne doit pas changer de
            voix. Le filet est posé sur le <li>, jamais sur son contenu. */}
        <ol className="m-0 mt-9 flex list-none flex-col p-0">
          <Etape
            numero={1}
            titre="Ouvrez le mail"
            corps="De la part de Rojer — sujet « Rojer — confirmez votre adresse ». Le lien vaut 24 heures. Regardez dans vos spams au cas où."
          />
          <Etape
            numero={2}
            titre="Cliquez sur le lien"
            corps="Vous serez redirigé·e automatiquement ici, connecté·e."
          />
          <Etape
            numero={3}
            titre="Ouvrez votre dossier"
            corps="Premier établissement, équipements, calendrier. 10 minutes."
          />
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link
            href="/login"
            className={buttonVariants({ variant: "board", size: "board" })}
          >
            J&apos;ai déjà cliqué · Me connecter →
          </Link>
          <span className="text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Mail absent ?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-blue-ink)]"
            >
              Réessayer
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}

function Etape({
  numero,
  titre,
  corps,
}: {
  numero: number;
  titre: string;
  corps: string;
}) {
  return (
    <li className="border-t border-[color:var(--board-slate-line)] py-5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3">
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-[color:var(--board-ink)] text-[12.5px] font-semibold tabular-nums text-[color:var(--board-card)]">
          {numero}
        </span>
        <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
          {titre}
        </p>
      </div>
      <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)] sm:pl-[44px]">
        {corps}
      </p>
    </li>
  );
}

function PictoMail() {
  return (
    // Une enveloppe, pas une icône de thème : le creux ardoise fait le
    // papier, l'encre le trait, et la pastille bleue dit qu'il y a quelque
    // chose dedans. Rayon relevé à 3,5 — le board n'a pas d'angle vif.
    <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0 text-[color:var(--board-ink)]">
      <rect
        x="6"
        y="10"
        width="28"
        height="20"
        rx="3.5"
        fill="var(--board-slate-pale)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M 6.5 11 L 20 22 L 33.5 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="11" r="4" fill="var(--board-blue-ink)" />
    </svg>
  );
}
