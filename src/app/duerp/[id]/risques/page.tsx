import Link from "next/link";
import { LienRetour } from "@/components/duerps/LienRetour";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ValiderEtapeBouton } from "@/components/duerps/ValiderEtapeBouton";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { MarcheASuivre } from "@/components/duerps/MarcheASuivre";
import { etatUnite } from "@/lib/risques/etat-unite";
import { enteteEtape } from "@/lib/duerps/etapes";
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
  const sansRisqueNiDeclaration = etats.filter((e) => !e.etat.inventoriee).length;

  return (
    <div className="flex flex-col gap-8">
      {/* Le retour à l'étape précédente, en tête (2026-11-12) : tout le
          monde ne devine pas que le fil des étapes se clique. */}
      <nav>
        <LienRetour href={`/duerp/${id}/unites`}>Unités de travail</LienRetour>
      </nav>

      {/* Allégé le 2026-11-12 : la marche à suivre était une grille de quatre
          cartes d'explication, au même rang que la liste. C'est un rail sur
          le canevas ; la définition d'un risque est derrière le « ? ». */}
      <header className="flex max-w-[var(--board-mesure)] flex-col gap-2">
        <p className="board-surtitre m-0">{enteteEtape("risques")}</p>
        <div className="flex items-center gap-3">
          <h2 className="board-titre m-0 text-[clamp(23px,2.1vw,30px)]">
            Évaluez les risques de chaque unité
          </h2>
          <AideEcran titre="Qu'est-ce qu'un risque professionnel">
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
          </AideEcran>
        </div>
      </header>

      <MarcheASuivre
        libelle="Pour chaque unité"
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
            const pastille = e.terminee
              ? { texte: "✓ Évaluée", classe: "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]" }
              : enCours
                ? { texte: "En cours", classe: "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]" }
                : { texte: "À faire", classe: "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]" };
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
                  <span className={`pastille-board shrink-0 ${pastille.classe}`}>
                    {pastille.texte}
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
