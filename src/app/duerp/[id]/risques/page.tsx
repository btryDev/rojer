import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ValiderEtapeBouton } from "@/components/duerps/ValiderEtapeBouton";
import { PastilleFiche } from "@/components/ui-kit/fiche";
import { MarcheASuivre } from "@/components/duerps/MarcheASuivre";
import { EnTeteEtape } from "@/components/duerps/EnTeteEtape";
import { etatUnite } from "@/lib/risques/etat-unite";
import { getDuerp } from "@/lib/duerps/queries";

export default async function RisquesOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const unitesVisibles = duerp.unites.filter((u) => !u.estTransverse);

  const etats = unitesVisibles.map((u) => ({ unite: u, etat: etatUnite(u) }));
  const totalRisques = etats.reduce((acc, e) => acc + e.etat.nbRisques, 0);
  // Ni risque du tout ni déclaration : une unité qui porte des risques
  // ajoutés par Rojer a quelque chose à vérifier, pas « rien ».
  const sansRisqueNiDeclaration = etats.filter(
    (e) => e.etat.nbRisques === 0 && !e.etat.declareeSansRisque,
  ).length;

  return (
    <div className="flex flex-col gap-8">
      {/* Allégé le 2026-11-12 : la marche à suivre était une grille de quatre
          cartes d'explication, au même rang que la liste. C'est un rail sur
          le canevas ; la définition d'un risque est derrière le « ? ». */}
      <EnTeteEtape
        page="risques"
        titre="Évaluez les risques de chaque unité"
        aide={{
          titre: "Qu'est-ce qu'un risque professionnel",
          contenu: (
            <>
            <p className="m-0">
              Un risque professionnel est tout ce qui peut causer un accident
              ou une atteinte à la santé au travail (coupure, chute, charge
              mentale…). Le DUERP inventorie ceux de chaque unité, les cote et
              dit les mesures de prévention.
            </p>
            <p className="m-0 mt-3">
              Si une unité n&apos;a aucun risque significatif, vous pouvez le
              déclarer et le justifier sur sa page.
            </p>
            </>
          ),
        }}
      />

      <MarcheASuivre
        libelle="Les étapes, pour chaque unité"
        pas={[
          { titre: "Inventorier", detail: "Cochez les risques types, ajoutez les vôtres.", etat: "a-faire" },
          { titre: "Coter", detail: "Gravité, probabilité, maîtrise.", etat: "a-faire" },
          { titre: "Prévoir les mesures", detail: "Ce qui existe et ce qu'il faut faire.", etat: "a-faire" },
        ]}
      />

      <section className="carte-board overflow-clip">
        <div className="flex items-baseline gap-2 border-b border-[color:var(--board-slate-line)] px-7 py-5 sm:px-8">
          <h3 className="m-0 text-[13.5px] font-semibold text-[color:var(--board-ink)]">
            Vos unités
          </h3>
          <span className="board-surtitre font-normal">
            {unitesVisibles.length} unité{unitesVisibles.length > 1 ? "s" : ""} ·{" "}
            {totalRisques} risque{totalRisques > 1 ? "s" : ""}
          </span>
        </div>

        <ul className="m-0 list-none divide-y divide-[color:var(--board-slate-line)] p-0">
          {etats.map(({ unite: u, etat: e }) => {
            const enCours = e.inventoriee && !e.terminee;
            // Les tons de pastille de la charte (`PastilleFiche`), pas une
            // table locale (charte § 1.5).
            const pastille = e.terminee
              ? { texte: "✓ Évaluée", ton: "fait" as const }
              : enCours
                ? { texte: "En cours", ton: "bleu" as const }
                : { texte: "À faire", ton: "neutre" as const };
            const detail = e.declareeSansRisque
              ? "Aucun risque significatif, justifié"
              : e.nbRisques === 0
                ? "Aucun risque inventorié"
                : !e.touchee
                  ? `${e.nbRisques} risque${e.nbRisques > 1 ? "s" : ""} ajouté${e.nbRisques > 1 ? "s" : ""} pour vous, à vérifier`
                  : [
                    `${e.nbRisques} risque${e.nbRisques > 1 ? "s" : ""}`,
                    e.aCoter.length > 0 ? `${e.aCoter.length} à coter` : null,
                    e.sansMesure.length > 0
                      ? `${e.sansMesure.length} sans mesure`
                      : null,
                    e.terminee ? "évaluée" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
            const segments = [e.inventoriee, e.cotee || e.declareeSansRisque, e.terminee];
            return (
              <li key={u.id}>
                <Link
                  href={`/duerp/${id}/risques/${u.id}`}
                  className="group flex flex-wrap items-center gap-x-5 gap-y-3 px-7 py-5 transition-colors hover:bg-[color:var(--board-slate-pale)] sm:px-8"
                >
                  <span className="min-w-0 flex-[1_1_260px]">
                    <span className="block text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {u.nom}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {detail}
                    </span>
                  </span>
                  <span aria-hidden className="flex w-[84px] shrink-0 gap-1">
                    {segments.map((fait, i) => (
                      <span
                        key={i}
                        className={`h-[5px] flex-1 rounded-full ${
                          fait
                            ? "bg-[color:var(--board-blue-ink)]"
                            : "bg-[color:var(--board-slate-line)]"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="shrink-0">
                    <PastilleFiche ton={pastille.ton}>{pastille.texte}</PastilleFiche>
                  </span>
                  <span
                    className={`${buttonVariants({
                      variant: e.terminee ? "boardClair" : "board",
                      size: "boardSm",
                    })} shrink-0`}
                  >
                    {e.terminee ? "Revoir" : enCours ? "Continuer" : "Commencer"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {sansRisqueNiDeclaration > 0 && (
        // Point à vérifier avant de continuer : l'encre de signal le dit,
        // sans champ rose — aucune échéance n'est dépassée (interdit 3).
        <p className="m-0 max-w-[var(--board-mesure)] text-[13px] leading-[1.55] text-[color:var(--board-signal-ink)]">
          {sansRisqueNiDeclaration} unité{sansRisqueNiDeclaration > 1 ? "s n'ont" : " n'a"}{" "}
          ni risque ni déclaration «&nbsp;aucun risque significatif&nbsp;».
          Vous pouvez continuer ; si c&apos;est le cas, déclarez-le sur la
          page de l&apos;unité.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-4">
        <ValiderEtapeBouton duerpId={id} etablissementId={duerp.etablissementId} etape="risques" />
      </div>
    </div>
  );
}
