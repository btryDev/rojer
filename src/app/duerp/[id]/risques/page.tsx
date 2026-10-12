import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { LigneHorsReferentiel } from "@/components/duerps/MentionHorsReferentiel";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { activitesDuSecteur } from "@/lib/activites/reponses";
import { construireEtapes } from "@/lib/duerps/etapes";
import { etatEtapeTransverses } from "@/lib/transverses/etat";
import { getDuerp } from "@/lib/duerps/queries";
import { estHorsReferentiel, unitesHorsReferentiel } from "@/lib/risques/helpers";

const ETAPES_MARCHE = [
  {
    n: "01",
    titre: "Ouvrir une unité",
    corps:
      "Cliquez sur une unité de la liste ci-dessous pour accéder à ses risques.",
  },
  {
    n: "02",
    titre: "Cocher ce qui s'applique",
    corps:
      "Les risques types de votre secteur vous sont proposés, décochés. Cochez ceux qui vous concernent — les autres seront considérés comme écartés.",
  },
  {
    n: "03",
    titre: "Coter chaque risque retenu",
    corps:
      "3 questions comportementales par risque — gravité, probabilité, maîtrise. La criticité se calcule automatiquement.",
  },
  {
    n: "04",
    titre: "Ajouter vos risques spécifiques",
    corps:
      "Un risque particulier à votre activité ? Ajoutez-le manuellement et cotez-le comme les autres.",
  },
] as const;

