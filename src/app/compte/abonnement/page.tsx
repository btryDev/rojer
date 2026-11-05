import { FilRetour } from "@/components/ui-kit/FilRetour";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";
import { getOptionalCompte } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { abonnementDuCompte, contexteDroits, offreLancee } from "@/lib/abonnements/saisie";
import { droitsDe, libelleStatut } from "@/lib/abonnements/droits";
import { formaterDateLongueFr } from "@/lib/dates";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ouvrirPortailAction, souscrireAction } from "@/lib/abonnements/actions";
import { essaiDisponible, PAGE_ESSAI } from "@/lib/abonnements/essai";
import { CLES_FORMULES, FORMULES, PERIODICITES, formuleDeLookupKey, lookupKey } from "@/lib/abonnements/formules";

export const metadata = {
  title: "Abonnement — Rojer",
};

/**
 * L'abonnement du compte (ADR-053) : son état, et pourquoi une saisie a été
 * refusée (`verifierSaisie` y renvoie avec `?saisie=fermee`). La lecture et
 * l'export ne sont jamais fermés — la page le dit. Le propriétaire y gère
 * l'abonnement (ADR-053 §§ 10, 12) : l'essai s'il est encore disponible, le
 * portail Stripe tant qu'un abonnement court, Checkout après sa fin. Un autre
 * membre voit l'état, sans les boutons.
 */
/** Un abonnement terminé : on en souscrit un nouveau (Checkout). */
const TERMINES = new Set(["canceled", "incomplete_expired"]);
const LOOKUP_DEFAUT = lookupKey("essentiel", "mensuel");

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ saisie?: string; stripe?: string; paiement?: string }>;
}) {
  // Sans compte encore (rien créé), la page se lit quand même : aucun
  // abonnement (ADR-054). `requireCompte` renverrait à l'onboarding.
  await requireUser();
  const c = await getOptionalCompte();
  const { saisie, stripe, paiement } = await searchParams;
  const ctx = contexteDroits();
  const ouvert = offreLancee(ctx);
  // Une seule lecture : la ligne sert à l'état affiché et aux droits.
  const ligne = c ? await abonnementDuCompte(c.db, c.compte.compteId) : null;
  const droits = droitsDe(ligne, ctx);
  const proprietaire = c?.compte.role === "owner";
  const geste = !ouvert
    ? null
    : !proprietaire
      ? "membre"
      : !c || (await essaiDisponible(c.db, c.compte.compteId))
        ? "essai"
        : ligne?.statut && !TERMINES.has(ligne.statut)
          ? "portail"
          : "souscrire";
  const formule = formuleDeLookupKey(ligne?.formule);

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
                  <dd className="m-0">
                    {formule
                      ? `${FORMULES[formule.formule].libelle}, ${formule.periodicite === "mensuel" ? "mensuelle" : "annuelle"}`
                      : ligne.formule}
                  </dd>
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

        {stripe === "indisponible" && (
          <p role="alert" className="m-0 mt-6 text-[12.5px] text-[color:var(--board-signal-ink)]">
            Stripe ne répond pas pour le moment : réessayez dans un instant.
          </p>
        )}
        {paiement === "termine" && (
          <p role="status" className="m-0 mt-6 text-[14px] leading-[1.5] text-[color:var(--board-slate-ink)]">
            Paiement terminé. L&apos;abonnement s&apos;affiche ici dès que Stripe l&apos;a confirmé, en
            général en quelques secondes : rechargez la page.
          </p>
        )}

        {geste && (
          <section className="carte-board mt-5 px-7 py-6 sm:px-8" aria-labelledby="titre-gerer">
            <h2 id="titre-gerer" className="board-titre m-0 text-[22px]">
              Gérer
            </h2>
            {geste === "membre" && (
              <p className="m-0 mt-2 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Seul le propriétaire du compte gère l&apos;abonnement.
              </p>
            )}
            {geste === "essai" && (
              <>
                <p className="m-0 mt-2 mb-5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  30 jours gratuits, sans carte bancaire, dans la formule de votre choix.
                </p>
                <Link href={PAGE_ESSAI} className={buttonVariants({ variant: "board", size: "board" })}>
                  Démarrer mon essai gratuit
                </Link>
              </>
            )}
            {geste === "portail" && (
              <form action={ouvrirPortailAction}>
                <p className="m-0 mt-2 mb-5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  Ajouter ou changer de carte, changer de formule, résilier, télécharger vos factures : sur la page
                  sécurisée de Stripe, notre prestataire de paiement.
                </p>
                <Button type="submit" variant="board" size="board">
                  Gérer mon abonnement
                </Button>
              </form>
            )}
            {geste === "souscrire" && (
              <form action={souscrireAction}>
                <p className="m-0 mt-2 mb-4 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  Choisissez une formule : le paiement se fait sur la page sécurisée de Stripe.
                </p>
                <label className="label-board" htmlFor="formule">
                  Formule
                </label>
                <select id="formule" name="formule" className="champ-board mt-1.5 mb-5" defaultValue={LOOKUP_DEFAUT}>
                  {CLES_FORMULES.flatMap((f) =>
                    PERIODICITES.map((p) => (
                      <option key={lookupKey(f, p)} value={lookupKey(f, p)}>
                        {FORMULES[f].libelle}, facturation {p === "mensuel" ? "mensuelle" : "annuelle"}
                      </option>
                    )),
                  )}
                </select>
                <Button type="submit" variant="board" size="board">
                  Souscrire
                </Button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
