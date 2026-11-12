import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { SecteurCard } from "@/components/duerps/SecteurCard";
import { AutresSecteurs } from "@/components/duerps/AutresSecteurs";
import { ConfirmerSecteurButton } from "@/components/duerps/ConfirmerSecteurButton";
import { EnTeteEtape } from "@/components/duerps/EnTeteEtape";
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


  const autresSecteurs = referentielsSectoriels
    .filter((r) => r.id !== refRecommande?.id)
    .map((r) => ({
      id: r.id,
      nom: r.nom,
      description: descriptionPourSecteur(r.id),
      codesNaf: r.codesNaf,
    }));

  return (
    <div className="flex flex-col gap-8">


      {refRecommande ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <EnTeteEtape page="secteur" titre="Quelle est votre activité ?">
                À partir du code NAF{" "}
                <span className="tabular-nums text-[color:var(--board-ink)]">
                  {duerp.etablissement.codeNaf}
                </span>
                , le secteur ci-dessous a été détecté. Choisissez-le pour charger
                les unités et risques types, ou choisissez-en un autre plus bas.
            </EnTeteEtape>
            {/* Le raccourci d'import, discret en haut à droite (2026-11-12) :
                il occupait une bande pleine largeur avant le contenu. */}
            <Link
              data-ecriture
              href={`/etablissements/${duerp.etablissementId}/duerp/import`}
              className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
            >
              Importer un DUERP Excel
            </Link>
          </div>

          <section className="carte-board px-7 py-6 sm:px-8">
            <p className="board-surtitre m-0 text-[color:var(--board-slate-soft)]">
              Secteur détecté
            </p>

            <div className="mt-5 flex flex-col gap-6">
              <div className="min-w-0">
                <h3 className="board-titre m-0 text-[22px]">
                  {refRecommande.nom}
                </h3>
                <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  {descriptionPourSecteur(refRecommande.id)}
                </p>
              </div>

              <div className="flex justify-end">
                <ConfirmerSecteurButton
                  duerpId={id}
                  secteurId={refRecommande.id}
                />
              </div>
            </div>
          </section>

          {/* Les autres secteurs, montrés d'emblée sous la carte (2026-11-12). */}
          <AutresSecteurs
            duerpId={id}
            secteurs={autresSecteurs}
            secteurChoisiId={secteurChoisi}
          />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <EnTeteEtape page="secteur" titre="Quelle est votre activité ?">
                Le code NAF{" "}
                <span className="tabular-nums text-[color:var(--board-ink)]">
                  {duerp.etablissement.codeNaf}
                </span>{" "}
                n&apos;est pas couvert par un référentiel dédié. Choisissez le
                secteur le plus proche — vous pourrez décocher les risques non
                applicables à l&apos;étape suivante.
            </EnTeteEtape>
            {/* Le raccourci d'import, discret en haut à droite (2026-11-12) :
                il occupait une bande pleine largeur avant le contenu. */}
            <Link
              data-ecriture
              href={`/etablissements/${duerp.etablissementId}/duerp/import`}
              className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
            >
              Importer un DUERP Excel
            </Link>
          </div>

          <section>
            <p className="board-surtitre m-0 mb-5 text-[color:var(--board-slate-soft)]">
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
