// Une fiche dont les réponses vivent déjà ailleurs — forme `etablissement`.
//
// Raison sociale, adresse, type et catégorie ERP : ces questions ont déjà une
// réponse, portée par une colonne d'`Etablissement` ou d'`Entreprise`. La
// fiche les **montre**, elle ne les stocke pas et ne les édite pas sur place.
//
// Ce n'est pas une économie de code, c'est la condition pour que le registre
// soit juste : recopiées ici, ces réponses divergeraient au premier
// changement d'adresse — et c'est le registre, pas la fiche établissement,
// qu'on présente à la commission. C'est donc lui qui afficherait la valeur
// périmée. On édite là où la donnée vit, un bouton y mène.
//
// **Et il faut le dire avant les valeurs, pas après.** Une première version
// posait les réponses, puis expliquait en pied pourquoi elles n'étaient pas
// modifiables : le lecteur cherchait le champ de saisie, ne le trouvait pas,
// et lisait l'explication une fois la question déjà formée. Un écran qui ne
// se laisse pas modifier doit annoncer d'où viennent ses valeurs et où les
// changer, en tête et une seule fois.
//
// Composant serveur : rien à saisir ici, donc rien à hydrater.

import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { ChampFiche, ChampsFiche } from "@/components/ui-kit/fiche";
import { buttonVariants } from "@/components/ui/button";
import type { ChampEtablissement } from "@/lib/registre/champs";
import { afficherValeur, NON_RENSEIGNE } from "@/lib/registre/valeur";

export function FicheLecture({
  champs,
  valeurs,
  hrefEdition,
}: {
  champs: readonly ChampEtablissement[];
  /** Les réponses lues sur l'établissement, par clé de champ. */
  valeurs?: Readonly<Record<string, string | null>>;
  /** L'écran où ces réponses se modifient — leur source. */
  hrefEdition: string;
}) {
  const manquantes = champs.filter(
    (c) => c.enBase && afficherValeur(valeurs?.[c.cle], c) === NON_RENSEIGNE,
  );
  const sansEmplacement = champs.filter((c) => !c.enBase);

  return (
    <div className="flex flex-col gap-5">
      {/* La tête : d'où viennent ces valeurs, pourquoi elles ne se changent
          pas ici, et où les changer. Avant les valeurs — c'est là qu'on se
          pose la question. Le bouton porte le geste : « compléter » quand il
          manque quelque chose, « modifier » sinon. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-[20px] bg-[color:var(--board-slate-pale)] px-5 py-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <Lock
            aria-hidden
            className="mt-0.5 size-4 flex-none text-[color:var(--board-slate-soft)]"
          />
          <p className="m-0 max-w-[58ch] text-[13px] leading-[1.6] text-[color:var(--board-slate-ink)]">
            Ces réponses{" "}
            <strong className="font-semibold text-[color:var(--board-ink)]">
              ne se saisissent pas ici
            </strong>{" "}
            : elles viennent de votre fiche établissement, et le registre les
            reprend telles quelles. Les recopier créerait une seconde version
            qui finirait périmée — et c&apos;est le registre qu&apos;on
            présente à la commission.
          </p>
        </div>
        <Link
          href={hrefEdition}
          className={
            buttonVariants({ variant: "board", size: "boardSm" }) + " flex-none"
          }
        >
          {manquantes.length > 0
            ? "Compléter la fiche établissement"
            : "Modifier la fiche établissement"}
          <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      <ChampsFiche>
        {champs.map((champ) => {
          const valeur = afficherValeur(valeurs?.[champ.cle], champ);
          const vide = valeur === NON_RENSEIGNE;
          return (
            <ChampFiche
              key={champ.cle}
              cle={
                champ.libellePluriel && !vide && valeur.includes(", ")
                  ? champ.libellePluriel
                  : champ.libelle
              }
            >
              {/* « — » se lit comme un tiret décoratif au milieu d'une
                  liste de valeurs. Une réponse absente doit se dire en
                  toutes lettres : c'est ce qui manquerait à une visite. */}
              <span
                className={
                  vide
                    ? "italic text-[color:var(--board-slate-soft)]"
                    : undefined
                }
              >
                {vide ? "Non renseigné" : valeur}
              </span>
              {/* Une question dont la colonne n'existe pas encore ne doit pas
                  se lire comme un oubli du dirigeant : c'est un trou de
                  l'application, et il se dit comme tel. */}
              {!champ.enBase && (
                <span className="ml-2 text-[11.5px] text-[color:var(--board-slate-soft)]">
                  pas encore recueillie
                </span>
              )}
              {champ.aide && (
                <span className="mt-1 block text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  {champ.aide}
                </span>
              )}
            </ChampFiche>
          );
        })}
      </ChampsFiche>

      {(manquantes.length > 0 || sansEmplacement.length > 0) && (
        <p className="m-0 text-[12.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          {manquantes.length > 0 && (
            <>
              <strong className="font-semibold text-[color:var(--board-ink)]">
                {manquantes.length === 1
                  ? "1 réponse manque"
                  : `${manquantes.length} réponses manquent`}
              </strong>{" "}
              sur cette fiche : {manquantes.map((c) => c.libelle).join(", ")}.
            </>
          )}
          {sansEmplacement.length > 0 && (
            <>
              {manquantes.length > 0 && " "}
              {sansEmplacement.length === 1
                ? "1 question due n'a pas encore d'emplacement dans l'application"
                : `${sansEmplacement.length} questions dues n'ont pas encore d'emplacement dans l'application`}
              &nbsp;: tenez-les hors de l&apos;outil en attendant.
            </>
          )}
        </p>
      )}
    </div>
  );
}
