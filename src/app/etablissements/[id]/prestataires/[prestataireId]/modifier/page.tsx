import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormulairePrestataire } from "@/components/prestataires/FormulairePrestataire";
import { getPrestataire } from "@/lib/prestataires/queries";
import { modifierPrestataire } from "@/lib/prestataires/actions";
import { cleJourCivil } from "@/lib/dates";

/**
 * Modifier une fiche prestataire (2026-10-12, audit des modules, B4). Le
 * formulaire est celui de la création, pré-rempli ; l'action reprend ses
 * validations. Une fiche ne se corrigeait pas après coup : ni nouvelle
 * attestation, ni RC Pro, ni Kbis, ni contacts.
 */
export default async function ModifierPrestatairePage({
  params,
}: {
  params: Promise<{ id: string; prestataireId: string }>;
}) {
  const { id, prestataireId } = await params;
  const p = await getPrestataire(id, prestataireId);
  if (!p) notFound();

  const jour = (d: Date | null) => (d ? cleJourCivil(d) : undefined);
  const fiche = `/etablissements/${id}/prestataires/${p.id}`;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={fiche}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {p.raisonSociale}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Modifier le prestataire
        </h1>
        <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Une nouvelle attestation se saisit ici avec sa pièce, sa validité et
          ses dates de remise et d&apos;émission : c&apos;est la plus proche de
          la validité et de la remise suivante qui fixe son statut.
        </p>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <FormulairePrestataire
            etablissementId={id}
            action={modifierPrestataire.bind(null, id, p.id)}
            initial={{
              prestataireId: p.id,
              raisonSociale: p.raisonSociale,
              siret: p.siret,
              estOrganismeAgree: p.estOrganismeAgree,
              domaines: p.domaines,
              contactNom: p.contactNom,
              contactEmail: p.contactEmail,
              contactTelephone: p.contactTelephone,
              attestationUrssafValableJusquA: jour(p.attestationUrssafValableJusquA),
              attestationUrssafRemiseLe: jour(p.attestationUrssafRemiseLe),
              attestationUrssafEmiseLe: jour(p.attestationUrssafEmiseLe),
              assuranceRcProValableJusquA: jour(p.assuranceRcProValableJusquA),
              kbisDateEmission: jour(p.kbisDateEmission),
              notesInternes: p.notesInternes,
              pieces: {
                urssaf: p.attestationUrssafCle ? (p.attestationUrssafNom ?? "déposée") : null,
                rcpro: p.assuranceRcProCle ? (p.assuranceRcProNom ?? "déposée") : null,
                kbis: p.kbisCle ? (p.kbisNom ?? "déposée") : null,
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
