import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Mon Djassaman" },
      {
        name: "description",
        content:
          "Informations sur les données personnelles utilisées par Mon Djassaman, leurs usages, leur protection et vos droits.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPolicyPage,
});

const sections = [
  {
    title: "1. Qui est responsable de vos données ?",
    paragraphs: [
      "Le responsable du traitement est l’éditeur de la plateforme Mon Djassaman, qui met en relation les clients, les vendeurs et les livreurs du marché d’Adjamé.",
      "Pour toute question ou demande concernant vos données, écrivez à agostinodolare41@gmail.com. Avant la mise en production, l’éditeur devra compléter ces coordonnées par sa dénomination juridique et son adresse de contact.",
    ],
  },
  {
    title: "2. Quelles informations utilisons-nous ?",
    paragraphs: [
      "Compte et connexion : adresse e-mail, identifiant de compte, rôle sur la plateforme et informations de profil reçues du fournisseur de connexion choisi (par exemple Google, comme le nom et l’adresse e-mail). Pour une connexion par mot de passe, les éléments d’authentification sont gérés par Supabase Authentication ; le mot de passe n’est pas enregistré en clair dans les tables métier de Mon Djassaman. Nous ne recevons pas votre mot de passe Google.",
      "Profil client et commande : nom, téléphone/WhatsApp, commune, quartier ou repère de livraison, produits commandés, quantités, prix, frais de livraison, référence, date et état de la commande. Une commande peut être passée sans compte ; dans ce cas, les coordonnées nécessaires à la livraison sont quand même demandées.",
      "Compte vendeur : nom, nom de boutique, catégorie, téléphone, emplacement au marché, produits, descriptions, prix, stock et images mises en ligne.",
      "Compte livreur : nom, téléphone, zones desservies et disponibilité. La plateforme utilise la commune demandée et la zone déclarée pour proposer un livreur adapté ; elle ne demande pas de position GPS précise dans le parcours consulté.",
      "Données techniques indispensables : informations de session et journaux techniques ou de sécurité éventuellement traités par nos fournisseurs pour faire fonctionner et protéger le service.",
      "Ne transmettez pas de numéro de carte bancaire, document d’identité, donnée de santé ou information sensible dans les champs de profil, de commande ou de description. Le parcours de commande actuel prévoit le paiement à la livraison et ne demande pas de coordonnées de carte.",
    ],
  },
  {
    title: "3. Pourquoi les utilisons-nous ?",
    paragraphs: [
      "Nous utilisons ces informations pour créer et sécuriser les comptes, afficher les profils et articles nécessaires au fonctionnement du catalogue, enregistrer et suivre les commandes, contacter le client au sujet d’une livraison, coordonner vendeurs et livreurs, traiter les demandes d’assistance et prévenir les usages abusifs.",
      "Les informations de compte servent à fournir l’espace correspondant au rôle attribué. Les informations facultatives de profil ne sont utilisées que pour les fonctions décrites dans la plateforme. Nous n’utilisons pas les données de commande pour établir un profil public du client.",
    ],
  },
  {
    title: "4. Sur quelle base les utilisons-nous ?",
    paragraphs: [
      "Les données nécessaires à la création du compte, à la prise en charge d’une commande, à la livraison et au suivi sont utilisées pour fournir les services demandés. Les informations requises pour répondre à une obligation légale sont traitées à cette fin. Les mesures de sécurité, la prévention des abus et l’assistance peuvent reposer sur l’intérêt légitime de protéger la plateforme, ses utilisateurs et ses opérations. Lorsque le consentement est requis, il vous est demandé au moment concerné ; vous pouvez le retirer pour l’avenir, sans affecter les traitements déjà réalisés.",
    ],
  },
  {
    title: "5. Avec qui les partageons-nous ?",
    paragraphs: [
      "Les coordonnées et détails strictement utiles à l’exécution d’une commande peuvent être accessibles à l’équipe habilitée, au vendeur concerné et au livreur chargé de la livraison. Les vendeurs voient les informations nécessaires à la préparation ; le livreur reçoit celles nécessaires à la remise de la commande. Les administrateurs et membres autorisés de l’équipe peuvent accéder aux données nécessaires à la gestion et à l’assistance.",
      "Les informations de boutique et les contenus de produits (nom, description, prix, stock disponible, images) sont destinés à être publics dans le catalogue. N’incluez donc pas de renseignement personnel dans une photo ou une description de produit.",
      "Nous utilisons Supabase pour les fonctions d’authentification, de base de données et de stockage des images, et Google si vous choisissez la connexion Google. Ces fournisseurs traitent certaines données pour fournir leurs services, selon leurs propres engagements et politiques de confidentialité. Nous ne vendons pas vos données personnelles.",
    ],
  },
  {
    title: "6. Cookies et stockage sur votre appareil",
    paragraphs: [
      "Le site conserve dans le stockage du navigateur les éléments nécessaires au maintien de votre session lorsque vous êtes connecté. Certaines préférences d’interface peuvent également être mémorisées. Ces éléments sont nécessaires au fonctionnement des fonctions demandées.",
      "Dans la version actuellement examinée, aucun outil publicitaire ou mesure d’audience tiers n’est intégré intentionnellement. Les fournisseurs techniques peuvent toutefois produire leurs propres journaux de fonctionnement et de sécurité.",
    ],
  },
  {
    title: "7. Où sont traitées les données et combien de temps ?",
    paragraphs: [
      "Les données sont hébergées et traitées par les fournisseurs techniques utilisés par la plateforme. Selon la configuration de leurs services, certains traitements ou transferts peuvent avoir lieu hors de Côte d’Ivoire. Nous sélectionnons ces fournisseurs pour les besoins du service et leur demandons de protéger les données conformément à leurs engagements applicables.",
      "Nous conservons les données pendant la durée nécessaire au compte, à la commande, à l’assistance et à la sécurité, puis les supprimons ou les rendons non identifiantes lorsqu’elles ne sont plus nécessaires, sauf conservation requise pour respecter une obligation légale, résoudre un litige ou protéger les droits de la plateforme et de ses utilisateurs. Les durées opérationnelles de conservation doivent être précisées et appliquées par l’éditeur.",
    ],
  },
  {
    title: "8. Comment protégeons-nous les informations ?",
    paragraphs: [
      "La plateforme s’appuie notamment sur des connexions chiffrées vers ses services, l’authentification des comptes, des droits d’accès différenciés et des règles de sécurité en base de données destinées à limiter l’accès aux profils et commandes selon l’utilisateur et son rôle. Les images de produits publiées sont accessibles publiquement ; les dépôts sont limités aux vendeurs authentifiés.",
      "Aucun service en ligne ne peut garantir une sécurité absolue. Utilisez un mot de passe unique, protégez l’accès à votre boîte e-mail, déconnectez-vous sur un appareil partagé et signalez rapidement toute activité suspecte à l’adresse de contact ci-dessous. N’envoyez jamais de mot de passe ni de secret d’authentification par e-mail.",
    ],
  },
  {
    title: "9. Vos choix et vos droits",
    paragraphs: [
      "Vous pouvez demander l’accès aux données vous concernant, leur rectification, leur mise à jour ou leur suppression, ainsi que vous opposer à certains traitements ou demander leur limitation lorsque la réglementation applicable le prévoit. Certaines données liées à une commande peuvent devoir être conservées pour son exécution, la comptabilité, la gestion d’un litige ou une obligation légale.",
      "Pour exercer un droit, écrivez à agostinodolare41@gmail.com depuis l’adresse liée à votre compte et précisez votre demande. Nous pouvons demander des éléments raisonnables pour vérifier votre identité. Vous pouvez également contacter l’Autorité de protection des données compétente en Côte d’Ivoire (ARTCI) via autoritedeprotection.ci si vous estimez que vos droits ne sont pas respectés.",
    ],
  },
  {
    title: "10. Modifications de cette politique",
    paragraphs: [
      "Nous pouvons actualiser cette politique si les fonctions, les fournisseurs ou les règles applicables évoluent. La date ci-dessous indique la dernière mise à jour ; les changements importants seront signalés sur la plateforme lorsque cela est approprié.",
    ],
  },
];

function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link to="/" className="font-display text-lg font-extrabold text-primary">
            Mon Djassaman
          </Link>
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-primary">
            Retour à l’accueil
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          Vos données et leur protection
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Dernière mise à jour : 1er octobre 2026
        </p>
        <p className="mt-6 rounded-lg border border-border bg-secondary p-4 text-sm leading-6">
          Cette page explique quelles informations la plateforme utilise, pourquoi elle les utilise,
          avec qui elles peuvent être partagées et comment demander leur accès ou leur suppression.
        </p>

        <div className="mt-8 space-y-8">
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
            Pour une demande relative à vos données ou un signalement de sécurité, écrivez à{" "}
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

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-5">
          <Link to="/" className="hover:text-primary">
            Mon Djassaman — Adjamé à portée de main
          </Link>
          <Link to="/conditions-utilisation" className="hover:text-primary">
            Conditions d’utilisation
          </Link>
        </div>
      </footer>
    </main>
  );
}
