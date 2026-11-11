# Historique des modifications

## 2.27.0 — 2026-11-11 — Espagnol, drapeaux de langue

**Type de changement : langue (aucune règle de clic modifiée, seuls des libellés sont reconnus en plus).**

- **Interface FR / EN / ES :** le sélecteur de langue en haut de la popup devient trois drapeaux (français, anglais, espagnol). Par défaut : la langue de Chrome (français, espagnol, sinon anglais).
- **Facebook en espagnol :** reconnaissance de la fenêtre des réactions (« Consulta quién ha reaccionado a esto », « Ver … personas que han reaccionado »), de l'onglet « Todo », du bouton « Invitar », des états « Invitado(a) », « Siguiendo », « Cerrar ». Même règle de sécurité : aucun clic tant que la fenêtre n'est pas reconnue.
- **Validé en conditions réelles sur Facebook en espagnol :** fenêtre des réactions reconnue, bouton « Invitar » cliqué, 8 invitations confirmées sur 8 clics.

## 2.26.0 — 2026-11-11 — Interface française / anglaise, pause « zone perdue » diagnostiquée

**Type de changement : interface et diagnostic (aucune règle de clic modifiée).**

- **Interface FR / EN :** sélecteur FR | EN en haut de la popup. La langue par défaut suit celle de Chrome (français si Chrome est en français, anglais sinon). Le choix s'applique à la popup et au panneau flottant sur Facebook. Les textes non traduits restent en français, sans rien bloquer. La traduction ne concerne que l'affichage : le moteur de détection est inchangé.
- **Validé en conditions réelles sur Facebook en anglais :** fenêtre des réactions reconnue, bouton « Invite » reconnu et cliqué, invitations confirmées (6 sur 6).
- **Pause « Zone de défilement des réactions perdue » :** l'extension attend désormais jusqu'à 4 secondes que Facebook remette la zone de défilement en place avant de se mettre en pause, et si la liste est entièrement visible (toutes les personnes annoncées ont été vues), elle conclut au lieu de s'arrêter. Dans tous les cas, un événement anonyme `scroll_lost` est ajouté au diagnostic pour comprendre ce qui se passe.
- **Rapport de diagnostic :** le champ `last_click` ne reprend plus le dernier clic d'une publication précédente.
- Conseil de prudence aligné sur 100 invitations par jour dans toute l'interface (popup, panneau, confirmations).

## 2.25.0 — 2026-11-11 — Sans mémorisation, diagnostic à toute épreuve, notice

**Type de changement : confidentialité, support, documentation (aucune règle de clic modifiée).**