export default async function RisquesOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const unitesVisibles = duerp.unites.filter((u) => !u.estTransverse);
  const unitesOk = unitesVisibles.length > 0;
  const etapes = construireEtapes(id, "risques", {
    secteurOk: Boolean(duerp.referentielSecteurId),
    unitesOk,
    risquesOk: true,
    transverses: etatEtapeTransverses(duerp),
    activitesPosees: activitesDuSecteur(duerp.referentielSecteurId).length > 0,
  });

  const totalRisques = unitesVisibles.reduce(
    (acc, u) => acc + u.risques.length,
    0,
  );
  const unitesSansRisqueSansJustif = unitesVisibles.filter(
    (u) => u.risques.length === 0 && !u.aucunRisqueJustif,
  );
  // Le fait se voit d'abord d'ici : entrer dans chaque unité pour découvrir
  // que le référentiel ne la couvre pas, c'est l'apprendre trop tard.
  const horsRef = unitesHorsReferentiel(unitesVisibles);

  return (
    <div className="flex flex-col gap-[22px]">
      <WizardSteps etapes={etapes} />

      <header className="max-w-[68ch]">
        <p className="board-eyebrow m-0 inline-flex items-center text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Risques par unité
          <InfoTooltip align="left">
            Un « risque professionnel » est tout ce qui peut causer un
            accident ou une atteinte à la santé au travail (coupure, chute,
            charge mentale…). Le DUERP doit inventorier ceux présents dans
            chaque unité.
          </InfoTooltip>
        </p>
        <h2 className="board-titre m-0 mt-3 text-[clamp(23px,2.1vw,30px)]">
          Pour chaque unité, cochez les risques qui s&apos;appliquent.
        </h2>
      </header>

      {/* Carte pédagogique, pas état : aucune surface colorée, le bleu du
          board sert seulement à numéroter la marche à suivre. */}
      <section aria-label="Marche à suivre pour chaque unité" className="carte-board">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--board-slate-line)] px-7 py-4 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Marche à suivre
          </p>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Sur chaque unité de travail
          </p>
        </div>

        <ol className="grid list-none grid-cols-1 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES_MARCHE.map((e, i, arr) => {
            const estDernier = i === arr.length - 1;
            const estAvantDernier = i === arr.length - 2;
            return (
              <li
                key={e.n}
                className={[
                  "flex items-start gap-3 px-6 py-5 sm:px-7",
                  !estDernier
                    ? "border-b border-[color:var(--board-slate-line)]"
                    : "",
                  estAvantDernier ? "sm:border-b-0" : "",
                  i % 2 === 0
                    ? "sm:border-r sm:border-[color:var(--board-slate-line)]"
                    : "",
                  "lg:border-b-0",
                  !estDernier
                    ? "lg:border-r lg:border-[color:var(--board-slate-line)]"
                    : "lg:border-r-0",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--board-blue-pale)] font-mono text-[11px] font-semibold tabular-nums text-[color:var(--board-blue-ink)]"
                >
                  {e.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                    {e.titre}
                  </p>
                  <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    {e.corps}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-baseline gap-3 border-t border-[color:var(--board-slate-line)] px-7 py-3 sm:px-8">
          <span
            aria-hidden
            className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]"
          >
            Cas particulier
          </span>
          <p className="m-0 min-w-0 flex-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Si une unité n&apos;a aucun risque significatif, vous pourrez le
            déclarer explicitement sur sa page.
          </p>
        </div>
      </section>

      <section className="carte-board overflow-clip">
        <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] tabular-nums text-[color:var(--board-slate-soft)]">
            {String(unitesVisibles.length).padStart(2, "0")} unité
            {unitesVisibles.length > 1 ? "s" : ""} · {String(totalRisques).padStart(2, "0")} risque
            {totalRisques > 1 ? "s" : ""}
          </p>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Cliquez pour ouvrir
          </p>
        </div>

        <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
          {unitesVisibles.map((u) => {
            const nbRisques = u.risques.length;
            const declaree = Boolean(u.aucunRisqueJustif);
            let etatLibelle = "à cocher";
            if (nbRisques > 0)
              etatLibelle = nbRisques > 1 ? "risques" : "risque";
            else if (declaree) etatLibelle = "déclaré";
            return (
              <li key={u.id}>
                <Link
                  href={`/duerp/${id}/risques/${u.id}`}
                  className="group flex items-start justify-between gap-6 px-7 py-5 transition-colors hover:bg-[color:var(--board-slate-pale)] sm:px-8"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {u.nom}
                    </p>
                    {u.description && (
                      <p className="m-0 mt-1 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                        {u.description}
                      </p>
                    )}
                    {estHorsReferentiel(u) && <LigneHorsReferentiel />}
                    {nbRisques === 0 && declaree && (
                      // Un fait de saisie — la déclaration a été faite et
                      // justifiée. Le vert du board dit « fait », jamais
                      // « conforme » (interdits 16 et 17).
                      <p className="board-eyebrow m-0 mt-2 text-[10px] tracking-[0.16em] text-[color:var(--board-green-ink)]">
                        ✓ Aucun risque significatif — justifié
                      </p>
                    )}
                    {nbRisques === 0 && !declaree && (
                      <p className="board-eyebrow m-0 mt-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                        ⚠ à cocher ou à déclarer sans risque
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="m-0 font-mono text-[18px] tabular-nums leading-none text-[color:var(--board-ink)]">
                        {nbRisques === 0 && declaree
                          ? "—"
                          : String(nbRisques).padStart(2, "0")}
                      </p>
                      <p className="board-eyebrow m-0 mt-1.5 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                        {etatLibelle}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-all group-hover:translate-x-1 group-hover:text-[color:var(--board-ink)]"
                    >
                      Ouvrir →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {horsRef.length > 0 && (
        // Un fait sur le référentiel, pas un état du dossier : sous-bloc
        // creux, sans champ de couleur.
        <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Hors référentiel sectoriel
          </p>
          <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
            {horsRef.length > 1
              ? `${horsRef.length} unités ne correspondent`
              : "1 unité ne correspond"}{" "}
            à aucune unité type du référentiel sectoriel chargé pour votre
            activité —{" "}
            {horsRef.map((u) => u.nom).join(", ")}. Aucun risque type n&apos;y
            est proposé : leur inventaire, leur cotation et leurs mesures sont
            entièrement à votre main. Le DUERP généré en portera la mention.
          </p>
        </div>
      )}

      {unitesSansRisqueSansJustif.length > 0 && (
        // Point à vérifier avant de continuer : l'encre de signal le dit,
        // sans champ rose — aucune échéance n'est dépassée (interdit 3).
        <div className="carte-board px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-signal-ink)]">
            Avertissement
          </p>
          <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
            {unitesSansRisqueSansJustif.length} unité
            {unitesSansRisqueSansJustif.length > 1 ? "s n'ont" : " n'a"} aucun
            risque coché. Vous pouvez continuer, mais il est recommandé de
            déclarer explicitement « aucun risque significatif » sur la page
            de chaque unité concernée pour traçabilité.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/duerp/${id}/unites`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          ← Unités
        </Link>
        <Link
          href={`/duerp/${id}/transverses`}
          className={buttonVariants({ variant: "board", size: "board" })}
        >
          Étape suivante : questions transverses →
        </Link>
      </div>
    </div>
  );
}
