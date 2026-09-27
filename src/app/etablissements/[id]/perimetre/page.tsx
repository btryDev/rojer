// Les éléments exclus — ce que Rojer ne couvre pas, et à quel titre.
//
// L'écran que demande l'ADR-025 § 8. Il distingue TROIS statuts, et la
// distinction est le fond du sujet : les confondre ferait fuir un dirigeant que
// le produit sert très bien, ou rassurerait celui qu'il ne sert pas.
//
//   1. **Ce dossier-ci, servi partiellement et prévenu** — les manques et les
//      questions ouvertes de `perimetre/couverture.ts`. Propre à l'établissement
//      ouvert, il change avec lui.
//   2. **Refusé à l'entrée** — deux régimes que le produit ne sait pas servir
//      du tout (ADR-031). Vrai du produit, pas de ce dossier : si le dossier
//      existe, c'est qu'il n'a été refusé ni pour l'un ni pour l'autre.
//   3. **Hors périmètre déclaré** — les articles lus dont aucune obligation
//      d'exploitant ne découle, avec le motif qui les écarte.
//
//   1 bis. **Ce que l'outil ne suit pas, et qui peut concerner ce dossier**
//      (C45, décision de la propriétaire du 2026-09-27) — vingt-cinq articles
//      `non_couvert` du corpus, groupés par domaine, chacun projeté au seul
//      dossier qu'il peut concerner (`perimetre/manques-annonces.ts`). Propre
//      au dossier comme la section 1, d'où sa place juste après elle.
//
// L'ordre n'est pas indifférent : ce qui est propre au dossier d'abord, parce
// que c'est ce que le dirigeant est venu chercher ; ce qui est vrai du produit
// ensuite.
//
// CE QUE CET ÉCRAN NE FAIT JAMAIS. Aucun total, aucun score, aucun pourcentage.
// Quatre manques sur quatre axes ne font pas « 4 » : ils font quatre phrases
// vraies de quatre choses différentes, et un chiffre laisserait croire à une
// mesure de complétude que rien ne fonde. Aucune qualification de droit non
// plus — ni « conforme », ni « non conforme ». Une obligation que le produit ne
// traite pas reste due si un texte l'impose ; c'est tout ce que cette page dit.
//
// Il ne déclare rien : les ~~trois~~ quatre sections projettent `couverture.ts`,
// `perimetre/manques-annonces.ts`, `perimetre/exclusions.ts` et le corpus. Une phrase écrite ici serait une
// quatrième source de vérité sur ce que le produit couvre.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BandeauCouverture } from "@/components/perimetre/BandeauCouverture";
import { requireEtablissement } from "@/lib/auth/scope";
import {
  couvertureDuDossier,
  faitsManquesAnnonces,
} from "@/lib/perimetre/faits";
import { manquesAnnoncesDuDossier } from "@/lib/perimetre/manques-annonces";
import { CORPUS } from "@/lib/referentiels/corpus";
import { riensASignaler } from "@/lib/perimetre/couverture";
import { porte } from "@/lib/perimetre/non-couverture";
import {
  exclusionsDeclarees,
  refusAlEntree,
} from "@/lib/perimetre/exclusions";

export const metadata = {
  title: "Ce que Rojer ne couvre pas — Rojer",
};

function SurTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
      {children}
    </p>
  );
}

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
  const refus = refusAlEntree();
  const exclusions = exclusionsDeclarees();

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <div className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] pb-8 pt-[26px]">
        <Link
          href={base}
          className="board-eyebrow group -ml-0.5 inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ChevronRight
            aria-hidden
            className="size-3 flex-none rotate-180 transition-transform group-hover:-translate-x-0.5"
          />
          <span className="truncate">{etablissement.raisonDisplay}</span>
        </Link>

        <div className="mt-3">
          <h1 className="board-titre m-0 text-[clamp(29px,3vw,39px)]">
            Ce que Rojer ne couvre pas
          </h1>
          <p className="m-0 mt-[11px] max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Quatre choses différentes, dites séparément : ce qui manque à ce
            dossier, les obligations que l&apos;outil ne suit pas et qui
            peuvent vous concerner, les régimes qu&apos;il refuse d&apos;ouvrir,
            et les textes lus dont il ne tire aucune obligation. Rien ici n&apos;est
            compté ni additionné — une obligation que cet outil ne traite pas
            reste due si un texte l&apos;impose.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-10 px-[var(--board-gutter)] pt-7">
        {/* ─── 1. Ce dossier-ci ──────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <SurTitre>§ Ce dossier, servi partiellement</SurTitre>
            <h2 className="board-titre m-0 mt-2 text-[22px]">
              Ce que l&apos;outil ne sait pas vous dire de cet établissement
            </h2>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
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
            // État vide, et pas une félicitation : les deux listes vides
            // veulent dire « aucun manque identifié », jamais « le dossier est
            // complet ». Le référentiel a un périmètre, le droit n'en a pas.
            <div className="carte-board px-7 py-6 sm:px-8">
              <p className="m-0 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Aucun manque n&apos;est identifié sur ce dossier à ce jour.
                Cela ne veut pas dire qu&apos;il est complet : le référentiel de
                l&apos;outil a un périmètre, ce que les parties ci-dessous
                décrivent, et le droit n&apos;en a pas.
              </p>
            </div>
          )}
        </section>

        {/* ─── 1 bis. Ce que l'outil ne suit pas ─────────────────────── */}
        {/* C45. Des articles lus, qui imposent quelque chose, que Rojer ne
            porte pas — annoncés au seul dossier qu'ils peuvent concerner.
            Ni compte ni score : un domaine, ce que l'outil ne suit pas, et les
            articles qui le fondent. */}
        {manques.length > 0 && (
          <section className="flex flex-col gap-4">
            <div>
              <SurTitre>§ Ce que l&apos;outil ne suit pas</SurTitre>
              <h2 className="board-titre m-0 mt-2 text-[22px]">
                Des obligations qui peuvent vous concerner, et que Rojer ne
                suit pas
              </h2>
              <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Rojer ne les suit pas, ou seulement en partie : chaque domaine
                dit ce que l&apos;outil ne suit pas. Elles sont nommées ici
                parce qu&apos;elles peuvent concerner votre établissement ;
                aucune n&apos;est tranchée pour vous.
                Une obligation que cet outil ne traite pas reste due si un texte
                l&apos;impose.
              </p>
            </div>

            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {manques.map((d) => (
                <li key={d.cle} className="carte-board px-7 py-6 sm:px-8">
                  <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                    {d.titre}
                  </h3>
                  {d.phrase ? (
                    <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                      {d.phrase}
                    </p>
                  ) : null}
                  <div className="mt-4 rounded-[22px] bg-[color:var(--board-slate-pale)] px-5 py-4">
                    <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      Articles lus
                    </p>
                    <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                      {d.articles.map((a) => (
                        <li
                          key={`${d.cle}-${a.ref}`}
                          className="text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]"
                        >
                          <span className="font-mono tabular-nums">
                            {a.ref}
                          </span>
                          {a.intitule ? ` — ${a.intitule}` : null}
                          {a.phrase ? (
                            <span className="mt-0.5 block text-[12.5px] text-[color:var(--board-slate-mid)]">
                              {a.phrase}
                            </span>
                          ) : null}
                          <span className="block text-[11px] text-[color:var(--board-slate-soft)]">
                            {a.corpus}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ─── 2. Refusé à l'entrée ──────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <SurTitre>§ Refusé à l&apos;entrée</SurTitre>
            <h2 className="board-titre m-0 mt-2 text-[22px]">
              Les deux régimes pour lesquels aucun dossier ne s&apos;ouvre
            </h2>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Le critère n&apos;est pas la taille du manque, c&apos;est sa
              nature : on refuse ce que le produit ne sait pas servir{" "}
              <strong>du tout</strong>, on déclare le reste. Ces deux cas ne
              concernent pas ce dossier — s&apos;il existe, c&apos;est
              qu&apos;il n&apos;en relevait pas à sa création.
            </p>
          </div>

          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
            {refus.map((r) => (
              <li key={r.cle} className="carte-board px-7 py-6 sm:px-8">
                <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                  {r.regime}
                </h3>
                {/* La phrase que la porte oppose, mot pour mot : deux
                    formulations pour un même refus feraient croire à deux
                    règles. Elle vient du schéma, elle n'est pas écrite ici. */}
                <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                  {r.message}
                </p>
                <p className="m-0 mt-3 max-w-[68ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {r.indication}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ─── 3. Hors périmètre déclaré ─────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <SurTitre>§ Hors périmètre déclaré</SurTitre>
            <h2 className="board-titre m-0 mt-2 text-[22px]">
              Les textes lus dont l&apos;outil ne tire aucune obligation
            </h2>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Quatre motifs, et quatre seulement. Aucun ne dit « nous avons
              choisi de ne pas nous en occuper » : chacun dit qu&apos;aucune
              obligation d&apos;exploitant ne découle de l&apos;article — une
              règle de construction, un article qui s&apos;adresse à
              l&apos;administration, une disposition que le règlement lui-même
              écarte. Ce que l&apos;outil ne couvre pas alors qu&apos;une
              obligation existe est une dette, et elle se compte ailleurs.
            </p>
          </div>

          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {exclusions.map((e) => (
              <li key={e.cle} className="carte-board px-7 py-6 sm:px-8">
                <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                  {e.libelle}
                </h3>
                <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  {e.motif}
                </p>

                {e.articles.length > 0 ? (
                  <div className="mt-4 rounded-[22px] bg-[color:var(--board-slate-pale)] px-5 py-4">
                    <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      Articles lus et écartés à ce titre
                    </p>
                    <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                      {e.articles.map((a) => (
                        <li
                          key={`${e.cle}-${a.ref}`}
                          className="text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]"
                        >
                          <span className="font-mono tabular-nums">
                            {a.ref}
                          </span>
                          {a.intitule ? ` — ${a.intitule}` : null}
                          <span className="block text-[11px] text-[color:var(--board-slate-soft)]">
                            {a.corpus}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  // Un motif sans article n'est pas une erreur : l'exclusion
                  // est la déclaration, l'article n'en est que la preuve. La
                  // taire ferait disparaître une frontière que le produit
                  // revendique.
                  <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-soft)]">
                    Aucun article lu n&apos;a encore été écarté à ce titre.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <p className="m-0 max-w-[68ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
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