- Plus aucune mémorisation des publications terminées : le stockage local n'est plus écrit, et une ancienne liste enregistrée par une version précédente est effacée au lancement. Retirés de la popup : la tuile « Anciennes publications revérifiées », le message « publications terminées mémorisées » et le bouton « Effacer l'historique local ». (L'historique ne servait qu'à compter des recontrôles, il ne faisait sauter aucune publication.)
- Rapport de diagnostic à toute épreuve : si la génération du rapport échoue côté page, un rapport partiel est renvoyé avec l'erreur ; si la page Facebook ne répond pas du tout, la popup copie un rapport minimal (dernier état connu, version, navigateur).
- Notice ajoutée au LISEZ-MOI : non-affiliation à Meta, risque de limitation de compte, objectif raisonnable de 100 invitations par jour, confidentialité, procédure de support.
- Phrase de la popup mise à jour (« zone calibrée » n'existe plus).

## 2.24.10.2 — 2026-11-11 — Le diagnostic est toujours copiable

**Type de changement : popup et diagnostic (aucune règle de clic modifiée).**

- Défaut corrigé : le bouton « Copier le diagnostic de la session » restait grisé quand le parcours se passait sans aucun échec (aucun événement à rapporter). Il est maintenant disponible dès qu'un onglet Facebook est ouvert.
- Le diagnostic contient maintenant un résumé de session : phase, publications finies, fenêtres ouvertes, clics, invitations confirmées, défilements, délai, plafond, version de Chrome, langue, taille de fenêtre et zoom. Utile pour le support.
- Résultat du test réel de la 2.24.10 (parcours arrêté à la main) : 19 publications terminées, 20 fenêtres ouvertes, 47 invitations confirmées, 0 indice non reconnu, 0 sans indice, 0 non ouverte.

## 2.24.10.1 — 2026-11-10 — Logo mis à jour

**Type de changement : visuel uniquement.**

- Logo remplacé par la nouvelle version retouchée par l'auteur (fichier pris tel quel comme source unique) : icônes 16, 32, 48 et 128 px, logo de la popup (144 px) et du panneau Facebook (96 px). Fichier de référence : docs/logo/tqidrlabs-logo-source-426.png (remplace le précédent).

## 2.24.10 — 2026-11-10 — Détection des réactions par la structure réelle de Facebook

**Type de changement : moteur (localisation du bouton de réactions et découverte des publications).**

Basé sur le diagnostic réel d'un parcours (publications zappées) qui a révélé la structure de la ligne de réactions :
`<span role="toolbar" aria-label="Voir qui a réagi">` contenant des `<div role="button" aria-label="Haha : 40 personnes">`.

- Le bouton à cliquer est désormais cet élément sémantique, sans position ni calibrage. Les barres de réactions des COMMENTAIRES (articles imbriqués) sont exclues. La détection par position (cause de deux échecs observés) est retirée du chemin de clic.
- Échec 1 corrigé : une « publication » détectée comme un bloc tronqué (statistiques + commentaires, 189 px) voyait sa ligne de réactions écartée car située dans ses 65 premiers pixels.
- Échec 2 corrigé : sur une publication de 1199 px, l'extension cliquait une icône de la barre de saisie de commentaire (aucune fenêtre ne s'ouvrait). Les icônes de la barre de saisie ne peuvent plus être choisies.
- Découverte des publications : toute barre « Voir qui a réagi » (hors commentaires) non couverte par une publication déjà trouvée en crée une.
- Testé sur réplique de la structure réelle : bloc complet, bloc tronqué, ligne en bas sans commentaires, publication en role=article, barre de saisie seule, barre sur un commentaire seul ; parcours complet « Toute la Page » sur 7 publications (42 invitations).
- NON vérifié sur le vrai Facebook. Les libellés français sont supposés (« Voir qui a réagi », « Haha : 40 personnes ») ; des variantes anglaises sont acceptées.

## 2.24.9.7 — 2026-11-10 — Relevé du fil dans le diagnostic

**Type de changement : diagnostic uniquement (aucune règle de clic modifiée).**

- À chaque défilement du fil, le diagnostic de session enregistre l'état des publications visibles : dimensions, nombre d'articles imbriqués (commentaires), retenue ou non par le parcours, bouton de réactions trouvé ou non, déjà vue ou non. Objectif : comprendre pourquoi certaines publications ne sont jamais examinées (le bilan n'en compte que quelques-unes alors que d'autres défilent). 14 relevés maximum par session, aucune donnée personnelle.
- Le délai d'attente d'ouverture reste à 6 s (2.24.9.6) ; il n'a pas changé le comportement observé : cette piste est écartée.

## 2.24.9.6 — 2026-11-10 — Diagnostic détaillé des publications zappées, attente d'ouverture rallongée

**Type de changement : diagnostic + un délai (moteur).**

- Le délai d'attente de la fenêtre des réactions après un clic passe de 1,5 s à 6 s. Le 1,5 s introduit en 2.24.2 était une cause plausible de publications zappées si Facebook affiche la fenêtre lentement (hypothèse non confirmée sur le vrai Facebook).
- Chaque publication non traitée (aucun bouton trouvé, ou fenêtre non ouverte) enregistre désormais un instantané ANONYMISÉ : géométrie de la publication et de la fenêtre d'affichage, candidats trouvés, description du clic (cible, position, élément réellement touché) et structure du bas de la publication. Seuls les mots d'interface connus et les nombres sont conservés, tout le reste devient « X ». Maximum 4 instantanés par session.
- Ces informations sont incluses dans « Copier le diagnostic de la session » (popup), sans console ni script.
- Testé : les noms, textes et auteurs d'une fausse publication n'apparaissent pas dans le diagnostic.

