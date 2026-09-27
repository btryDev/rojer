import { D8222_5_ANCIENNETE, D8222_5_RYTHME } from "@/lib/prestataires/d8222-5";

/**
 * Les deux dates de l'attestation de vigilance (art. D. 8222-5), en un seul
 * endroit pour les deux formulaires qui les saisissent : la création du
 * prestataire et la fiche. Les libellés suivent les mots du texte.
 */
export function ChampsDatesAttestation({
  erreur,
  remiseLe,
  emiseLe,
}: {
  erreur: (champ: string) => string | undefined;
  /** Valeurs actuelles, « AAAA-MM-JJ ». */
  remiseLe?: string;
  emiseLe?: string;
}) {
  const aideRemise = `Le jour où le prestataire vous l'a remise — l'art. D. 8222-5 la fait remettre « ${D8222_5_RYTHME} ».`;
  const aideEmission = `La date portée sur l'attestation — l'art. D. 8222-5 la veut « ${D8222_5_ANCIENNETE} ».`;
  return (
    <>
      <div className="space-y-1">
        <label
          className="label-board font-normal text-[color:var(--board-slate-soft)]"
          htmlFor="attestationUrssafRemiseLe"
        >
          Remise le
        </label>
        <input
          className="champ-board"
          id="attestationUrssafRemiseLe"
          name="attestationUrssafRemiseLe"
          type="date"
          defaultValue={remiseLe}
          aria-invalid={Boolean(erreur("attestationUrssafRemiseLe"))}
          aria-describedby="aide-remise"
        />
        <p id="aide-remise" className="m-0 text-[11.5px] leading-[1.45] text-[color:var(--board-slate-soft)]">
          {aideRemise}
        </p>
        {erreur("attestationUrssafRemiseLe") && (
          <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {erreur("attestationUrssafRemiseLe")}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <label
          className="label-board font-normal text-[color:var(--board-slate-soft)]"
          htmlFor="attestationUrssafEmiseLe"
        >
          Émise le
        </label>
        <input
          className="champ-board"
          id="attestationUrssafEmiseLe"
          name="attestationUrssafEmiseLe"
          type="date"
          defaultValue={emiseLe}
          aria-invalid={Boolean(erreur("attestationUrssafEmiseLe"))}
          aria-describedby="aide-emission"
        />
        <p id="aide-emission" className="m-0 text-[11.5px] leading-[1.45] text-[color:var(--board-slate-soft)]">
          {aideEmission}
        </p>
        {erreur("attestationUrssafEmiseLe") && (
          <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {erreur("attestationUrssafEmiseLe")}
          </p>
        )}
      </div>
    </>
  );
}
