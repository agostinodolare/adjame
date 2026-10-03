# Mon Djassaman

Marketplace qui référence les vendeurs d’Adjamé et organise la collecte puis la livraison des commandes à Abidjan et dans les zones desservies.

Chaque fiche produit peut contenir une photo principale et jusqu’à cinq photos supplémentaires.

## Développement

Prérequis : Node.js et npm.

```sh
npm install
npm run dev
```

## Configuration

Copiez `.env.example` vers `.env.local`, puis renseignez les variables Supabase adaptées à votre environnement. Ne publiez jamais de clé secrète côté navigateur.

`CRON_SECRET` et `CRON_SECRET_PREVIOUS` sont des variables serveur facultatives pour les points d’entrée planifiés qui utilisent l’authentification cron.

## Vérifications

```sh
npm run lint
npm run build
```
