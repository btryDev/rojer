import Link from "next/link";
import { notFound } from "next/navigation";
import { verifierAccessToken } from "@/lib/access-tokens/verify";
import { WhyCard, LegalBadge } from "@/components/ui-kit";
import { SignatureExterneForm } from "@/components/signatures/SignatureExterneForm";
import { prisma } from "@/lib/prisma";
import { formaterDateFr } from "@/lib/dates";

/**
 * Page publique non authentifiée : un prestataire arrive ici via un lien
 * magique envoyé par email. Selon le scope du token, on propose une action
 * (signer / déposer un rapport / consulter).
 *
 * Au MVP, on implémente le scope `signature`. Les autres scopes affichent
 * un message « à venir » avec les détails de l'objet.
 */
export default async function AccesParTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const res = await verifierAccessToken(token);

  if (!res.ok) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 sm:px-10">
        <div className="rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Lien invalide</p>
          <h1 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">
            {res.raison === "inexistant" && "Ce lien n'existe pas"}
            {res.raison === "expire" && "Ce lien a expiré"}
            {res.raison === "revoque" && "Ce lien a été révoqué"}
            {res.raison === "deja_utilise" && "Ce lien a déjà servi"}
          </h1>
          <p className="mt-4 text-[0.9rem] leading-relaxed text-[color:var(--muted-foreground)]">
            {res.raison === "expire" &&
              `Demandez un nouveau lien à la personne qui vous l'a envoyé.`}
            {res.raison === "revoque" && res.motif}
            {res.raison === "deja_utilise" &&
              `Le document a été signé le ${formaterDateFr(res.utiliseLe)}.`}
            {res.raison === "inexistant" &&
              `Vérifiez que vous avez bien cliqué sur le dernier lien reçu.`}
          </p>
        </div>
      </main>
    );
  }

  const t = res.token;

  // Récupération du contexte métier pour affichage (qui signe quoi).
  const etablissement = await prisma.etablissement.findUnique({
    where: { id: t.etablissementId },
    select: {
      raisonDisplay: true,
      entreprise: { select: { raisonSociale: true } },
    },
  });
  if (!etablissement) notFound();

  const libelleObjet = await libelleObjetSignable(
    t.objetType,
    t.objetId,
    t.etablissementId,
  );

  if (t.scope === "signature") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 sm:px-10">
        <header className="space-y-3">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Signature demandée par</p>
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em] leading-tight">
            {etablissement.entreprise.raisonSociale}
            <span className="text-[color:var(--muted-foreground)]">
              {" · "}
              {etablissement.raisonDisplay}
            </span>
          </h1>
        </header>

        <div className="mt-8">
          <WhyCard charte="board"
            kicker="Ce que vous signez"
            titre={libelleObjet.titre}
            enjeu={libelleObjet.description}
          >
            <LegalBadge charte="board"
              reference="Art. 1366 · 1367 Code civil · eIDAS simple"
              extrait="L'écrit électronique a la même force probante que l'écrit sur support papier, sous réserve que puisse être dûment identifiée la personne dont il émane et qu'il soit établi et conservé dans des conditions de nature à en garantir l'intégrité."
            >
              Votre signature est posée avec une preuve d&apos;intégrité
              (empreinte SHA-256 du document) et un horodatage serveur.
              Vous pourrez à tout moment vérifier qu&apos;elle porte bien sur
              le document non modifié.
            </LegalBadge>
          </WhyCard>
        </div>

        <div className="mt-10">
          <SignatureExterneForm
            token={token}
            destinataire={{
              email: t.emailDestinataire,
              nom: t.nomDestinataire,
            }}
            expireLe={t.expireLe}
          />
        </div>
      </main>
    );
  }

  // Autres scopes — placeholders pour phases futures.
  return (
    <main className="mx-auto max-w-xl px-6 py-16 sm:px-10 text-center">
      <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">Accès externe</p>
      <h1 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">
        Cette action n&apos;est pas encore disponible
      </h1>
      <p className="mt-4 text-[0.9rem] text-[color:var(--muted-foreground)]">
        Vous avez été invité à : <strong>{t.scope}</strong> sur{" "}
        <em>{libelleObjet.titre}</em>. Ce flux sera activé dans une prochaine
        mise à jour.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block font-mono text-[0.8rem] uppercase tracking-[0.12em] text-[color:var(--board-blue-ink)] hover:underline"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}

/**
 * Libellé de l'objet visé, pour dire au porteur du lien ce qu'il signe.
 *
 * **`etablissementId` est un paramètre obligatoire**, et il vient du jeton,
 * jamais de l'URL. Cette fonction lisait le rapport sur son seul identifiant :
 * elle rendait alors le nom du fichier, la date et l'obligation d'un rapport
 * appartenant à n'importe quel établissement. L'émission d'un jeton borne
 * désormais `objetId` à l'établissement (`lib/signatures/appartenance.ts`),
 * mais un jeton émis avant ce garde reste en base jusqu'à son expiration —
 * et c'est ici que se joue ce qu'il donne à lire.
 *
 * Un objet hors du périmètre du jeton est traité comme inexistant : on
 * retombe sur le libellé générique, exactement comme pour un type d'objet
 * qu'on ne sait pas encore nommer.
 */
async function libelleObjetSignable(
  objetType: string,
  objetId: string,
  etablissementId: string,
) {
  if (objetType === "rapport_verification") {
    const r = await prisma.rapportVerification.findFirst({
      where: { id: objetId, etablissementId },
      select: {
        fichierNomOriginal: true,
        dateRapport: true,
        verification: { select: { libelleObligation: true } },
      },
    });
    if (r) {
      return {
        titre: r.verification.libelleObligation,
        description: `Rapport du ${formaterDateFr(r.dateRapport)} — fichier « ${r.fichierNomOriginal} ».`,
      };
    }
  }
  return {
    titre: "Document à signer",
    description: "Référence interne : " + objetId,
  };
}
