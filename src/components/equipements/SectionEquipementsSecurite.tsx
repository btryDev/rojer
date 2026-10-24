// La section « Équipements de sécurité » (décision du 2026-10-15) : le
// matériel dont un texte exige la PRÉSENCE ici, et ce que le parc en déclare.
//
// Elle ne dit jamais qu'un matériel est en place, ni qu'il suffit : elle dit
// ce qui est DÉCLARÉ dans Rojer (ADR-027). « Déclaré » est un fait de saisie,
// « pas encore déclaré » aussi — aucun des deux n'est un verdict (charte,
// interdits 16 et 17). La logique vit dans `equipements-securite.ts`, pure et
// testée ; ce composant ne fait que la poser, depuis un seul modèle de vue
// que la page construit (revue c6, point 5).
//
// [2026-10-24, décision de la propriétaire] Une carte repliable comme les
// domaines du parc, et dedans les MÊMES cartes de catégorie (CarteCategorie) :
// une seule charte sur la page.

import Link from "next/link";
import { BriefcaseMedical } from "lucide-react";
import { CarteCategorie, type AppareilListe } from "@/components/equipements/CarteCategorie";
import { MarqueIcone } from "@/components/equipements/MarqueCategorie";
import { PastilleFondement } from "@/components/etats-permanents/PastilleFondement";
import { buttonVariants } from "@/components/ui/button";
import { CarteRepliable } from "@/components/ui-kit/CarteRepliable";
import type { LigneEquipementSecurite } from "@/lib/equipements/equipements-securite";
import type { Periodicite } from "@/lib/referentiels/types-communs";

/** Une ligne prête à poser : ses appareils, comme le parc les montre. */
export type LigneSecuriteAffichee = Omit<LigneEquipementSecurite, "appareils"> & {
  appareils: AppareilListe[];
  periodicites: Periodicite[];
  /** « Déclarer » (`hrefActionSecurite`) pour le matériel hors parc ; l'ajout
   *  d'un appareil de la catégorie sinon. */
  hrefAction: string | null;
  hrefAjouter: string | null;
};

export function SectionEquipementsSecurite({
  lignes,
}: {
  lignes: LigneSecuriteAffichee[];
}) {
  if (lignes.length === 0) return null;
  // Seul « pas encore déclaré » manque : « ailleurs » se déclare sur un autre
  // écran, que cette section ne lit pas (revue du 2026-10-24).
  const aDeclarer = lignes.filter((l) => l.etat === "pas_encore_declare").length;

  // Ouverte tant qu'un matériel obligatoire reste à déclarer.
  return (
    <CarteRepliable
      titre="Équipements de sécurité"
      compte={`${lignes.length} obligatoire${lignes.length > 1 ? "s" : ""}`}
      alerte={aDeclarer > 0 ? `${aDeclarer} à déclarer` : null}
      ouverte={aDeclarer > 0}
    >
      {/* Une ligne (2026-10-24). « Déclaré » reste un fait de saisie, jamais
          un verdict (ADR-027). */}
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        Le matériel qu&apos;un texte vous impose ici — déclaré dans Rojer ne veut pas dire vérifié.
      </p>

      {lignes.map((l) => {
        const mention = (
          <>
            {l.aConfirmer ? (
              <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                À confirmer ici
              </span>
            ) : null}
            {l.fondement ? <PastilleFondement fondement={l.fondement} /> : null}
          </>
        );
        return l.cible.kind === "categorie" && l.hrefAjouter ? (
          <CarteCategorie
            key={l.obligationId}
            categorie={l.cible.categorie}
            titre={l.libelle}
            mention={mention}
            appareils={l.appareils}
            periodicites={l.periodicites}
            hrefAjouter={l.hrefAjouter}
          />
        ) : (
          // Le matériel qui ne se déclare pas au parc (premiers secours) :
          // l'en-tête d'une carte de catégorie, et son geste.
          <section key={l.obligationId}>
            <div className="flex items-center gap-3.5 border-b border-[color:var(--board-slate-line)] pb-3.5">
              <MarqueIcone icone={BriefcaseMedical} label={l.libelle} taille={44} />
              <div className="min-w-0 flex-1">
                <h2 className="board-titre m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[22px]">
                  {l.libelle}
                  {mention}
                </h2>
                <p className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-mid)]">
                  Ce matériel se déclare sur l&apos;écran « Ce qui doit être en place ».
                </p>
              </div>
              {l.hrefAction ? (
                <Link href={l.hrefAction} className={buttonVariants({ variant: "boardClair", size: "boardSm" })}>
                  Déclarer
                  <span className="sr-only"> — {enMinuscule(l.libelle)}</span>
                </Link>
              ) : null}
            </div>
          </section>
        );
      })}
    </CarteRepliable>
  );
}

/** « Système d'alarme sonore » → « système d'alarme sonore », en fin de phrase. */
function enMinuscule(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
