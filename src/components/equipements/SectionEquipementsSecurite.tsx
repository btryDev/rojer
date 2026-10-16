// La section « Équipements de sécurité » (décision du 2026-10-15) : le
// matériel dont un texte exige la PRÉSENCE ici, et ce que le parc en déclare.
//
// Elle ne dit jamais qu'un matériel est en place, ni qu'il suffit : elle dit
// ce qui est DÉCLARÉ dans Rojer (ADR-027). « Déclaré » est un fait de saisie,
// « pas encore déclaré » aussi — aucun des deux n'est un verdict (charte,
// interdits 16 et 17). La logique vit dans `equipements-securite.ts`, pure et
// testée ; ce composant ne fait que la poser.

import Link from "next/link";
import { BriefcaseMedical, Plus } from "lucide-react";
import { MarqueCategorie } from "@/components/equipements/MarqueCategorie";
import { buttonVariants } from "@/components/ui/button";
import { LignesFiche, LigneFiche, PastilleFiche } from "@/components/ui-kit";
import type { LigneEquipementSecurite } from "@/lib/equipements/equipements-securite";

export type AppareilAffiche = {
  id: string;
  libelle: string;
  /** Le premier signal de l'appareil (« 1 à planifier »), ou `null`. */
  signal: string | null;
  href: string;
};

export function SectionEquipementsSecurite({
  lignes,
  appareils,
  hrefAjouter,
  hrefEtatsPermanents,
}: {
  lignes: LigneEquipementSecurite[];
  /** Les appareils de chaque ligne, prêts à afficher, par obligation. */
  appareils: ReadonlyMap<string, AppareilAffiche[]>;
  /** L'adresse du formulaire ouvert sur une catégorie. */
  hrefAjouter: (categorie: string) => string;
  hrefEtatsPermanents: string;
}) {
  if (lignes.length === 0) return null;

  return (
    <section className="carte-board pt-6" aria-labelledby="equipements-securite">
      <div className="px-7 pb-3 sm:px-8">
        <h2 id="equipements-securite" className="board-titre m-0 text-[22px]">
          Équipements de sécurité
        </h2>
        <p className="m-0 mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Le matériel dont un texte exige la présence dans votre établissement.
          Cette liste dit ce qui est déclaré dans Rojer, pas ce qui est en place
          chez vous : une déclaration n&apos;est pas une vérification.
        </p>
      </div>

      <LignesFiche>
        {lignes.map((l) => {
          const liste = appareils.get(l.obligationId) ?? [];
          const lienArticle = l.href ? (
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[color:var(--board-slate)] underline-offset-2 hover:text-[color:var(--board-blue-ink)]"
            >
              {l.article}
            </a>
          ) : (
            l.article
          );

          return (
            <LigneFiche
              key={l.obligationId}
              tuile={
                l.cible.kind === "categorie" ? (
                  <MarqueCategorie categorie={l.cible.categorie} taille={44} />
                ) : (
                  <span
                    aria-hidden
                    className="inline-grid size-[44px] flex-none place-items-center rounded-[15px] bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
                  >
                    <BriefcaseMedical size={22} strokeWidth={1.5} />
                  </span>
                )
              }
              surtitre={
                l.aConfirmer ? <>À confirmer ici · {lienArticle}</> : <>Obligatoire ici · {lienArticle}</>
              }
              titre={l.libelle}
              detail={
                l.etat === "declare" ? (
                  <span className="flex flex-col gap-1">
                    {liste.map((a) => (
                      <span key={a.id}>
                        <Link
                          href={a.href}
                          className="font-medium text-[color:var(--board-ink)] underline decoration-[color:var(--board-slate)] underline-offset-2 hover:text-[color:var(--board-blue-ink)]"
                        >
                          {a.libelle}
                        </Link>
                        {" — "}
                        {a.signal ?? "aucune vérification rattachée"}
                      </span>
                    ))}
                  </span>
                ) : l.etat === "pas_encore_declare" ? (
                  "Aucun appareil de cette catégorie n'est déclaré dans Rojer."
                ) : (
                  "Ce matériel se déclare sur l'écran « Ce qui doit être en place »."
                )
              }
              droite={
                l.etat === "declare" ? (
                  <PastilleFiche ton="bleu">
                    {liste.length} déclaré{liste.length > 1 ? "s" : ""}
                  </PastilleFiche>
                ) : l.cible.kind === "categorie" ? (
                  <Link
                    href={hrefAjouter(l.cible.categorie)}
                    className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
                  >
                    <Plus aria-hidden />
                    Ajouter
                  </Link>
                ) : (
                  <Link
                    href={hrefEtatsPermanents}
                    className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
                  >
                    Déclarer
                  </Link>
                )
              }
            />
          );
        })}
      </LignesFiche>
    </section>
  );
}
