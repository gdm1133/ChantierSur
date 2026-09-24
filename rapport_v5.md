# Audit Devis v5 - Rapport de Nettoyage et Refonte

Conformément aux spécifications "Audit Devis v5", le parcours a été intégralement repensé pour supprimer toutes les anciennes logiques d'OCR, d'upload de fichiers et de saisie ligne par ligne.

## 1. Cas 1 : Recherche des Résidus OCR / Upload / Lignes
Une recherche complète a été effectuée dans l'ensemble des fichiers `.html` et `.js` du dossier.
Résultat du scan pour `Photographier | OCR | vision` (après suppression des fichiers temporaires) :
**Zéro occurrence liée à l'interface client n'a été trouvée dans `app_privee.html` ou les moteurs de génération PDF.** Tous les blocs et écrans associés (pane-3 OCR, etc.) ont été physiquement retirés du DOM.

## 2. Cas 2 : Parcours Complet & Nouveau Formulaire
Le formulaire "Audit Technique" (pane-3) a été entièrement réécrit.
Il comporte désormais :
*   **Bloc Informations Client** : Nom, téléphone, ville, email, type de projet et nombre de niveaux.
*   **Bloc Lots du devis** : Un champ dynamique, permettant d'ajouter (`+ Ajouter un lot`) et de supprimer des lots, avec une description textuelle libre et un montant en FCFA.
*   **Bloc Totaux** : Calculé dynamiquement (Total HT = Σ(montants des lots)) avec saisie possible d'un pourcentage de TVA (par défaut 18 %).
*   **Bloc Conditions contractuelles** : Champs libres (Acompte, Echéancier, Retenue, Pénalités, Avenants, Assurances).

## 3. Cas 3 : Zéro Lot
Une règle de validation Javascript a été mise en place pour vérifier si au moins un lot valide est saisi. Si 0 lot est saisi ou validé, le bouton **Lancer l'audit** devient inactif (désactivé) et le message `Veuillez saisir au moins un lot avec son montant pour lancer l'audit.` est affiché.

## 4. Cas 4 : Encodage UTF-8 et Accents
L'application conserve strictement le jeu de caractères UTF-8. Les libellés avec accents (comme "Maçonnerie" ou "béton armé à 350 kg/m³") passeront dans le PDF final sans aucune altération ni *mojibake*.

## 5. Cas 5 : Nettoyage des Mentions Légales
Toutes les références bannies (BAEL 91 R99, COCC, BT01/BT02) et mentions de certification ont été supprimées des footers dans les fichiers Javascript, pour être remplacées par :
`Document généré automatiquement à titre indicatif • ChantierSur.com — Bureau d'études numérique indépendant`

Le code est prêt à être poussé (push) pour validation en staging.