## 2.24.9.5 — 2026-11-10 — Correctif : le mode « Toute la Page » se lance sans calibrage

**Type de changement : correctif de lancement (moteur).**

- Défaut corrigé : la 2.24.9 retirait le calibrage de la popup, mais le moteur le réexigeait encore au démarrage du parcours (« Calibrage nécessaire », pause immédiate, rien ne se lançait). Cette exigence est supprimée ; une ancienne calibration éventuelle reste un simple indice.
- Messages restants qui parlaient de « Calibrer puis lancer » mis à jour.
- Nouveau test de bout en bout du mode « Toute la Page » sans aucun calibrage, sur une fausse Page : 4 puis 7 publications (lignes de réactions avec et sans commentaires, 1 ou 2 emojis) ; toutes ouvertes et traitées (6 invitations par publication).
- Cause du défaut non repéré avant : les tests précédents n'exerçaient pas le lancement du mode Page entière.

## 2.24.9.4 — 2026-11-10 — Logo retouché par l'auteur (fichier de référence)

**Type de changement : visuel uniquement.**

- Le logo est désormais le fichier retouché à la main par l'auteur (426 px, carré plein), pris tel quel comme SOURCE UNIQUE : toutes les icônes (16, 32, 48, 128), le logo de la popup (144) et celui du panneau Facebook (96) en sont des réductions directes, avec une netteté légère sur les petites tailles.
- Fichier de référence conservé dans docs/logo/tqidrlabs-logo-source-426.png. Les anciennes versions vectorielles redessinées ont été retirées : ne plus les utiliser.

## 2.24.9.3 — 2026-11-10 — Logo : traits épaissis, contour renforcé

**Type de changement : visuel uniquement.**

- Logo conservant la géométrie du logo d'origine : traits intérieurs modérément épaissis, contour extérieur (arêtes extérieures du polyèdre) beaucoup plus épais, ce qui garde une silhouette lisible dans la barre Chrome.
- Décalage de couleur turquoise de la charte, uniquement sur les grandes tailles (≥ 96 px).
- Sources vectorielles dans docs/logo/.

## 2.24.9.2 — 2026-11-10 — Logo redessiné d'après l'original

**Type de changement : visuel uniquement.**

- Le logo simplifié de la 2.24.9.1 est remplacé par une version vectorielle redessinée d'après le logo d'origine : mêmes sommets et mêmes lignes principales (polyèdre en fil fin), nœuds aux sommets, léger décalage de couleur aux teintes de la charte (turquoise) à la place de l'effet « glitch » rouge-vert-bleu.
- Trois niveaux de détail selon la taille : complet (≥ 144 px), allégé (96 et 128 px), contour et lignes maîtresses (16, 32, 48 px, traits épaissis).
- Sources vectorielles dans docs/logo/ (SVG et PNG 512).

## 2.24.9.1 — 2026-11-10 — Nouveau logo simplifié

**Type de changement : visuel uniquement (aucune règle de clic, de détection ni de délai modifiée).**

- Nouveau logo (traits blancs épais sur fond noir pur, marges régulières) dans la barre Chrome (icon16, icon32, icon48, icon128), la popup (tqidrlabs-logo.png) et le panneau flottant Facebook.
- Les petites tailles ont des traits épaissis pour rester lisibles ; le 16 px reste inévitablement très dense.
- Icône 32 px ajoutée (écrans à forte densité) et déclarée comme icône de l'action.

## 2.24.9 — 2026-11-10 — Détection automatique des réactions, plus de calibrage

**Type de changement : moteur et popup.**

