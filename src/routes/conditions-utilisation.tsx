import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/conditions-utilisation")({
  head: () => ({
    meta: [
      { title: "Conditions d’utilisation — Mon Djassaman" },
      {
        name: "description",
        content:
          "Règles d’utilisation de Mon Djassaman pour les clients, vendeurs et livreurs de la marketplace.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "1. Objet et acceptation",
    paragraphs: [
      "Les présentes conditions encadrent l’accès et l’utilisation de Mon Djassaman, une plateforme qui met en relation des clients, des vendeurs du marché d’Adjamé et des livreurs. En créant un compte ou en utilisant les fonctions de la plateforme, vous acceptez ces conditions ainsi que notre politique de confidentialité.",
      "Mon Djassaman s’adresse aux personnes âgées d’au moins 18 ans. En créant un compte, vous confirmez remplir cette condition.",
    ],
  },
  {
    title: "2. Rôle de la plateforme",
    paragraphs: [
      "Mon Djassaman référence des produits proposés par des vendeurs indépendants et facilite la transmission des demandes de commande et l’organisation de la livraison. Sauf indication contraire, la plateforme n’est ni le fabricant ni le vendeur des produits et n’en détient pas le stock.",
      "Les produits, prix et stocks sont communiqués par les vendeurs. Leur disponibilité doit être confirmée avant la préparation de la commande. Une demande envoyée par le client ne vaut donc pas confirmation définitive de disponibilité ou de vente.",
    ],
  },
  {
    title: "3. Comptes et sécurité",
    paragraphs: [
      "Les informations fournies lors de l’inscription doivent être exactes et à jour. Chaque utilisateur est responsable de la confidentialité de ses identifiants et des actions réalisées depuis son compte. Signalez rapidement toute utilisation non autorisée à l’adresse de contact indiquée ci-dessous.",
      "Les comptes vendeurs et livreurs doivent être utilisés uniquement pour les activités correspondant à leur profil. Mon Djassaman peut demander des informations complémentaires ou suspendre temporairement un compte lorsqu’une vérification est nécessaire pour protéger les utilisateurs ou la plateforme.",
    ],
  },
  {
    title: "4. Commandes, prix et paiements",
    paragraphs: [
      "Le client sélectionne les produits et renseigne les coordonnées nécessaires à la livraison. Le vendeur confirme ensuite la disponibilité et les modalités de préparation. Les prix et frais affichés sont ceux communiqués par le vendeur ou calculés par la plateforme selon les informations disponibles au moment de la demande.",
      "Le paiement s’effectue selon les modalités confirmées pour la commande, notamment à la livraison ou par Mobile Money lorsque cette option est proposée. Ne communiquez jamais votre code PIN Mobile Money ni un mot de passe dans la plateforme ou à un interlocuteur non vérifié.",
      "En cas d’erreur de prix, de stock ou de commande, contactez l’assistance avant le règlement. Les demandes d’annulation, de retour ou de remboursement sont examinées au cas par cas selon l’état de la commande et les règles applicables; la plateforme ne garantit pas l’acceptation automatique d’une demande.",
    ],
  },
  {
    title: "5. Engagements des vendeurs",
    paragraphs: [
      "Le vendeur est responsable de l’exactitude de ses descriptions, images, prix, informations de stock et délais annoncés. Il doit proposer des articles licites, préparer les commandes qu’il a confirmées et informer rapidement le client ou l’équipe en cas d’indisponibilité ou de changement.",
      "Le vendeur ne doit pas publier de contenu trompeur, illicite, portant atteinte aux droits d’autrui ou contenant des données personnelles qui ne sont pas nécessaires à la présentation du produit.",
    ],
  },
  {
    title: "6. Engagements des livreurs",
    paragraphs: [
      "Le livreur accepte uniquement les courses qu’il peut effectuer, protège les articles confiés et utilise les coordonnées du client uniquement pour réaliser la livraison. Il doit signaler sans délai les retards, incidents, dommages ou impossibilités de remise.",
      "Les délais peuvent varier selon la disponibilité du vendeur, la circulation, la météo et la zone desservie. Une estimation communiquée ne constitue pas une garantie d’heure exacte.",
    ],
  },
  {
    title: "7. Comportements interdits et avis",
    paragraphs: [
      "Il est interdit d’utiliser la plateforme pour une activité illégale, de contourner les contrôles, de perturber le service, d’usurper l’identité d’un tiers ou de tenter d’accéder aux comptes et données d’autres utilisateurs.",
      "Les évaluations doivent refléter une expérience réelle et rester respectueuses. Mon Djassaman peut retirer un contenu manifestement abusif, frauduleux, illégal ou sans rapport avec le service, et limiter l’accès en cas de manquements répétés.",
    ],
  },
  {
    title: "8. Disponibilité et responsabilité",
    paragraphs: [
      "Mon Djassaman s’efforce de maintenir la plateforme disponible et de corriger les dysfonctionnements, sans garantir un accès ininterrompu ni l’absence d’erreurs. Des opérations de maintenance, incidents réseau ou défaillances de fournisseurs peuvent rendre certaines fonctions temporairement indisponibles.",
      "Chaque vendeur demeure responsable des produits qu’il propose et chaque livreur de l’exécution de sa course. Dans les limites prévues par les règles applicables, Mon Djassaman ne peut garantir les actes ou omissions indépendants de la plateforme; cela ne limite pas les droits qui ne peuvent être exclus par la loi.",
    ],
  },
  {
    title: "9. Données personnelles et propriété intellectuelle",
    paragraphs: [
      "Le traitement des données personnelles est décrit dans la politique de confidentialité. Les contenus et marques de la plateforme appartiennent à leurs titulaires respectifs. Les vendeurs conservent leurs droits sur leurs contenus et autorisent leur affichage sur Mon Djassaman dans la mesure nécessaire à la présentation et à la promotion de leurs offres.",
    ],
  },
  {
    title: "10. Modification et contact",
    paragraphs: [
      "Ces conditions peuvent être mises à jour pour refléter l’évolution du service ou des obligations applicables. La version publiée sur cette page est celle qui s’applique à compter de sa mise en ligne; les changements importants seront signalés aux utilisateurs lorsque cela est approprié.",
      "Pour toute question ou réclamation, écrivez à agostinodolare41@gmail.com. L’éditeur devra compléter ses coordonnées juridiques et son adresse de contact avant la mise en production.",
    ],
  },
];

function TermsPage() {
  return (
    <main className="min-h-screen bg-secondary px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg font-extrabold text-primary">
            Mon Djassaman
          </Link>
          <div className="flex gap-4 text-sm font-semibold">
            <Link to="/" className="text-muted-foreground hover:text-primary">
              Retour à l’accueil
            </Link>
            <Link to="/confidentialite" className="text-muted-foreground hover:text-primary">
              Confidentialité
            </Link>
          </div>
        </header>

        <article className="rounded-xl border border-border bg-background p-6 shadow-soft sm:p-10">
          <p className="text-sm font-bold uppercase tracking-wide text-accent">Mon Djassaman</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            Conditions d’utilisation
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dernière mise à jour : 1er octobre 2026
          </p>
          <div className="mt-8 space-y-7">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="font-display text-xl font-bold">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <div className="mt-10 rounded-lg border border-border p-5">
            <h2 className="font-display text-lg font-bold">Nous contacter</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pour toute question au sujet de ces conditions, écrivez à{" "}
              <a
                className="font-semibold text-primary underline underline-offset-4"
                href="mailto:agostinodolare41@gmail.com"
              >
                agostinodolare41@gmail.com
              </a>
              .
            </p>
          </div>
        </article>

        <footer className="py-6 text-center text-sm text-muted-foreground">
          <Link to="/confidentialite" className="hover:text-primary">
            Consulter la politique de confidentialité
          </Link>
        </footer>
      </div>
    </main>
  );
}
