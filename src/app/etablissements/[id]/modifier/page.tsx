import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EtablissementForm } from "@/components/etablissements/EtablissementForm";
import { modifierEtablissement } from "@/lib/etablissements/actions";
import { getEtablissement } from "@/lib/etablissements/queries";
import { SupprimerEtablissementButton } from "@/components/etablissements/SupprimerEtablissementButton";
import { mesurerPerimetreEtablissement } from "@/lib/suppression/queries";
import { cleJourCivil } from "@/lib/dates";

export default async function ModifierEtablissementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  const action = modifierEtablissement.bind(null, id);

  // Cf. la note de `SupprimerEtablissementButton` : la mesure se fait au rendu,
  // pas au clic, pour que la carte de confirmation s'ouvre sans délai.
  const perimetre = await mesurerPerimetreEtablissement(id);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* Le fil de retour porte le nom de l'établissement, le titre porte le
          geste : c'est le gabarit des écrans de saisie déjà migrés, et il
          évite d'écrire deux fois la même raison sociale. */}
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {etab.raisonDisplay}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Modifier l&apos;établissement
        </h1>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[880px] px-7 py-7 sm:px-8">
          <EtablissementForm
            action={action}
            valeursInitiales={{
              raisonDisplay: etab.raisonDisplay,
              adresse: etab.adresse,
              codeNaf: etab.codeNaf,
              effectifSurSite: etab.effectifSurSite,
              personnesPresentesHabituellement:
                etab.personnesPresentesHabituellement,
              manipuleMatieresR422722: etab.manipuleMatieresR422722,
              estEtablissementTravail: etab.estEtablissementTravail,
              estERP: etab.estERP,
              estIGH: etab.estIGH,
              estHabitation: etab.estHabitation,
              typeErp: etab.typeErp,
              categorieErp: etab.categorieErp,
              comporteLocauxSommeilPublic: etab.comporteLocauxSommeilPublic,
              natureActivite: etab.natureActivite,
              effectifPublicAdmis: etab.effectifPublicAdmis,
              // `<input type="date">` attend une clé de jour civil. La produire
              // via `cleJourCivil` et non `toISOString().slice(0,10)` : ancrée
              // dans le fuseau de référence (ADR-011), sinon une date de début
              // de journée s'afficherait la veille.
              dateAutorisationOuverture: etab.dateAutorisationOuverture
                ? cleJourCivil(etab.dateAutorisationOuverture)
                : null,
              dateCertificatConformite: etab.dateCertificatConformite
                ? cleJourCivil(etab.dateCertificatConformite)
                : null,
            }}
            libelleSubmit="Enregistrer"
            labelAnnuler={{
              libelle: "Annuler",
              href: `/etablissements/${id}`,
            }}
          />
        </div>

        {/* La zone sensible, jumelle de celle de `/entreprises/<id>/modifier`.
            Elle est ici et non sur `/etablissements/<id>` : celui-là est le
            tableau de bord qu'on ouvre tous les jours, et une commande qui
            emporte le dossier n'a pas sa place à côté de ce qu'on vient lire.
            L'écran de modification est celui où l'établissement se change ;
            le supprimer en est le cas extrême. */}
        <div className="mt-8 max-w-[880px] border-t border-[color:var(--board-slate-line)] pt-8">
          <h2 className="m-0 text-[13.5px] font-semibold text-[color:var(--board-signal-ink)]">
            Zone sensible
          </h2>
          <p className="m-0 mt-1.5 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            La suppression efface l&apos;établissement et tout son dossier. Elle
            est refusée dès qu&apos;une version de son DUERP est archivée : le
            Code du travail les fait conserver 40 ans à compter de leur élaboration (art. R. 4121-4).
          </p>
          <div className="mt-4">
            <SupprimerEtablissementButton id={id} perimetre={perimetre} />
          </div>
        </div>
      </div>
    </main>
  );
}