- Le mode « Toute la Page » ne demande plus de calibrage : le bouton devient « Lancer les invitations sur la Page ». Le bouton de réactions est repéré automatiquement sur chaque publication, avec les mêmes contrôles de sûreté qu'avant (résumé de réactions reconnu, jamais le bouton « J'aime » personnel, jamais une icône de commentaire, de barre de saisie ou de palette).
- Une ancienne calibration, si elle existe, est essayée en premier puis la détection automatique prend le relais si elle ne trouve rien.
- Vérifié sur réplique : ligne avec/sans commentaires, 1 à 3 emojis, ligne + barre de saisie ; publication sans réaction mais avec emojis sur un commentaire : aucun bouton.
- NON vérifié sur le vrai Facebook. La fenêtre ouverte reste contrôlée par la signature réelle des onglets avant tout clic d'invitation.

## 2.24.8 — 2026-11-10 — Publications sans commentaires enfin détectées

**Type de changement : moteur (localisation du bouton de réactions de la publication).**

- Défaut corrigé : une publication dont la ligne de réactions est tout en bas de la carte (aucun commentaire dessous) était zappée, car l'ancienne marge de 22 px en bas de carte rejetait l'icône (≈19 px du bord). Observé sur le terrain : toutes les publications avec commentaires traitées, la plupart de celles sans commentaires zappées.
- Remplacé par un rejet ciblé des icônes de la barre « Commenter en tant que … » (emoji, photo, GIF, autocollant, champ de saisie), qui était la raison de cette marge.
- Reproduit et vérifié sur une réplique : avec commentaires, ligne en bas (1 à 3 emojis), ligne + barre de saisie : bouton trouvé ; barre de saisie seule, avec ou sans libellés : aucun bouton.
- NON vérifié sur le vrai Facebook. La 1re publication zappée (celle du calibrage) n'est pas expliquée par cette cause : à surveiller.

## 2.24.7 — 2026-11-10 — Catégorie de réaction unique sans onglet

**Type de changement : moteur (reconnaissance de fenêtre).**

- Une fenêtre à une seule catégorie de réaction, sans onglet « Toutes » ni onglet du tout, est maintenant traitée si son en-tête ne contient qu'un compteur et une icône (aucun titre en texte) et si la liste montre des avatars et des boutons « Inviter ». Une fenêtre avec titre en texte reste refusée.
- Le clic reste limité aux éléments dont le texte est exactement « Inviter », dans la fenêtre reconnue.
- NON vérifié sur le vrai Facebook (testé sur réplique supposée : fenêtre acceptée, variante avec titre refusée, fenêtre réelle à onglets inchangée).

## 2.24.6 — 2026-11-10 — Reconnaissance stricte de la fenêtre des réactions, fin de liste signalée

**Type de changement : moteur (reconnaissance de fenêtre et fin de liste). Écrit à partir de la structure réelle exportée de la fenêtre Facebook.**

- Défaut corrigé : une fenêtre étrangère contenant des boutons « Inviter » (ex. « Inviter des amis ») pouvait être acceptée à cause d'un onglet numérique ou d'une icône « J'aime » décorative. La fenêtre est désormais confirmée par la signature réelle des onglets (« Afficher les N personnes qui ont réagi avec … ») ou par l'en-tête à icônes nommées. Testé : fenêtre réelle reconnue, 3 variantes étrangères refusées (0 clic).
- Défaut corrigé : fin de liste silencieuse quand Facebook ne charge pas toutes les lignes. Le total annoncé par l'onglet « Toutes » est comparé aux personnes réellement vues ; si l'écart persiste, attente prolongée (~16 s) puis message explicite « X personne(s) vue(s) sur Y annoncée(s) » (aussi dans le bilan du mode Page entière).
- Limite connue : fenêtre à catégorie unique (sans onglet « Toutes ») non vérifiée sur la structure réelle ; elle est refusée par prudence si aucune signature forte n'est présente.

## 2.24.5 — 2026-11-10 — Panneau Facebook amélioré, popup auto-fermante

