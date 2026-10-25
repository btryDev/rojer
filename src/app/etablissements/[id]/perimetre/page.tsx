// Les éléments exclus — ce que Rojer ne couvre pas, et à quel titre.
//
// L'écran que demande l'ADR-025 § 8, refait par l'ADR-046 (2026-10-17).
//
// ~~Cinq statuts, dits séparément : ce dossier ; ce que l'outil ne suit pas
// (C45), article par article ; le niveau audit ; refusé à l'entrée ; hors
// périmètre déclaré, article par article.~~ [2026-10-17, ADR-046 : la page
// affichait environ cinq cents éléments — « une liste de courses énorme »,
// dont quelque quatre cent cinquante articles écartés. Elle en garde environ
// vingt-cinq, en quatre blocs, et TOUT ce qu'elle cesse de dire va à l'annexe
// du PDF du référentiel complet (`perimetre/detail-hors-page.ts`,
// `pdf/AnnexeCeQueRojerNeSuitPas.tsx`) — que le dirigeant ne reçoit pas : la
// page ne renvoie donc jamais au PDF, et chaque phrase se suffit à elle-même.]
//
//   A. **Ce dossier** — le bandeau de couverture (`perimetre/couverture.ts`),
//      inchangé. Propre à l'établissement ouvert, il change avec lui.
//   B. **Ce qui peut vous concerner, et que Rojer ne suit pas** (C45) — une
//      phrase par domaine, faite des `sujet` des articles qui peuvent
//      concerner ce dossier (`perimetre/manques-annonces.ts`). Ni référence, ni
//      corpus à l'écran.
//   C. **Obligations légales que Rojer ne suit pas au quotidien** (ADR-042) —
//      nommées une par une, avec le geste tiré de leurs réalisateurs
//      (`gesteHorsQuotidien`). Le mot « audit » n'apparaît pas.
//   D. **Ce que Rojer ne gère pas** — cinq familles, une phrase chacune
//      (`perimetre/familles-non-gerees.ts`).
//
// ~~Refusé à l'entrée~~ et ~~hors périmètre déclaré~~ ne sont plus sur la page
// (décision c6, Q3 et Q5) : un refus ne concerne pas un dossier qui existe, et
// les articles écartés sont le carnet du relecteur.
//
// CE QUE CET ÉCRAN NE FAIT JAMAIS. Aucun total, aucun score, aucun pourcentage.
// Aucune qualification de droit — ni « conforme », ni « non conforme ». Une
// obligation que le produit ne traite pas reste due si un texte l'impose ;
// c'est tout ce que cette page dit.
//
// Il ne déclare rien : chaque bloc projette un module. Une phrase écrite ici
// serait une source de vérité de plus sur ce que le produit couvre.

import { DemandeAide } from "@/components/assistance/DemandeAide";
import Link from "next/link";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BandeauCouverture } from "@/components/perimetre/BandeauCouverture";
import { requireEtablissement } from "@/lib/auth/scope";
import {
  couvertureDuDossier,
  faitsManquesAnnonces,
} from "@/lib/perimetre/faits";
import {
  manquesAnnoncesDuDossier,
  TITRE_ANNONCES,
} from "@/lib/perimetre/manques-annonces";
import { obligationsNiveauAuditDuDossier } from "@/lib/perimetre/niveau-audit";
import { FAMILLES_NON_GEREES } from "@/lib/perimetre/familles-non-gerees";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { projeterEtablissement } from "@/lib/matching";
import { RubriqueHorsQuotidien } from "@/components/perimetre/RubriqueHorsQuotidien";
import { SurTitre } from "@/components/perimetre/SurTitre";
import { CORPUS } from "@/lib/referentiels/corpus";
import { riensASignaler } from "@/lib/perimetre/couverture";
import { porte } from "@/lib/perimetre/non-couverture";

export const metadata = {
  title: "Ce que Rojer ne couvre pas — Rojer",
};

