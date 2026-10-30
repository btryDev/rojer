"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import {
  activerDoubleAuthAction,
  confirmerDoubleAuthAction,
  desactiverDoubleAuthAction,
  regenererCodesSecoursAction,
  type DoubleAuthState,
} from "@/lib/auth/actions";
import type { DonneesActivation } from "@/lib/auth/double-authentification";

const etatInitial: DoubleAuthState = {};

const ALERTE =
  "m-0 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]";
const INFO =
  "m-0 rounded-[18px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[12.5px] leading-[1.5] text-[color:var(--board-blue-ink)]";

function Erreur({ texte }: { texte?: string }) {
  return texte ? (
    <p role="alert" className={ALERTE}>
      {texte}
    </p>
  ) : null;
}

/** Les codes de secours, montrés une seule fois. */
function CodesSecours({ codes }: { codes: string[] }) {
  return (
    <div className="rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4">
      <p className="m-0 text-[14px] font-semibold text-[color:var(--board-ink)]">Vos codes de secours</p>
      <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Notez-les ou imprimez-les, et rangez-les hors du téléphone : ils ne seront plus affichés.
        Chacun sert une fois, si vous n&apos;avez plus l&apos;application. Sans eux ni le
        téléphone, le compte ne peut pas être récupéré.
      </p>
      <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-x-6 gap-y-1.5 p-0 font-mono text-[14px] tabular-nums text-[color:var(--board-ink)]">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * La carte entière, un seul composant client pour que son état survive au
 * rafraîchissement qui suit l'activation : Better Auth renouvelle la session
 * en confirmant le premier code, le cookie neuf fait recharger la page, et
 * `active` passe à vrai pendant que les codes de secours sont à l'écran.
 */
export function DoubleAuthentification({
  active,
  codesRestants,
}: {
  active: boolean;
  codesRestants: number;
}) {
  const [preparation, preparer, enPreparation] = useActionState(activerDoubleAuthAction, etatInitial);
  // La clé de l'activation dont l'utilisateur a fini de noter les codes.
  const [terminee, setTerminee] = useState<string | null>(null);
  const activation = preparation.activation;

  if (activation && terminee !== activation.cle) {
    return (
      <EtapeActivation
        key={activation.cle}
        activation={activation}
        onTerminee={() => setTerminee(activation.cle)}
      />
    );
  }
  if (active) return <GererDoubleAuth codesRestants={codesRestants} />;
  return (
    <form action={preparer} className="flex flex-col gap-5">
      <ChampBoard
        id="password-activation"
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="current-password"
        required
      />
      <Erreur texte={preparation.error} />
      <Button type="submit" variant="board" size="board" disabled={enPreparation} className="w-full">
        {enPreparation ? "Préparation…" : "Activer la double authentification →"}
      </Button>
    </form>
  );
}

/**
 * Activer, seconde étape : scanner, puis le premier code de l'application
 * l'active — et alors seulement les codes de secours s'affichent.
 */
function EtapeActivation({
  activation,
  onTerminee,
}: {
  activation: DonneesActivation;
  onTerminee: () => void;
}) {
  const [confirmation, confirmer, enConfirmation] = useActionState(confirmerDoubleAuthAction, etatInitial);

  if (confirmation.confirmee) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className={INFO}>
          Double authentification activée. À la prochaine connexion, le code de l&apos;application
          sera demandé après le mot de passe.
        </p>
        <CodesSecours codes={activation.codesSecours} />
        <Button type="button" variant="board" size="board" className="w-full" onClick={onTerminee}>
          J&apos;ai noté mes codes →
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* Image intégrée, dessinée par le serveur : le secret ne part vers
            aucun service de QR code. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activation.qr}
          alt="QR code à scanner avec l'application d'authentification"
          width={208}
          height={208}
          className="flex-none rounded-[14px] bg-white"
        />
        <div className="min-w-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          <p className="m-0 text-[14px] font-semibold text-[color:var(--board-ink)]">
            1. Scannez ce QR code
          </p>
          <p className="m-0 mt-1">
            Avec une application d&apos;authentification : Google Authenticator, Microsoft
            Authenticator, 1Password, Bitwarden… Sans appareil photo, saisissez cette clé :
          </p>
          <p className="m-0 mt-2 break-all font-mono text-[13px] tabular-nums text-[color:var(--board-ink)]">
            {activation.cle}
          </p>
        </div>
      </div>
      <form action={confirmer} className="flex flex-col gap-5">
        <ChampBoard
          id="code-activation"
          name="code"
          label="2. Saisissez le code affiché"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          required
          autoFocus
        />
        <Erreur texte={confirmation.error} />
        <Button type="submit" variant="board" size="board" disabled={enConfirmation} className="w-full">
          {enConfirmation ? "Vérification…" : "Activer →"}
        </Button>
      </form>
    </div>
  );
}

/** Active : renouveler les codes de secours, ou désactiver. Mot de passe exigé. */
function GererDoubleAuth({ codesRestants }: { codesRestants: number }) {
  const [regeneration, regenerer, enRegeneration] = useActionState(regenererCodesSecoursAction, etatInitial);
  const [desactivation, desactiver, enDesactivation] = useActionState(desactiverDoubleAuthAction, etatInitial);
  const enCours = enRegeneration || enDesactivation;

  return (
    <div className="flex flex-col gap-5">
      {regeneration.codes ? (
        <CodesSecours codes={regeneration.codes} />
      ) : (
        <p
          className={
            codesRestants <= 3
              ? ALERTE
              : "m-0 text-[12.5px] leading-[1.55] tabular-nums text-[color:var(--board-slate-mid)]"
          }
        >
          {codesRestants === 0
            ? "Plus aucun code de secours : générez-en de nouveaux."
            : `${codesRestants} code${codesRestants > 1 ? "s" : ""} de secours ${
                codesRestants > 1 ? "restants" : "restant"
              }${codesRestants <= 3 ? " : pensez à en générer de nouveaux." : "."}`}
        </p>
      )}
      {/* Un seul mot de passe pour les deux gestes : chaque bouton porte son
          action (`formAction`). */}
      <form className="flex flex-col gap-5">
        <ChampBoard
          id="password-gestion"
          name="password"
          type="password"
          label="Mot de passe"
          autoComplete="current-password"
          required
        />
        <Erreur texte={regeneration.error ?? desactivation.error} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            formAction={regenerer}
            variant="boardClair"
            size="board"
            disabled={enCours}
            className="flex-1"
          >
            {enRegeneration ? "Génération…" : "Nouveaux codes de secours"}
          </Button>
          <Button
            type="submit"
            formAction={desactiver}
            variant="boardClair"
            size="board"
            disabled={enCours}
            className="flex-1"
          >
            {enDesactivation ? "Désactivation…" : "Désactiver"}
          </Button>
        </div>
      </form>
    </div>
  );
}