**Type de changement : affichage et messages (aucune règle de clic, de délai ni de détection modifiée).**

- Popup : se ferme automatiquement dès que le calibrage ou le parcours démarre, et à la reprise. Plus de risque d'interruption par un Échap ou un clic hors de la popup ; indication ajoutée sous les boutons de lancement.
- Panneau Facebook : logo TQIDr Labs embarqué (aucune ressource exposée), jetons de couleur communs avec la popup, étiquettes de 11 px, pastille « En cours » animée (désactivée si réduction du mouvement demandée).
- Indicateurs unifiés dans les deux modes : Confirmées / Clics envoyés (avec plafond) / À revoir (clics sans confirmation + publications non ouvertes). Barre de progression vers le plafond. Ligne de détail réservée au mode Page entière (fin du doublon).
- Panneau réductible (les boutons Pause/Arrêter restent accessibles) et déplaçable par l'en-tête.
- Messages de pause de sécurité reformulés : ce qui s'est passé + quoi faire ; le message technique d'origine reste affiché en petit. Le texte d'origine est conservé en interne pour les tests du moteur.

## 2.24.4 — 2026-11-10 — Correctif largeur de la popup

**Type de changement : mise en page uniquement (popup.css).**

- Cause : `max-width:100vw` et les règles `@media(max-width:…)` se basaient sur une fenêtre initiale minuscule de la popup Chrome, ce qui la rétrécissait (déjà le cas en 2.24.1 à 2.24.3).
- Largeur désormais fixe (760 px), indépendante du viewport ; plus de repli « une colonne » lié à la largeur.

## 2.24.3 — 2026-11-10 — Popup élargie

**Type de changement : mise en page uniquement (popup.html / popup.css).**

- Popup portée de 410 px à 760 px (Chrome limite à 800 px).
- Volets « Une publication » et « Toute la Page » côte à côte, à hauteur égale.
- Limite d'invitations à gauche, repère de calibrage et réglages avancés à droite ; statistiques sur quatre colonnes.
- Repli en une colonne sous 640 px de large. Aucun `id`, aucune logique ni aucun script modifié.

## 2.24.2 — 2026-11-10 — Audit de fiabilité

**Type de changement : fiabilité (aucune permission ni logique de clic ajoutée).**

- Ouverture des réactions : attente de la fenêtre portée de 100 ms à 1,5 s avant de mettre une publication de côté (l'ancien délai était inférieur à la latence réseau normale). Attente seule : aucun clic supplémentaire. Constante : `REACTION_NO_MODAL_WAIT_MS`.
- Confirmation d'une invitation : fenêtre d'observation de 1,8 s à environ 4 s, pour éviter les pauses de sécurité sur connexion lente.
- Fin de liste des réactions : la liste n'est plus déclarée terminée tant que sa hauteur augmente encore (chargement progressif).
- Documentation alignée : délai, version, périmètre du stockage local (identifiants de Page et références hachées de publications, sans noms de personnes ; hachage non cryptographique) et limite de la « confirmation visuelle ».
- Message d'erreur et expression régulière associés rendus indépendants de la valeur du délai.

## 2.24.1 — 2026-11-10 — Design TQIDr Labs

**Type de changement : identité visuelle / interface.**

- Nouveau logo et icônes TQIDr Labs (RGB discret).
- Popup Chrome : en-tête sombre, surfaces blanches, cartes lisibles, états, informations et actions harmonisés avec les applications TQIDr.
- Panneau Facebook : palette sombre, résumé des trois chiffres-clés, état de session, boutons et diagnostic complet maintenus.
- Champs, focus clavier, couleurs d'avertissement, contrôle des débordements et préférences de réduction du mouvement.
- Aucune modification volontaire des appels, quotas, règles de détection, envois, temporisations et protections Facebook.

## 2.24.0 — base utilisateur

Version fonctionnelle reçue, utilisée comme source de référence. L'historique antérieur figure dans `LISEZ-MOI.txt`.