export default async function PerimetrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const base = `/etablissements/${id}`;

  const couverture = await couvertureDuDossier(id);
  const faitsManques = await faitsManquesAnnonces(id);
  const manques = faitsManques
    ? manquesAnnoncesDuDossier(CORPUS, faitsManques)
    : [];
  const equipements = await listerEquipementsDeLEtablissement(id);
  const horsQuotidien = obligationsNiveauAuditDuDossier(
    projeterEtablissement(etablissement),
    equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<
        string,
        unknown
      > | null,
    })),
  );

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* La seconde phrase est la garde de toute la page : ce qui n'est pas
          suivi ici reste dû si un texte l'impose. */}
      <EnTetePage
        item="perimetre"
        description="Ce que Rojer ne suit pas pour ce dossier, et pourquoi. Une obligation que l'outil ne traite pas reste due si un texte l'impose."
      />

      <div className="flex flex-col gap-10 px-[var(--board-gutter)] pt-7">
        {/* ─── A. Ce dossier-ci ──────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <SurTitre>§ Ce dossier, servi partiellement</SurTitre>
            <h2 className="board-titre m-0 mt-2 text-[22px]">
              Ce que l&apos;outil ne sait pas vous dire de cet établissement
            </h2>
            <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Ces phrases sont calculées sur ce que vous avez déclaré : elles
              changent quand le dossier change. Les mêmes se lisent en tête de
              votre {porte("registre de sécurité")}, avant son contenu.
            </p>
          </div>

          {couverture && !riensASignaler(couverture) ? (
            <BandeauCouverture
              couverture={couverture}
              entrepriseId={etablissement.entrepriseId}
              hrefEtablissement={`${base}/modifier`}
              hrefDuerp={`${base}/duerp`}
              hrefEquipements={`${base}/equipements`}
            />
          ) : (
            // État vide, et pas une félicitation : « aucun manque identifié »,
            // jamais « le dossier est complet ». Le référentiel a un
            // périmètre, le droit n'en a pas.
            <div className="carte-board px-7 py-6 sm:px-8">
              <p className="m-0 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Aucun manque n&apos;est identifié sur ce dossier à ce jour.
                Cela ne veut pas dire qu&apos;il est complet : les parties
                ci-dessous disent ce que l&apos;outil ne suit pas, et le droit
                ne s&apos;arrête pas à ce que l&apos;outil suit.
              </p>
            </div>
          )}
        </section>

        {/* ─── B. Ce qui peut vous concerner ─────────────────────────── */}
        {/* C45, refait par l'ADR-046 : une phrase par domaine, faite des
            sujets. Les références et les phrases détaillées sont à l'annexe
            du PDF du référentiel complet. */}
        {manques.length > 0 && (
          <section className="flex flex-col gap-4">
            <div>
              <SurTitre>§ Ce que l&apos;outil ne suit pas</SurTitre>
              <h2 className="board-titre m-0 mt-2 text-[22px]">
                {TITRE_ANNONCES}
              </h2>
              <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Nommé ici parce que cela peut concerner votre établissement ;
                rien n&apos;est tranché pour vous.
              </p>
            </div>

            <ul className="carte-board m-0 flex list-none flex-col divide-y divide-[color:var(--board-slate-line)] p-0">
              {manques.map((d) => (
                <li
                  key={d.cle}
                  data-domaine={d.cle}
                  className="px-7 py-5 sm:px-8"
                >
                  <h3 className="m-0 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                    {d.titre}
                  </h3>
                  <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                    {d.phrasePage}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ─── C. Hors du quotidien (ADR-042) ───────────────────────── */}
        <RubriqueHorsQuotidien lignes={horsQuotidien} />

        {/* ─── D. Ce que Rojer ne gère pas ───────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <SurTitre>§ Hors de Rojer</SurTitre>
            <h2 className="board-titre m-0 mt-2 text-[22px]">
              Ce que Rojer ne gère pas
            </h2>
          </div>
          <ul className="carte-board m-0 flex list-none flex-col divide-y divide-[color:var(--board-slate-line)] p-0">
            {FAMILLES_NON_GEREES.map((f) => (
              <li
                key={f.cle}
                data-famille={f.cle}
                className="px-7 py-4 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)] sm:px-8"
              >
                {f.phrase}
              </li>
            ))}
          </ul>
        </section>

        {/* La page des limites : un seul encart, en fin de page (2026-10-24). */}
        <DemandeAide
          variante="encart"
          accroche="Ce que Rojer ne suit pas, nos experts peuvent le prendre en charge avec vous."
          libelle="En parler à un expert"
          categorie="hors_couverture"
          contexte="Ce que Rojer ne couvre pas"
          etablissementId={id}
        />

        <p className="m-0 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Les documents que vous devez tenir, y compris ceux que Rojer ne
          produit pas, se lisent sur la page{" "}
          <Link
            href={`${base}/documents`}
            className="font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
          >
            Comprendre vos obligations
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
