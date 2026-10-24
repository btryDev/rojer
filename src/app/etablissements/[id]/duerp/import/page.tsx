import Link from "next/link";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { LegalBadge, WhyCard } from "@/components/ui-kit";
import { ImportDuerpWizard } from "@/components/duerps/ImportDuerpWizard";
import { requireEtablissement } from "@/lib/auth/scope";

export const metadata = {
  title: "Importer un DUERP existant",
};

export default async function ImportDuerpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);

  return (
    <>
      <AppTopbar
        title="Importer un DUERP"
        subtitle="Si vous avez déjà un DUERP Excel, téléversez-le pour démarrer plus vite."
        crumbs={[
          { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
          { href: `/etablissements/${id}/duerp`, label: "DUERP" },
          { label: "Importer" },
        ]}
        actions={
          <Link
            href={`/etablissements/${id}/duerp`}
            className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
          >
            Retour au DUERP →
          </Link>
        }
      />

      <main className="flex flex-1 flex-col gap-[22px] bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pb-16 pt-6">
        <WhyCard
          charte="board"
          kicker="Pourquoi importer"
          titre="Repartez de ce que vous avez déjà."
          enjeu="La loi ne vous demande pas de repartir de zéro à chaque outil : elle exige un DUERP tenu à jour, peu importe son support d'origine."
          tonalite="info"
        >
          <p className="m-0">
            Téléversez votre DUERP Excel actuel. Nous détectons les colonnes
            automatiquement, vous vérifiez l&apos;aperçu, vous importez. Les
            risques, unités de travail et mesures existantes sont créés en base,
            et vous continuez à le faire évoluer dans la plateforme.
          </p>
          <div className="mt-3">
            <LegalBadge
              charte="board"
              reference="Art. R. 4121-1 CT"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023795562"
              extrait="L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques pour la santé et la sécurité des travailleurs à laquelle il procède en application de l'article L. 4121-3."
            >
              Le Code du travail impose <strong>un</strong> DUERP tenu à jour —
              il ne prescrit pas de format imposé.
            </LegalBadge>
          </div>
        </WhyCard>

        <ImportDuerpWizard etablissementId={id} />

        <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-7 py-5 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Format attendu
          </p>
          <ul className="m-0 mt-3 flex max-w-[var(--board-mesure)] list-none flex-col gap-1.5 p-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
            <li>
              <strong>Colonnes obligatoires :</strong> Unité de travail · Risque
              · Gravité (1-4) · Probabilité (1-4) · Maîtrise (1-4)
            </li>
            <li>
              <strong>Colonnes optionnelles :</strong> Description · Mesures
              existantes (séparées par <code>|</code> ou <code>;</code>)
            </li>
            <li>
              Les variantes d&apos;orthographe et d&apos;accents sont tolérées :{" "}
              <em>unité / unite / poste</em>, <em>risque / libelle / danger</em>, etc.
            </li>
          </ul>
        </div>
      </main>
    </>
  );
}
