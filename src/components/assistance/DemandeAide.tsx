"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import type { CategorieAssistance } from "@prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { LienProvenance } from "@/components/navigation/LienProvenance";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { PAGE_FORMULES } from "@/lib/abonnements/sous-pages";
import {
  LIBELLE_BESOIN_AIDE,
  MESSAGE_FORMULE_PRO,
  cheminAssistance,
  exigeLaFormulePro,
} from "@/lib/assistance/libelles";
import { FormulaireAssistance } from "./FormulaireAssistance";
import { useAssistancePro } from "./FormuleAssistance";

/**
 * « Besoin d'aide ? » dans les écrans (décision de la propriétaire du
 * 2026-10-24) : un texte adapté à l'endroit, qui ouvre le formulaire de
 * l'assistance dans un panneau.
 *
 *   - `encart` : une accroche et un bouton, là où le doute est fort ;
 *   - `lien`   : une ligne discrète, au fil d'un parcours.
 *
 * ~~`rail` et `feuille` : l'entrée permanente de la barre latérale et de la
 * navigation du téléphone.~~ [2026-11-24, ADR-050 amendée : l'entrée
 * permanente est devenue la page « Assistance » (`LienAssistance`), la même
 * pour toutes les formules.] Sans la formule Pro, une question de
 * prévention présente la formule au lieu du formulaire.
 */
export function DemandeAide({
  variante,
  libelle = LIBELLE_BESOIN_AIDE,
  accroche,
  categorie = "autre",
  contexte,
  etablissementId,
}: {
  variante: "encart" | "lien";
  /** Le texte du bouton ou du lien, adapté à l'endroit. */
  libelle?: string;
  /** Pour l'encart : la phrase qui pose le doute. */
  accroche?: string;
  categorie?: CategorieAssistance;
  /** Ce que l'écran regardait (« Vérification annuelle des BAES »). */
  contexte?: string;
  etablissementId?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const ouvrir = () => setOuvert(true);
  const pro = useAssistancePro();
  // Décidé une fois : le titre du panneau et son contenu ne divergent pas.
  const offrePro = !pro && exigeLaFormulePro(categorie);

  const declencheur =
    variante === "lien" ? (
      <button
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        className="inline p-0 text-left text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4 hover:text-[color:var(--board-ink)]"
      >
        {libelle}
      </button>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-4">
        {accroche && (
          <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">{accroche}</p>
        )}
        <Button type="button" variant="boardClair" size="boardSm" onClick={ouvrir} aria-haspopup="dialog">
          <LifeBuoy aria-hidden className="size-4" />
          {libelle}
        </Button>
      </div>
    );

  return (
    <>
      {declencheur}
      <PanneauModal
        ouvert={ouvert}
        surFermer={fermer}
        surtitre="Assistance"
        titre={offrePro ? "Avec la formule Pro" : LIBELLE_BESOIN_AIDE}
      >
        {/* Monté à l'ouverture : chaque ouverture repart d'un formulaire neuf. */}
        {ouvert &&
          (offrePro ? (
            <OffrePro etablissementId={etablissementId} />
          ) : (
            <FormulaireAssistance
              pro={pro}
              categorie={categorie}
              contexte={contexte}
              etablissementId={etablissementId}
              surFermer={fermer}
            />
          ))}
      </PanneauModal>
    </>
  );
}

/** Ce que voit, devant une question de prévention, un compte sans la formule Pro. */
function OffrePro({ etablissementId }: { etablissementId?: string }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="m-0">{MESSAGE_FORMULE_PRO}</p>
      <Link href={PAGE_FORMULES} className={buttonVariants({ variant: "boardClair", size: "boardSm" })}>
        Comparer les formules
      </Link>
      {etablissementId && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
          Un souci dans l&apos;application&nbsp;?{" "}
          {/* La page d'où l'on vient part avec un problème technique (`?de=`, relecture du 2026-11-24). */}
          <LienProvenance
            href={cheminAssistance(etablissementId)}
            className="font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4"
          >
            Écrivez-nous
          </LienProvenance>
          .
        </p>
      )}
    </div>
  );
}
