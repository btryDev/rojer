// La section « Équipements de sécurité » (décision du 2026-10-15) : le
// matériel dont un texte exige la PRÉSENCE ici, et ce que le parc en déclare.
//
// Elle ne dit jamais qu'un matériel est en place, ni qu'il suffit : elle dit
// ce qui est DÉCLARÉ dans Rojer (ADR-027). « Déclaré » est un fait de saisie,
// « pas encore déclaré » aussi — aucun des deux n'est un verdict (charte,
// interdits 16 et 17). La logique vit dans `equipements-securite.ts`, pure et
// testée ; ce composant ne fait que la poser, depuis un seul modèle de vue
// que la page construit (revue c6, point 5).

import Link from "next/link";
import { BriefcaseMedical, Plus } from "lucide-react";
import { MarqueCategorie, MarqueIcone } from "@/components/equipements/MarqueCategorie";
import { PastilleFondement } from "@/components/etats-permanents/PastilleFondement";
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

/** Une ligne prête à poser : ses appareils affichables et l'adresse de son geste. */
export type LigneSecuriteAffichee = Omit<LigneEquipementSecurite, "appareils"> & {
  appareils: AppareilAffiche[];
  /** « Ajouter » ou « Déclarer » (`hrefActionSecurite`) ; `null` si déclaré. */
  hrefAction: string | null;
};

export function SectionEquipementsSecurite({
  lignes,
}: {
  lignes: LigneSecuriteAffichee[];
}) {
  if (lignes.length === 0) return null;

  return (
    <section className="carte-board pt-6" aria-labelledby="equipements-securite">
      <div className="px-7 pb-3 sm:px-8">
        <h2 id="equipements-securite" className="board-titre m-0 text-[22px]">
          Équipements de sécurité
        </h2>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Le matériel dont un texte exige la présence dans votre établissement.
          Cette liste dit ce qui est déclaré dans Rojer, pas ce qui est en place
          chez vous : une déclaration n&apos;est pas une vérification.
        </p>
      </div>

      <LignesFiche>
        {lignes.map((l) => (
          <LigneFiche
            key={l.obligationId}
            tuile={
              l.cible.kind === "categorie" ? (
                <MarqueCategorie categorie={l.cible.categorie} taille={44} />
              ) : (
                <MarqueIcone icone={BriefcaseMedical} label={l.libelle} taille={44} />
              )
            }
            surtitre={l.aConfirmer ? "À confirmer ici" : "Obligatoire ici"}
            titre={
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {l.libelle}
                {l.fondement ? <PastilleFondement fondement={l.fondement} /> : null}
              </span>
            }
            detail={
              l.etat === "declare" ? (
                <span className="flex flex-col gap-1">
                  {l.appareils.map((a) => (
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
              l.hrefAction === null ? (
                <PastilleFiche ton="bleu">
                  <span className="tabular-nums">{l.appareils.length}</span> déclaré
                  {l.appareils.length > 1 ? "s" : ""}
                </PastilleFiche>
              ) : (
                <Link
                  href={l.hrefAction}
                  className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
                >
                  {l.cible.kind === "categorie" ? (
                    <>
                      <Plus aria-hidden />
                      Ajouter
                    </>
                  ) : (
                    "Déclarer"
                  )}
                  {/* Le libellé de la ligne, pas celui de la catégorie : le
                      bouton dit ce que la ligne affiche (contrôle visuel E3). */}
                  <span className="sr-only"> — {enMinuscule(l.libelle)}</span>
                </Link>
              )
            }
          />
        ))}
      </LignesFiche>
    </section>
  );
}

/** « Système d'alarme sonore » → « système d'alarme sonore », en fin de phrase. */
function enMinuscule(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
