// LE TARIF — trois offres, la mise en route accompagnée (sans prix, un
// contact), puis la grille complète dans un volet. Données : `tarif-
// donnees.ts` (grille du 2026-11-05).
//
// Rien n'y dit « conforme » : l'expert donne un conseil technique, jamais un
// avis juridique, et la mention le rappelle.

import type { CompteLanding } from "./compte";
import { BoutonContact } from "./BoutonContact";
import { Reveal } from "./Reveal";
import { GrilleDesOffres } from "./GrilleDesOffres";
import { TarifOffres } from "./TarifOffres";


export function Tarif({ compte }: { compte?: CompteLanding }) {
  return (
    <section id="tarif" className="bg-[color:var(--board-card)] py-24 sm:py-32">
      <div className="lp-shell">
        <Reveal as="header" className="text-center">
          <p className="lp-eyebrow">Tarif</p>
          <h2 className="lp-titre lp-h2 mt-3.5">Une offre selon la taille de votre structure</h2>
          <p className="lp-lede mx-auto mt-4 max-w-[52ch]">
            30 jours d&apos;essai sur Essentiel, sans carte bancaire. Mensuel
            sans engagement, ou annuel à −15&nbsp;%.
          </p>
        </Reveal>

        <Reveal delai={120}>
          <TarifOffres compte={compte} />
        </Reveal>

        {/* La mise en route accompagnée : pas de prix pour l'instant. */}
        <Reveal delai={160}>
          <div className="mt-7 flex flex-col items-start gap-6 rounded-[22px] bg-[color:var(--board-blue-pale)] px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="lp-titre text-[1.15rem]">Mise en route accompagnée</h3>
              <p className="mt-1.5 max-w-[62ch] text-[0.92rem] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Nous remplissons Rojer avec vous : votre établissement, vos
                équipements, votre DUERP existant et les rapports déjà reçus.
                Vous repartez avec un dossier rempli.
              </p>
            </div>
            <BoutonContact sujet="Mise en route accompagnée" className="lp-btn-ink flex-none" />
          </div>
        </Reveal>

        <p className="mt-5 text-center text-[0.78rem] text-[color:var(--board-slate-soft)]">
          Prix TTC, TVA de 20 % incluse. Essai sans carte bancaire. L&apos;expert donne un
          conseil technique de prévention, jamais un avis juridique.
        </p>

        <GrilleDesOffres />
      </div>
    </section>
  );
}
