import Link from "next/link";
import { notFound } from "next/navigation";
import { SecteurCard } from "@/components/duerps/SecteurCard";
import { AutresSecteurs } from "@/components/duerps/AutresSecteurs";
import { ConfirmerSecteurButton } from "@/components/duerps/ConfirmerSecteurButton";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import { activitesDuSecteur } from "@/lib/activites/reponses";
import { construireEtapes } from "@/lib/duerps/etapes";
import { etatEtapeTransverses } from "@/lib/transverses/etat";
import { getDuerp } from "@/lib/duerps/queries";
import {
  referentielsSectoriels,
  trouverReferentielParNaf,
} from "@/lib/referentiels";

export default async function SecteurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const refRecommande = trouverReferentielParNaf(duerp.etablissement.codeNaf);
  const secteurChoisi = duerp.referentielSecteurId;

  const etapes = construireEtapes(id, "secteur", {
    secteurOk: Boolean(secteurChoisi),
    unitesOk: false,
    risquesOk: false,
    transverses: etatEtapeTransverses(duerp),
    // Les questions de périmètre dépendent du secteur **retenu**, pas du
    // secteur suggéré par le NAF : tant que rien n'est confirmé, il n'y a rien
    // à annoncer, et l'étape n'apparaît pas dans le fil.
    activitesPosees: activitesDuSecteur(secteurChoisi).length > 0,
  });

  const autresSecteurs = referentielsSectoriels
    .filter((r) => r.id !== refRecommande?.id)
    .map((r) => ({
      id: r.id,
      nom: r.nom,
      description: descriptionPourSecteur(r.id),
      nombreUnites: r.unitesTravailSuggerees.length,
      nombreRisques: r.risques.length,
      codesNaf: r.codesNaf,
    }));

  return (
    <div className="flex flex-col gap-[22px]">
      <WizardSteps etapes={etapes} />

      {/* Raccourci : importer un DUERP existant plutôt que reconstruire */}
      <aside className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-4">
        <span className="text-[13.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
          <strong>Déjà un DUERP ?</strong> Importez-le au format Excel plutôt
          que de repartir de zéro.
        </span>
        <Link
          href={`/etablissements/${duerp.etablissementId}/duerp/import`}
          className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-blue-ink)] hover:underline"
        >
          Importer depuis Excel →
        </Link>
      </aside>

      {refRecommande ? (
        <>
          <header className="max-w-[var(--board-mesure)]">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Secteur d&apos;activité
            </p>
            <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              À partir du code NAF{" "}
              <span className="font-mono tabular-nums text-[color:var(--board-ink)]">
                {duerp.etablissement.codeNaf}
              </span>
              , le secteur ci-dessous a été détecté. Confirmez pour charger
              les unités et risques types.
            </p>
          </header>

          <section className="carte-board px-7 py-6 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Secteur détecté
            </p>

            <div className="mt-5 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="min-w-0">
                <h3 className="board-titre m-0 text-[clamp(23px,2.1vw,30px)]">
                  {refRecommande.nom}
                </h3>
                <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  {descriptionPourSecteur(refRecommande.id)}
                </p>

                <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
                  <div className="flex items-baseline gap-2.5">
                    <dt className="sr-only">Unités pré-remplies</dt>
                    <dd className="m-0 font-mono text-[20px] tabular-nums text-[color:var(--board-ink)]">
                      {String(refRecommande.unitesTravailSuggerees.length).padStart(2, "0")}
                    </dd>
                    <span className="text-[12.5px] text-[color:var(--board-slate-mid)]">
                      unités pré-remplies
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <dt className="sr-only">Risques référencés</dt>
                    <dd className="m-0 font-mono text-[20px] tabular-nums text-[color:var(--board-ink)]">
                      {String(refRecommande.risques.length).padStart(2, "0")}
                    </dd>
                    <span className="text-[12.5px] text-[color:var(--board-slate-mid)]">
                      risques référencés
                    </span>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:items-end">
                <ConfirmerSecteurButton
                  duerpId={id}
                  secteurId={refRecommande.id}
                />
                <AutresSecteurs
                  duerpId={id}
                  secteurs={autresSecteurs}
                  secteurChoisiId={secteurChoisi}
                  alignDroite
                />
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <header className="max-w-[var(--board-mesure)]">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Secteur d&apos;activité
            </p>
            <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Le code NAF{" "}
              <span className="font-mono tabular-nums text-[color:var(--board-ink)]">
                {duerp.etablissement.codeNaf}
              </span>{" "}
              n&apos;est pas couvert par un référentiel dédié. Choisissez le
              secteur le plus proche — vous pourrez décocher les risques non
              applicables à l&apos;étape suivante.
            </p>
          </header>

          <section>
            <p className="board-eyebrow m-0 mb-5 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Secteurs disponibles
            </p>
            <div className="grid gap-[22px] md:grid-cols-2 lg:grid-cols-3">
              {referentielsSectoriels.map((r) => (
                <SecteurCard
                  key={r.id}
                  duerpId={id}
                  secteurId={r.id}
                  nom={r.nom}
                  description={descriptionPourSecteur(r.id)}
                  nombreUnites={r.unitesTravailSuggerees.length}
                  nombreRisques={r.risques.length}
                  codesNaf={r.codesNaf}
                  recommande={false}
                  dejaChoisi={secteurChoisi === r.id}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function descriptionPourSecteur(id: string): string {
  switch (id) {
    case "restauration":
      return "Restaurants, brasseries, fast-food, cuisines collectives. Risques types : coupures, brûlures, chutes, TMS posturales, livraison.";
    case "commerce":
      return "Boutiques, petits commerces, commerces de bouche. Risques types : port de charges, chutes, agression / vol, posture en caisse.";
    case "bureau":
      return "Activités tertiaires : conseil, comptabilité, communication, informatique. Risques types : charge mentale, TMS écran, ambiance, RPS.";
    default:
      return "Référentiel sectoriel.";
  }
}
