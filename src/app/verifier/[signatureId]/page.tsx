import Link from "next/link";
import { verifierIntegriteSignature } from "@/lib/signatures/actions";
import { SignatureBlock } from "@/components/ui-kit";

/**
 * Page publique de vérification d'intégrité d'une signature.
 * Accessible sans authentification. Réponse simple :
 *   - ✓ La signature est valide : le document n'a pas été modifié depuis
 *     la signature.
 *   - ✗ Le document a été modifié (ou n'est plus accessible).
 */
export default async function VerifierSignaturePage({
  params,
}: {
  params: Promise<{ signatureId: string }>;
}) {
  const { signatureId } = await params;
  const res = await verifierIntegriteSignature(signatureId);

  if (res.ok === false && res.raison === "inexistante") {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 sm:px-10">
        <div className="carte-board px-7 py-7 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Signature introuvable</p>
          <h1 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.02em]">
            Aucune signature avec cet identifiant
          </h1>
          <p className="mt-4 text-[0.9rem] text-[color:var(--muted-foreground)]">
            Vérifiez l&apos;identifiant transmis. Une signature valide a
            l&apos;identifiant <code>sig_…</code>.
          </p>
        </div>
      </main>
    );
  }

  // NI « VALIDE », NI « MODIFIÉ », ET C'EST TOUT LE POINT. L'empreinte de cette
  // signature a été calculée sur une forme du document que le produit n'écrit
  // plus — le plan de prévention a gagné les cinq rubriques de R. 4512-8 le
  // 2026-09-07. La comparer à l'empreinte d'aujourd'hui rendrait un écart
  // certain, et annoncer « document modifié » à un inspecteur serait une
  // accusation de falsification fabriquée par une mise à jour du logiciel.
  // Annoncer « valide » serait le mensonge inverse, et le pire des deux sur un
  // outil de preuve. Cette page rend donc un ton neutre : la signature est un
  // témoin authentique, le contrôle automatique ne peut pas s'exercer.
  if (res.ok === false && res.raison === "version_anterieure") {
    const s = res.signature;
    return (
      <main className="mx-auto max-w-2xl px-6 py-14 sm:px-10">
        <nav>
          <Link
            href="/"
            className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
          >
            ← Accueil
          </Link>
        </nav>
        <header className="mt-6 space-y-3">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Vérification publique d&apos;intégrité
          </p>
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em]">
            Signature authentique — comparaison automatique impossible
          </h1>
          <div className="space-y-2 text-[0.9rem] text-[color:var(--muted-foreground)]">
            <p>
              Cette signature est bien enregistrée, avec son signataire, son
              horodatage et l&apos;empreinte du document tel qu&apos;il se
              présentait au moment où elle a été apposée.
            </p>
            <p>
              Depuis, la façon dont ce type de document est mis en forme pour le
              calcul d&apos;empreinte a changé. Une empreinte ne se compare
              qu&apos;à une empreinte de la même forme : le recalcul
              d&apos;aujourd&apos;hui ne peut donc ni confirmer ni infirmer que
              le document a été modifié.{" "}
              <strong>
                Ce n&apos;est pas l&apos;indice d&apos;une modification
              </strong>{" "}
              — c&apos;est la conséquence d&apos;une mise à jour du logiciel.
            </p>
          </div>
        </header>

        <div className="mt-8">
          <SignatureBlock
            charte="board"
            signataireNom={s.signataireNom}
            signataireRole={s.signataireRole}
            signataireEmail={s.signataireEmail}
            horodatageIso={s.horodatageIso}
            methode={s.methode}
            hashDocument={s.hashDocument}
            nomDocument={s.nomDocument}
            signatureId={s.id}
          />
        </div>

        <footer className="mt-8 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--board-slate-soft)]">
          Fondement légal : art. 1366-1367 Code civil, règlement eIDAS (UE)
          910/2014 · niveau simple.
        </footer>
      </main>
    );
  }

  if (res.ok === false) {
    const titre =
      res.raison === "document_modifie"
        ? "Signature invalide — document modifié"
        : "Document introuvable";
    return (
      <main className="mx-auto max-w-xl px-6 py-16 sm:px-10">
        <div className="rounded-2xl border border-[color:var(--board-signal-ink)]/50 bg-[color:color-mix(in_oklch,var(--board-signal-ink)_8%,transparent)] p-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)] text-[color:var(--board-signal-ink)]">Échec de la vérification</p>
          <h1 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em] text-[color:var(--board-signal-ink)]">
            {titre}
          </h1>
          {res.raison === "document_modifie" && (
            <div className="mt-4 space-y-2 text-[0.85rem] text-[color:var(--board-ink)]">
              <p>
                Le document actuel ne correspond pas à celui qui a été signé.
                Son empreinte SHA-256 est différente — un octet au moins a été
                modifié depuis la signature.
              </p>
              <p className="font-mono text-[0.7rem] text-[color:var(--board-slate-soft)]">
                Hash attendu&nbsp;: {res.hashAttendu.slice(0, 16)}…
                <br />
                Hash actuel&nbsp;: {res.hashActuel.slice(0, 16)}…
              </p>
            </div>
          )}
          {res.raison === "document_introuvable" && (
            <p className="mt-4 text-[0.85rem]">
              Le document original n&apos;est plus accessible au serveur
              (fichier supprimé, changement de stockage…). La signature reste
              en archive mais ne peut être vérifiée automatiquement.
            </p>
          )}
        </div>
      </main>
    );
  }

  const s = res.signature!;
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:px-10">
      <nav>
        <Link
          href="/"
          className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
        >
          ← Accueil
        </Link>
      </nav>
      <header className="mt-6 space-y-3">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Vérification publique d&apos;intégrité</p>
        <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em]">
          Signature valide — document inchangé
        </h1>
        <p className="text-[0.9rem] text-[color:var(--muted-foreground)]">
          L&apos;empreinte SHA-256 du document actuel correspond à celle
          enregistrée au moment de la signature. Aucune modification n&apos;a
          été faite depuis.
        </p>
      </header>

      <div className="mt-8">
        <SignatureBlock charte="board"
          signataireNom={s.signataireNom}
          signataireRole={s.signataireRole}
          signataireEmail={s.signataireEmail}
          horodatageIso={s.horodatageIso}
          methode={s.methode}
          hashDocument={s.hashDocument}
          nomDocument={s.nomDocument}
          signatureId={s.id}
        />
      </div>

      <footer className="mt-8 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--board-slate-soft)]">
        Fondement légal : art. 1366-1367 Code civil, règlement eIDAS (UE)
        910/2014 · niveau simple.
      </footer>
    </main>
  );
}
