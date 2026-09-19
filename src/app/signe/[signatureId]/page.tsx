import Link from "next/link";
import { notFound } from "next/navigation";
import { getSignature } from "@/lib/signatures/queries";
import { SignatureBlock, LegalBadge } from "@/components/ui-kit";

/**
 * Page publique de confirmation après signature. Accessible sans
 * authentification : le signataire externe y est redirigé automatiquement
 * après soumission de son OTP.
 *
 * Contrairement à /verifier/[id] qui recalcule le hash et peut dire
 * « document modifié », cette page se contente de présenter proprement
 * la signature qui vient d'être posée — c'est un accusé de réception.
 *
 * ── Même projection que `/verifier`, et pas une de plus ─────────────────
 *
 * Les deux pages sont publiques et prennent le MÊME identifiant : quiconque
 * tient un `/verifier/sig_…` — l'inspecteur, l'assureur, l'acquéreur à qui on
 * l'a transmis — n'a qu'à remplacer `verifier` par `signe`. Cette page lisait
 * la signature avec l'établissement et l'entreprise, et affichait la raison
 * sociale et le nom du site que `/verifier` retient à dessein. Elle lit
 * désormais par `getSignature`, dont la projection (`SELECT_PREUVE`) est la
 * seule décision de ce qu'un tiers sans compte peut voir d'une signature.
 *
 * La ligne « Demandé par » disparaît donc. Le signataire n'y perd rien : il
 * vient de voir, sur la page du lien, qui lui demandait de signer, et le
 * courriel qu'il a reçu le dit aussi.
 */
export default async function ConfirmationSignaturePage({
  params,
}: {
  params: Promise<{ signatureId: string }>;
}) {
  const { signatureId } = await params;
  const signature = await getSignature(signatureId);
  if (!signature) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:px-10">
      {/* Bandeau de confirmation */}
      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--board-green-ink)]/40 bg-[color:var(--board-green)] p-10 text-center">
        <div
          aria-hidden
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[color:var(--board-green-ink)] bg-[color:var(--board-card)] font-mono text-4xl text-[color:var(--board-green-ink)]"
        >
          ✓
        </div>
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)] text-[color:var(--board-green-ink)]">
          Signature enregistrée
        </p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.025em] leading-tight">
          Merci {signature.signataireNom.split(" ")[0]},
          <br />
          votre signature est prise en compte.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[0.95rem] leading-relaxed text-[color:var(--board-ink)]">
          Un accusé de réception daté et horodaté a été généré. Vous pouvez
          fermer cette fenêtre ou conserver le lien de cette page pour vos
          archives.
        </p>
      </section>

      {/* Scellé de la signature */}
      <section className="mt-8">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)] mb-3">Détail de la signature</p>
        <SignatureBlock charte="board"
          signataireNom={signature.signataireNom}
          signataireRole={signature.signataireRole}
          signataireEmail={signature.signataireEmail}
          horodatageIso={signature.horodatageIso}
          methode={signature.methode}
          hashDocument={signature.hashDocument}
          nomDocument={signature.nomDocument}
          signatureId={signature.id}
          verifierHref={`/verifier/${signature.id}`}
        />
      </section>

      {/* Contexte */}
      <section className="mt-8 rounded-xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-5 text-[0.85rem]">
        <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-[160px_1fr]">
          <dt className="text-[color:var(--muted-foreground)]">Document :</dt>
          <dd className="text-[color:var(--board-ink)]">
            {signature.nomDocument ?? "Document à signer"}
          </dd>
          <dt className="text-[color:var(--muted-foreground)]">Référence :</dt>
          <dd className="font-mono text-[0.78rem] text-[color:var(--board-slate-soft)]">
            {signature.id}
          </dd>
        </dl>
      </section>

      {/* Valeur probante */}
      <section className="mt-8">
        <LegalBadge charte="board"
          reference="Art. 1366 · 1367 Code civil · eIDAS simple"
          extrait="L'écrit électronique a la même force probante que l'écrit sur support papier, sous réserve que puisse être dûment identifiée la personne dont il émane et qu'il soit établi et conservé dans des conditions de nature à en garantir l'intégrité."
          defaultOpen
        >
          Votre signature électronique est couverte par l&apos;article 1367
          du Code civil et par le règlement européen eIDAS (UE) 910/2014 au
          niveau « simple ». À tout moment, l&apos;intégrité du document
          peut être revérifiée depuis la page « Vérifier l&apos;intégrité ».
        </LegalBadge>
      </section>

      {/* Pied : retour */}
      <footer className="mt-10 flex items-center justify-center">
        <Link
          href="/"
          className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--muted-foreground)] hover:text-[color:var(--board-ink)]"
        >
          Fermer cette fenêtre ↗
        </Link>
      </footer>
    </main>
  );
}
