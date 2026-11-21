import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { propositionSchema, type PlanComparable } from "@/lib/plan-prevention/proposition";
import { bandeauDeLaProposition, lignesDEcart, type LigneEcart } from "@/lib/plan-prevention/bandeau-proposition";
import { formaterHeureEnLettresFr, formaterJourMoisChiffresFr } from "@/lib/dates";
import { TraiterPropositionBoutons } from "./ContreSignatureBoutons";
import { CarteActionRequise, RappelSuivi } from "./ActionRequise";

/**
 * Ce que la fiche du plan montre de la contre-signature (ADR-061).
 *
 * ~~[2026-11-19, lot 4, maquette V2 « Bandeau »] Une carte blanche à filet
 * ambre, une ligne par écart façon calendrier (« ~ », « + », « − »)~~
 * [2026-11-21, maquette « Bloc Suivi » validée] La proposition de
 * l'entreprise extérieure : une carte d'action intérieure, « À décider », les
 * écarts en tableau — ce qui change, aujourd'hui (barré), proposé (gras) —,
 * puis les trois gestes. Après « Corriger », la même carte en bleu,
 * « Correction en cours ». Les signatures révoquées ne sont pas listées ici :
 * elles sont dans l'historique, chacune vérifiable.
 */

/** Les écarts de la proposition, relus contre le plan d'aujourd'hui ; `null` si elle ne se lit plus. */
function ecartsDe(plan: PlanComparable, contenu: Prisma.JsonValue): LigneEcart[] | null {
  const lue = propositionSchema.safeParse(contenu);
  return lue.success ? lignesDEcart(bandeauDeLaProposition(plan, lue.data)) : null;
}

const modifications = (n: number) => `${n} modification${n > 1 ? "s" : ""}`;
const recue = (d: Date) => `${formaterJourMoisChiffresFr(d)} à ${formaterHeureEnLettresFr(d)}`;

/** Une cellule vide, la même dans les deux colonnes : un tiret discret, dit « vide » au lecteur d'écran. */
function Vide() {
  return (
    <>
      <span aria-hidden className="text-[color:var(--board-slate-soft)]">
        —
      </span>
      <span className="sr-only">vide</span>
    </>
  );
}

function TableauEcarts({ lignes }: { lignes: LigneEcart[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr className="text-left text-[12.5px] text-[color:var(--board-slate-mid)]">
            <th scope="col" className="w-[34%] pb-2 pr-4 font-medium">Ce qui change</th>
            <th scope="col" className="w-[28%] pb-2 pr-4 font-medium">Aujourd&apos;hui</th>
            <th scope="col" className="pb-2 font-medium">Proposé</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.cle} className="border-t border-[color:var(--board-slate-pale)] align-top">
              <td className="py-2.5 pr-4">{l.quoi}</td>
              <td className="whitespace-pre-wrap py-2.5 pr-4">
                {l.avant ? <s className="text-[color:var(--board-slate-soft)]">{l.avant}</s> : <Vide />}
              </td>
              <td
                className={`whitespace-pre-wrap py-2.5 ${l.genre === "supprime" ? "text-[color:var(--board-signal-ink)]" : ""}`}
              >
                {l.apres ? <strong className="font-semibold">{l.apres}</strong> : <Vide />}
                {/* Un risque ajouté : ce qui sera écrit à l'acceptation. */}
                {l.details.map((d) => (
                  <span key={d} className="mt-0.5 block text-[13px] text-[color:var(--board-slate-mid)]">
                    {d}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Le rappel de l'onglet « Le plan » (2026-11-21, maquette « Bloc Plan ») :
 * une ligne du bloc, la décision se prend dans « Suivi ».
 */
export function RappelProposition({
  proposition,
  plan,
  suiviHref,
}: {
  proposition: { contenu: Prisma.JsonValue; createdAt: Date };
  plan: PlanComparable;
  suiviHref: string;
}) {
  const n = ecartsDe(plan, proposition.contenu)?.length ?? 0;
  return (
    <RappelSuivi href={suiviHref} action="Décider dans Suivi">
      <strong className="font-semibold">
        {plan.entrepriseExterieureRaison} propose {n > 0 ? modifications(n) : "des modifications"}.
      </strong>{" "}
      Le plan ne se signe plus avant votre réponse.
    </RappelSuivi>
  );
}

/**
 * Le rappel de la correction en cours, sur l'onglet « Le plan »
 * (2026-11-21, relecture : revenu de « Modifier », rien ne la signalait).
 */
export function RappelCorrection({ raisonEE, suiviHref }: { raisonEE: string; suiviHref: string }) {
  return (
    <RappelSuivi href={suiviHref} action="Terminer dans Suivi">
      <strong className="font-semibold">Correction en cours.</strong> La proposition de {raisonEE} est reprise dans le
      plan : signez pour la terminer.
    </RappelSuivi>
  );
}

export function PropositionEnAttente({
  proposition,
  plan,
  auteur,
}: {
  proposition: { id: string; contenu: Prisma.JsonValue; createdAt: Date };
  plan: PlanComparable;
  /** Qui a proposé : le nom du lien, à défaut son adresse. */
  auteur: string | null;
}) {
  const ecarts = ecartsDe(plan, proposition.contenu);
  const raison = plan.entrepriseExterieureRaison;
  const n = ecarts?.length ?? 0;
  return (
    <CarteActionRequise
      id="proposition-titre"
      etiquette="À décider"
      date={`reçue le ${recue(proposition.createdAt)}`}
      titre={n > 0 ? `${raison} propose ${modifications(n)}` : `${raison} propose de modifier le plan`}
      phrase={`${auteur ? `${auteur}, depuis son lien. ` : ""}Le plan ne se signe plus tant que vous n'avez pas répondu.`}
      pied={<TraiterPropositionBoutons propositionId={proposition.id} raisonEE={raison} />}
    >
      {!ecarts ? (
        <p className="m-0 text-[13.5px] text-[color:var(--board-signal-ink)]">
          Cette proposition ne se lit plus : refusez-la et corrigez le plan à la main.
        </p>
      ) : (
        <TableauEcarts lignes={ecarts} />
      )}
    </CarteActionRequise>
  );
}

/**
 * Après « Corriger » (2026-11-19) : la proposition est appliquée, le
 * dirigeant retouche le plan, puis signe. « Terminer la correction et
 * signer » ouvre la fenêtre de signature (`?openSign=1`) ; la correction se
 * termine quand il signe (`poserSignatureCompteAvecCode`). [2026-11-21 : la
 * carte d'action, en bleu.]
 */
export function CorrectionEnCours({
  raisonEE,
  modifierHref,
  signerHref,
}: {
  raisonEE: string;
  modifierHref: string;
  signerHref: string;
}) {
  return (
    <CarteActionRequise
      id="correction-titre"
      ton="bleu"
      etiquette="Après « Corriger »"
      titre="Correction en cours"
      ecriture
      pied={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 max-w-[440px] text-[12.5px] text-[color:var(--board-slate-mid)]">
            La proposition de {raisonEE} est reprise dans le plan :{" "}
            <Link href={modifierHref} className="text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline">
              retouchez ce que vous voulez
            </Link>
            , puis signez.
          </p>
          <Link
            href={signerHref}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--board-ink)] px-6 font-display text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Terminer la correction et signer
          </Link>
        </div>
      }
    />
  );
}
