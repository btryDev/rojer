import { FilRetour } from "@/components/ui-kit/FilRetour";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";
import { requireCompte } from "@/lib/auth/compte";
import { abonnementDuCompte, contexteDroits, offreLancee } from "@/lib/abonnements/saisie";
import { droitsDe, libelleStatut } from "@/lib/abonnements/droits";
import { formaterDateLongueFr } from "@/lib/dates";

export const metadata = {
  title: "Abonnement — Rojer",
};

/**
 * L'abonnement du compte (ADR-053) : son état, et pourquoi une saisie a été
 * refusée (`verifierSaisie` y renvoie avec `?saisie=fermee`). La lecture et
 * l'export ne sont jamais fermés — la page le dit. Le choix d'une formule et
 * le portail de gestion viennent au lot 4.
 */
export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ saisie?: string }>;
}) {
  const { user, db } = await requireCompte();
  const { saisie } = await searchParams;
  const ctx = contexteDroits();
  const ouvert = offreLancee(ctx);
  // Une seule lecture : la ligne sert à l'état affiché et aux droits.
  const ligne = await abonnementDuCompte(db, user.id);
  const droits = droitsDe(ligne, ctx);

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <FilRetour provenance={null} canonique={{ href: "/entreprises", label: "Mon dossier" }} />
        <h1 className="board-titre m-0 mt-6 text-[clamp(29px,3vw,39px)]">Abonnement</h1>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Vos dossiers restent toujours consultables et exportables, quel que soit l&apos;état de l&apos;abonnement.
        </p>

        {saisie === "fermee" && !droits.saisie && (
          <p className="m-0 mt-6 text-[14px] leading-[1.45] text-[color:var(--board-slate-ink)]">
            Votre dernière modification n&apos;a pas été enregistrée.
          </p>
        )}

        {droits.bandeau && <BandeauAbonnement bandeau={droits.bandeau} avecLien={false} className="mt-6" />}

        <section className="carte-board mt-7 px-7 py-6 sm:px-8" aria-labelledby="titre-etat">
          <h2 id="titre-etat" className="board-titre m-0 text-[22px]">
            État
          </h2>
          {ouvert ? (
            <dl className="m-0 mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
              <dt className="text-[color:var(--board-slate-mid)]">Abonnement</dt>
              <dd className="m-0 font-semibold">{libelleStatut(ligne?.statut ?? null)}</dd>
              {ligne?.formule && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Formule</dt>
                  <dd className="m-0">{ligne.formule}</dd>
                </>
              )}
              {ligne?.finEssai && ligne.statut === "trialing" && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Fin de l&apos;essai</dt>
                  <dd className="m-0">{formaterDateLongueFr(ligne.finEssai)}</dd>
                </>
              )}
              {ligne?.finPeriode && (
                <>
                  <dt className="text-[color:var(--board-slate-mid)]">Période en cours jusqu&apos;au</dt>
                  <dd className="m-0">{formaterDateLongueFr(ligne.finPeriode)}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Les abonnements ne sont pas encore ouverts : toutes les fonctions de Rojer restent accessibles.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
