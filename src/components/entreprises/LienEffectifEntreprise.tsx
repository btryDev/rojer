import Link from "next/link";

/**
 * Le chemin vers l'effectif de l'entreprise — un seul, pour que les écrans qui
 * y renvoient mènent au même champ (`#effectif`, l'`id` du champ dans
 * `EntrepriseForm`).
 *
 * POURQUOI CE LIEN EXISTE (contre-lecture C37, « GRAVE »). Le formulaire de
 * l'établissement, celui de l'entreprise et la raison « à confirmer » du
 * moteur disaient au dirigeant de mettre l'effectif de l'entreprise à jour
 * « sur la fiche de l'entreprise » — et aucun lien de l'interface ne menait à
 * `/entreprises/[id]/modifier`. Une consigne sans chemin ne se suit pas.
 */
//
// [2026-11-03 : l'effectif se règle dans Équipe, et celui de la société en est
// la somme. Le chemin mène à la page Équipe d'un de ses établissements
// (`/entreprises/[id]/effectif`).]
export function hrefEffectifEntreprise(entrepriseId: string): string {
  return `/entreprises/${entrepriseId}/effectif`;
}

export const LIBELLE_LIEN_EFFECTIF_ENTREPRISE =
  "Mettre à jour l'effectif dans Équipe";

/**
 * L'effectif déclaré de l'entreprise, et le lien pour le corriger. Rendu là où
 * un nombre du site se saisit ou s'affiche, et près de chaque ligne retenue
 * « à confirmer ».
 */
export function LienEffectifEntreprise({
  entrepriseId,
  effectif,
  className,
}: {
  entrepriseId: string;
  /** `null` : ne pas rappeler le nombre, seulement le chemin. */
  effectif: number | null;
  className?: string;
}) {
  return (
    <p
      className={
        className ??
        "m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
      }
    >
      {effectif !== null ? (
        <>
          Salariés de la société, tous établissements :{" "}
          <span className="font-mono tabular-nums text-[color:var(--board-ink)]">
            {effectif}
          </span>
          .{" "}
        </>
      ) : null}
      <Link
        data-ecriture
        href={hrefEffectifEntreprise(entrepriseId)}
        className="font-medium text-[color:var(--board-blue-ink)] underline underline-offset-2 hover:text-[color:var(--board-ink)]"
      >
        {LIBELLE_LIEN_EFFECTIF_ENTREPRISE}
      </Link>
    </p>
  );
}
