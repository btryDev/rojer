import path from "node:path";
import Link from "next/link";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { BlocConfig } from "@/components/mcp/BlocConfig";
import { WhyCard } from "@/components/ui-kit";
import { requireEtablissement } from "@/lib/auth/scope";
import { DETAIL_OUTIL_PRODUIT } from "@/components/mcp/outils-produit";
import { OUTILS_MCP } from "@/lib/mcp/tools";

export const metadata = {
  title: "Connecter — Consulter votre dossier depuis un assistant",
};

/**
 * Les outils que le serveur enregistre (`OUTILS_MCP`), décrits côté produit.
 * La liste et son nombre viennent du serveur : recopiés à la main, ils
 * avaient divergé (« Cinq outils » au-dessus de trois lignes).
 */
const OUTILS = OUTILS_MCP.map((o) => ({
  nom: o.nom,
  titre: o.titre,
  detail: DETAIL_OUTIL_PRODUIT[o.nom],
}));

const NOMBRE_EN_LETTRES = ["Aucun", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];

export default async function ConnecterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);

  // Chemins absolus : Claude Desktop est une application graphique, elle
  // n'hérite pas du PATH du terminal. « pnpm » ou « npx » y sont souvent
  // introuvables — on désigne donc directement l'exécutable.
  const racine = process.cwd();
  const executable = path.join(racine, "node_modules", ".bin", "tsx");
  const serveur = path.join(racine, "scripts", "mcp-server.ts");

  // Désigner l'exécutable ne suffit pas : le lanceur `tsx` est un script
  // shell qui termine par `exec node`. Sous nvm, node vit dans un répertoire
  // versionné qu'une application graphique n'a pas dans son PATH, et le
  // serveur meurt sur « node: not found » avant d'avoir dit un mot. On
  // publie donc le répertoire du node qui fait tourner cette page, qui est
  // par construction celui qui sait exécuter le projet.
  const dossierNode = path.dirname(process.execPath);
  const cheminGraphique = [
    dossierNode,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ].join(":");

  const configDesktop = JSON.stringify(
    {
      mcpServers: {
        rojer: {
          command: executable,
          args: [serveur],
          env: { MCP_ETABLISSEMENT_ID: id, PATH: cheminGraphique },
        },
      },
    },
    null,
    2,
  );

  const commandeCode = `claude mcp add rojer \\
  -e MCP_ETABLISSEMENT_ID=${id} \\
  -- ${executable} ${serveur}`;

  return (
    <>
      <AppTopbar
        title="Connecter"
        subtitle="Consulter ce dossier depuis un assistant, en lecture seule."
        crumbs={[
          { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
          { label: "Connecter" },
        ]}
      />

      <main className="flex flex-1 flex-col gap-7 bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-20">
        {/* HERO */}
        <section className="carte-board px-7 py-8 sm:px-8">
          {/* Le filet d'impulsion navy du papier n'a pas d'équivalent : le
              board n'accentue pas une carte par une bande, il l'accentue par
              son encre. */}
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Expérimental · local
          </p>
          {/* Le titre de page est celui de la barre haute : ici, un titre de
              carte. Deux `h1` sur un même écran ne se hiérarchisent pas. */}
          <h2 className="board-titre m-0 mt-2.5 max-w-[24ch] text-[22px]">
            Poser vos questions à un assistant, sur vos propres données
          </h2>
          <p className="m-0 mt-4 max-w-[68ch] text-[14.5px] leading-[1.55] text-[color:var(--board-ink)]">
            Vous pouvez ouvrir une fenêtre de lecture sur ce dossier depuis un
            assistant comme Claude, et lui demander « où en est mon DUERP ? » ou
            « quelles actions sont en retard ? » sans naviguer dans
            l&apos;application. L&apos;assistant lit, il n&apos;écrit jamais.
          </p>
          <p className="m-0 mt-3.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Le programme tourne <strong>sur votre machine</strong>{" "}
            et n&apos;est
            accessible qu&apos;à l&apos;application qui le lance : rien
            n&apos;est publié sur internet, il n&apos;y a ni adresse ni port à
            ouvrir.
          </p>
        </section>

        {/* CE QUI SORT — la question à se poser avant de brancher */}
        <WhyCard
          charte="board"
          kicker="À savoir avant de brancher"
          titre="Ce que l'assistant lit sort de Rojer."
          enjeu="Les informations renvoyées par les outils sont envoyées à l'assistant que vous utilisez, et suivent alors ses propres règles de traitement et de conservation — pas celles de Rojer."
          tonalite="alerte"
        >
          <p className="m-0">
            C&apos;est votre décision, dossier par dossier : vous choisissez
            quel établissement est exposé, et vous pouvez retirer la connexion à
            tout moment en supprimant la configuration de votre assistant. Tant
            que vous ne branchez rien, rien ne sort.
          </p>
          <p className="m-0 mt-3">
            Cette page ne change rien au fonctionnement de Rojer :{" "}
            <strong>
              aucun contenu de votre dossier n&apos;est traité, reformulé ou
              classé par une IA
            </strong>{" "}
            dans l&apos;application. Vos documents restent produits par des
            règles déterministes, à partir de vos saisies. Ce qui est proposé
            ici est un accès en lecture depuis un outil extérieur, pas une
            fonctionnalité d&apos;analyse.
          </p>
        </WhyCard>

        {/* CE QUI EST LISIBLE */}
        <section>
          <header className="mb-4">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Périmètre
            </p>
            <h2 className="board-titre m-0 mt-1.5 text-[22px]">
              Ce que l&apos;assistant peut lire
            </h2>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {NOMBRE_EN_LETTRES[OUTILS.length] ?? OUTILS.length} outils, tous en lecture seule, tous limités à{" "}
              <strong>{etablissement.raisonDisplay}</strong>. L&apos;assistant
              ne peut ni modifier une donnée, ni consulter un autre
              établissement — l&apos;identifiant est fixé au lancement, il
              n&apos;est pas négociable depuis la conversation.
            </p>
          </header>

          <ol className="carte-board m-0 list-none p-0">
            {OUTILS.map((outil, idx) => (
              /* Le filet appartient à la ligne : posé sur son contenu, le
                 `first:` aurait désigné chaque première boîte de chaque
                 ligne et effacé tous les séparateurs. */
              <li
                key={outil.nom}
                className="flex items-start gap-5 border-t border-[color:var(--board-slate-line)] px-7 py-5 first:border-t-0 sm:px-8"
              >
                <span className="shrink-0 font-mono text-[17px] tabular-nums text-[color:var(--board-slate-soft)]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {outil.titre}
                    </h3>
                    <span className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      {outil.nom}
                    </span>
                  </div>
                  <p className="m-0 mt-1.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    {outil.detail}
                  </p>
                </div>
                {/* Le glacier, pas le vert : « lecture » dit un mode d'accès,
                    et le vert du board dit « fait ». */}
                <span
                  aria-hidden
                  className="pastille-board shrink-0 bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                >
                  lecture
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* MISE EN PLACE */}
        <section>
          <header className="mb-4">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Mise en place
            </p>
            <h2 className="board-titre m-0 mt-1.5 text-[22px]">
              Brancher l&apos;assistant
            </h2>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Les chemins ci-dessous sont ceux de cette installation, et
              l&apos;identifiant est déjà celui de {etablissement.raisonDisplay}{" "}
              : il n&apos;y a rien à remplacer.
            </p>
          </header>

          <div className="carte-board flex flex-col gap-7 px-7 py-6 sm:px-8">
            <div>
              <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                Claude Desktop
              </h3>
              <p className="m-0 mt-1.5 mb-3.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Réglages → Développeur → Modifier la configuration. Collez ce
                bloc dans{" "}
                <code className="font-mono">claude_desktop_config.json</code>,
                puis relancez l&apos;application. Si le fichier contient déjà un
                objet <code className="font-mono">mcpServers</code>, ajoutez-y
                seulement l&apos;entrée <code className="font-mono">rojer</code>
                .
              </p>
              <BlocConfig
                titre="claude_desktop_config.json"
                contenu={configDesktop}
              />
            </div>

            <div>
              <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                Claude Code
              </h3>
              <p className="m-0 mt-1.5 mb-3.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Une commande à lancer dans un terminal.
              </p>
              <BlocConfig
                titre="Terminal"
                langue="shell"
                contenu={commandeCode}
              />
            </div>

            <p className="m-0 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Pour vérifier que tout fonctionne, demandez à l&apos;assistant :
              «&nbsp;quel établissement suis-tu&nbsp;?&nbsp;». Il doit répondre{" "}
              {etablissement.raisonDisplay}. Pour couper la connexion, supprimez
              l&apos;entrée de la configuration et relancez l&apos;assistant.
            </p>
          </div>
        </section>

        <footer className="border-t border-[color:var(--board-slate-line)] pt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          Accès en lecture seule · les données lues quittent Rojer.{" "}
          <Link
            href={`/etablissements/${id}/guide`}
            className="text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
          >
            Consulter le guide →
          </Link>
        </footer>
      </main>
    </>
  );
}
