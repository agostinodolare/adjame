export const requestedCategories = [
  "Supermarché",
  "Maison & Bureau",
  "Téléphonie & Tablettes",
  "Electronique",
  "Beauté & Hygiène",
  "Produits pour bébés",
  "Agriculture & Élevage",
  "Informatique",
  "Mode Femme",
  "Mode Homme",
  "Jeux vidéos & Consoles",
  "Articles de sport",
  "Jeux & Jouets",
  "Voiture",
] as const;

export type CategoryMenuSection = {
  title: string;
  items: string[];
};

export const categorySubcategories: Record<string, CategoryMenuSection[]> = {
  Supermarché: [
    { title: "Alimentation", items: ["Épicerie", "Riz & céréales", "Boissons", "Conserves"] },
    { title: "Maison", items: ["Produits d’entretien", "Cuisine", "Rangement"] },
    { title: "À découvrir", items: ["Produits locaux", "Promotions", "Nouveautés"] },
  ],
  "Maison & Bureau": [
    { title: "Maison", items: ["Meubles", "Literie", "Décoration", "Rangement"] },
    { title: "Cuisine", items: ["Ustensiles", "Vaisselle", "Petit équipement"] },
    { title: "Bureau", items: ["Mobilier de bureau", "Fournitures", "Éclairage"] },
  ],
  "Téléphonie & Tablettes": [
    { title: "Appareils", items: ["Smartphones", "Téléphones simples", "Tablettes"] },
    { title: "Accessoires", items: ["Coques & protections", "Chargeurs", "Écouteurs"] },
    { title: "Réseau", items: ["Routeurs", "Modems", "Objets connectés"] },
  ],
  Electronique: [
    { title: "Image", items: ["Téléviseurs", "Projecteurs", "Appareils photo"] },
    { title: "Son", items: ["Écouteurs", "Enceintes", "Systèmes audio"] },
    { title: "Équipement", items: ["Électroménager", "Accessoires électroniques"] },
  ],
  "Beauté & Hygiène": [
    { title: "Beauté", items: ["Maquillage", "Soins du visage", "Soins du corps"] },
    { title: "Cheveux", items: ["Perruques & mèches", "Soins capillaires", "Coiffure"] },
    { title: "Hygiène", items: ["Parfums", "Hygiène corporelle", "Hygiène intime"] },
  ],
  "Produits pour bébés": [
    { title: "Bébé", items: ["Couches", "Alimentation bébé", "Soins bébé"] },
    { title: "Vêtements", items: ["Vêtements bébé", "Chaussures bébé", "Accessoires"] },
    { title: "Éveil", items: ["Poussettes", "Puériculture", "Jouets d’éveil"] },
  ],
  "Agriculture & Élevage": [
    { title: "Agriculture", items: ["Semences", "Outils agricoles", "Engrais"] },
    { title: "Élevage", items: ["Aliments pour animaux", "Matériel d’élevage", "Soins animaux"] },
    { title: "Équipement", items: ["Irrigation", "Protection", "Petits équipements"] },
  ],
  Informatique: [
    { title: "Ordinateurs", items: ["Ordinateurs portables", "Ordinateurs de bureau", "Écrans"] },
    { title: "Périphériques", items: ["Claviers & souris", "Imprimantes", "Stockage"] },
    { title: "Accessoires", items: ["Composants", "Réseaux", "Logiciels"] },
  ],
  "Mode Femme": [
    { title: "Vêtements", items: ["Robes", "Hauts", "Pantalons & jupes"] },
    { title: "Chaussures", items: ["Sandales", "Talons", "Baskets"] },
    { title: "Accessoires", items: ["Sacs", "Bijoux", "Montres"] },
  ],
  "Mode Homme": [
    { title: "Vêtements", items: ["Chemises", "T-shirts", "Pantalons"] },
    { title: "Chaussures", items: ["Chaussures habillées", "Sandales", "Baskets"] },
    { title: "Accessoires", items: ["Sacs", "Ceintures", "Montres"] },
  ],
  "Jeux vidéos & Consoles": [
    { title: "Consoles", items: ["PlayStation", "Xbox", "Nintendo"] },
    { title: "Jeux", items: ["Jeux PS", "Jeux Xbox", "Jeux Nintendo"] },
    { title: "Accessoires", items: ["Manettes", "Casques gaming", "Accessoires console"] },
  ],
  "Articles de sport": [
    { title: "Équipement", items: ["Fitness", "Musculation", "Accessoires d’entraînement"] },
    { title: "Sports", items: ["Football", "Basketball", "Cyclisme"] },
    { title: "Tenues", items: ["Vêtements de sport", "Chaussures de sport", "Sacs de sport"] },
  ],
  "Jeux & Jouets": [
    { title: "Jouets", items: ["Jeux d’éveil", "Poupées", "Figurines"] },
    { title: "Jeux", items: ["Jeux de société", "Puzzles", "Jeux éducatifs"] },
    { title: "Activités", items: ["Jeux d’extérieur", "Vélos enfant", "Loisirs créatifs"] },
  ],
  Voiture: [
    {
      title: "Accessoires auto",
      items: ["Équipement intérieur", "Équipement extérieur", "Audio auto"],
    },
    { title: "Entretien", items: ["Nettoyage", "Huiles & entretien", "Outillage"] },
    { title: "Équipements", items: ["Pneus & roues", "Éclairage", "Sécurité auto"] },
  ],
  "Autres catégories": [
    { title: "Mode", items: ["Femme", "Homme", "Enfant", "Chaussures"] },
    { title: "À compléter", items: ["Accessoires", "Téléphones", "Divers"] },
  ],
};
