/* TQIDr Labs Reaction Inviter — traduction FR/EN de l'interface (affichage uniquement).
 * Aucune logique de détection ni de clic n'en dépend : le texte source reste en français,
 * cette couche ne fait que remplacer les textes AFFICHÉS quand la langue choisie est l'anglais ou l'espagnol.
 * Un texte sans traduction reste simplement en français (jamais de blocage).
 */
(function (global) {
  'use strict';
  const KEY = 'tqLang';
  const normKey = s => String(s).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

  // ---------- Textes fixes (français → anglais) ----------
  const RAW = {
    // Popup : en-tête et modes
    'Invitations Facebook': 'Facebook invitations',
    'Extension Chrome': 'Chrome extension',
    'Invitations réactions': 'Reaction invitations',
    'Extension locale': 'Local extension',
    'Une publication': 'One post',
    'Clique sur un emoji de réaction de la publication pour ouvrir la liste des personnes ayant réagi. L’extension sélectionne automatiquement « Toutes » si nécessaire, puis parcourt la liste et envoie les invitations disponibles.':
      'Click a reaction emoji on the post to open the list of people who reacted. The extension automatically selects "All" if needed, then goes through the list and sends the available invitations.',
    'Lancer les invitations': 'Start invitations',
    'Toute la Page': 'Whole Page',
    'Ouvre la Page Facebook, puis clique sur le bouton ci-dessous. L’extension repère elle-même les réactions de chaque publication (aucun calibrage), parcourt les publications une à une et envoie les invitations disponibles, jusqu’à la limite choisie ci-dessous. Chaque nouveau lancement réexamine les publications, même déjà visitées.':
      'Open the Facebook Page, then click the button below. The extension finds the reactions of each post by itself (no calibration), goes through the posts one by one and sends the available invitations, up to the limit chosen below. Each new run re-examines the posts, even those already visited.',
    'Lancer les invitations sur la Page': 'Start invitations on the Page',
    'Cette fenêtre se ferme automatiquement au lancement. L’avancement se suit dans le panneau flottant sur Facebook, que tu peux déplacer et réduire.':
      'This window closes automatically when you start. Progress is shown in the floating panel on Facebook, which you can move and collapse.',
    'Limite d’invitations — Toute la Page': 'Invitation limit — Whole Page',
    'Aucune limite': 'No limit',
    'Curseur : 10 à 5 000 invitations, dernière position « Aucune limite ». Saisie libre : 0 à 100 000 ;':
      'Slider: 10 to 5,000 invitations, last position "No limit". Free entry: 0 to 100,000;',
    '0 = Aucune limite': '0 = No limit',
    'Conseil de prudence :': 'Safety advice:',
    'sans limite, l’extension ne s’arrête pas à un nombre défini d’invitations. Nous recommandons de ne pas dépasser':
      'without a limit, the extension does not stop at a set number of invitations. We recommend not exceeding',
    '100 invitations par jour': '100 invitations per day',
    'afin de réduire le risque de restrictions temporaires de Facebook. Ce seuil est indicatif, et non officiellement garanti.':
      'to reduce the risk of temporary restrictions by Facebook. This threshold is indicative and not officially guaranteed.',
    'Tu restes libre de poursuivre': 'You are free to continue',
    ', dans les limites imposées par Facebook.': ', within the limits set by Facebook.',
    'Au plafond, « Reprendre » ajoute le même quota et continue au même endroit, sans recalibrer (tant que l’onglet Facebook n’est pas actualisé). Chaque nouveau lancement réexamine les publications, même déjà visitées. Une prolongation conserve le parcours en cours, sans revenir au début. Sondages exclus ; pause en cas de problème.':
      'At the limit, "Resume" adds the same quota and continues from the same place, without recalibrating (as long as the Facebook tab is not refreshed). Each new run re-examines the posts, even those already visited. An extension keeps the current run going without going back to the start. Polls are excluded; the run pauses if there is a problem.',
    'Repère des réactions': 'Reaction detection',
    'Les boutons de réactions sont repérés automatiquement sur chaque publication. Ferme les fenêtres Facebook ouvertes avant de lancer le parcours.':
      'Reaction buttons are detected automatically on each post. Close any open Facebook windows before starting the run.',
    'Calibrage non vérifié.': 'Calibration not checked.',
    'Détection automatique : aucun calibrage à faire.': 'Automatic detection: no calibration needed.',
    'Calibrage actif : clique une fois sur un emoji à droite. Le clic est intercepté.': 'Calibration active: click an emoji on the right once. The click is intercepted.',
    'Réglages avancés — valeurs recommandées': 'Advanced settings — recommended values',
    'Délai entre deux clics': 'Delay between two clicks',
    'millisecondes': 'milliseconds',
    'Maximum — mode « Une publication »': 'Maximum — "One post" mode',
    '0 = sans plafond propre à l\'extension': '0 = no limit set by the extension',
    'Prêt': 'Ready',
    'Ouvre la Page ou les réactions d\'une publication.': 'Open the Page or the reactions of a post.',
    'nous recommandons de limiter les invitations à': 'we recommend limiting invitations to',
    '100 par jour': '100 per day',
    'pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif, non officiellement garanti.':
      'to reduce the risk of a temporary restriction by Facebook. This threshold is indicative, not officially guaranteed.',
    'Tu peux choisir de poursuivre': 'You can choose to continue',
    'avec « Reprendre » ; une confirmation sera demandée lorsque la reprise autorise plus de 100 invitations cumulées.':
      'with "Resume"; a confirmation will be asked when resuming allows more than 100 cumulative invitations.',
    'Publications finies': 'Posts finished',
    'Publications ignorées — sécurité': 'Posts skipped — safety',
    'Indices visibles, réactions non reconnues': 'Visible clues, reactions not recognized',
    'Réactions non détectées': 'Reactions not detected',
    'Fenêtres de réactions ouvertes': 'Reaction windows opened',
    'Publications non ouvertes, à revoir': 'Posts not opened, to review',
    'La détection des indices visibles est indicative : elle ne garantit pas qu\'un compteur soit exploitable. « Non détectées » ne signifie pas « sans réactions ».':
      'Detection of visible clues is indicative: it does not guarantee that a counter is usable. "Not detected" does not mean "no reactions".',
    'Copier le diagnostic de la session': 'Copy the session diagnostic',
    'Arrêter': 'Stop',
    'Reprendre': 'Resume',
    'Le bouton « Lancer les invitations sur la Page » repère automatiquement les réactions de chaque publication, sans calibrage. Chaque session réexamine les publications, y compris celles déjà traitées auparavant : de nouvelles réactions peuvent avoir été ajoutées. Le mode « Toute la Page » ne clique que sur le bouton « Inviter » d\'une fenêtre de réactions reconnue. Les invitations réellement envoyées et les limites sont décidées par Facebook. La détection des publications dépend de son interface ; aucune visite de profil.':
      'The "Start invitations on the Page" button automatically detects the reactions of each post, without calibration. Each session re-examines the posts, including those already processed before: new reactions may have been added. The "Whole Page" mode only clicks the "Invite" button of a recognized reactions window. The invitations actually sent and the limits are decided by Facebook. Post detection depends on its interface; no profile is visited.',
    'Logo TQIDr Labs': 'TQIDr Labs logo',
    'Modes d\'utilisation': 'Usage modes',
    'Plafond pour toute la Page': 'Limit for the whole Page',
    'Curseur de 10 à 5 000 invitations, dernière position : Aucune limite': 'Slider from 10 to 5,000 invitations, last position: No limit',
    'Nombre libre d’invitations, 0 sans plafond': 'Free number of invitations, 0 for no limit',

    // Phases
    'Calibrage': 'Calibration', 'En cours': 'Running', 'En pause': 'Paused', 'Terminé': 'Done', 'Arrêté': 'Stopped', 'Erreur': 'Error',

    // Panneau flottant
    'Suivi des invitations Facebook': 'Facebook invitation tracking',
    'Glisse pour déplacer le panneau': 'Drag to move the panel',
    'Réduire le panneau': 'Collapse the panel', 'Agrandir le panneau': 'Expand the panel',
    'Réduire / agrandir': 'Collapse / expand',
    'Indicateurs de la session': 'Session indicators',
    'Confirmées': 'Confirmed', 'Clics envoyés': 'Clicks sent', 'À revoir': 'To review',
    'Clics sans confirmation visuelle et publications dont la fenêtre n’a pas pu s’ouvrir.': 'Clicks without visual confirmation and posts whose window could not be opened.',
    'Plafond d’invitations': 'Invitation limit',
    'Progression vers le plafond d’invitations': 'Progress toward the invitation limit',
    'limite de préférence les invitations à': 'preferably limit invitations to',
    'pour réduire le risque de restriction temporaire par Facebook. Ce seuil n\'est pas officiellement garanti.': 'to reduce the risk of a temporary restriction by Facebook. This threshold is not officially guaranteed.',
    'avec « Reprendre » : une confirmation sera demandée avant prolongation.': 'with "Resume": a confirmation will be asked before extending.',
    'Mode calibrage': 'Calibration mode', 'Mode Page entière': 'Whole Page mode', 'Mode manuel': 'Manual mode',
    'Conseil de prudence : nous recommandons de limiter les invitations à 100 par jour pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif, non officiellement garanti.':
      'Safety advice: we recommend limiting invitations to 100 per day to reduce the risk of a temporary restriction by Facebook. This threshold is indicative, not officially guaranteed.',
    'Conseil de prudence : nous recommandons de limiter les invitations à 100 par jour pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif et non officiellement garanti.':
      'Safety advice: we recommend limiting invitations to 100 per day to reduce the risk of a temporary restriction by Facebook. This threshold is indicative and not officially guaranteed.',
    'Cette reprise porterait le plafond cumulé à': 'This resume would bring the cumulative limit to',
    'Tu peux poursuivre à ta discrétion. Souhaites-tu continuer sans reprendre depuis le début ?': 'You may continue at your discretion. Do you want to continue without starting over?',
    'Tu restes libre de poursuivre. Souhaites-tu continuer sans remonter la Page ?': 'You are free to continue. Do you want to continue without going back up the Page?',
    '« Aucune limite » retire uniquement le plafond de l\'extension, pas les restrictions de Facebook. Souhaites-tu lancer ce parcours sans plafond ?':
      '"No limit" only removes the extension\'s limit, not Facebook\'s restrictions. Do you want to start this run without a limit?',

    // Messages d'état
    'Choisis un mode dans l’extension.': 'Choose a mode in the extension.',
    'Prêt à lancer le traitement.': 'Ready to start.',
    'En pause. Clique sur Reprendre pour continuer.': 'Paused. Click Resume to continue.',
    'Reprise du traitement…': 'Resuming…',
    'La Page Facebook a changé. Reviens sur la Page de départ ; cette reprise sans rescannage nécessite le même onglet non actualisé.': 'The Facebook Page has changed. Go back to the starting Page; this resume without rescanning needs the same, unrefreshed tab.',
    'Trop de clics cumulés : plafond numérique dépassé.': 'Too many cumulative clicks: numeric limit exceeded.',
    'Reprise à la position actuelle, sans remonter la Page.': 'Resuming at the current position, without going back up the Page.',
    'Fenêtre de réactions introuvable.': 'Reactions window not found.',
    'Fenêtre ouverte, mais impossible de confirmer que toutes les réactions sont affichées : pause de sécurité.': 'Window open, but it is impossible to confirm that all reactions are shown: safety pause.',
    'Fenêtre non reconnue après sélection de « Toutes ». Aucun autre clic tenté.': 'Window not recognized after selecting "All". No other click attempted.',
    'Arrêt de sécurité : trop d’itérations.': 'Safety stop: too many iterations.',
    'Fenêtre de réactions non visible pendant le traitement. Vérifie-la avant de reprendre.': 'Reactions window not visible during processing. Check it before resuming.',
    'Facebook semble limiter les invitations. Vérifie l’écran avant de reprendre.': 'Facebook seems to be limiting invitations. Check the screen before resuming.',
    'Vérification de l’invitation en cours…': 'Checking the invitation…',
    'Trois clics sans confirmation visuelle : pause de sécurité.': 'Three clicks without visual confirmation: safety pause.',
    'Invitation confirmée. Traitement en cours…': 'Invitation confirmed. Processing…',
    'Clic sans confirmation visuelle. Traitement sous surveillance…': 'Click without visual confirmation. Processing under watch…',
    'Recherche dans les réactions…': 'Searching the reactions…',
    'Zone de défilement des réactions perdue.': 'Reactions scroll area lost.',
    'Impossible d’identifier cette Page Facebook.': 'Unable to identify this Facebook Page.',
    'Restriction Facebook détectée pendant le chargement de la fenêtre.': 'Facebook restriction detected while the window was loading.',
    'Publication mise de côté sans nouveau clic.': 'Post set aside without any new click.',
    'Une fenêtre s’est ouverte mais son contenu n’a pas été reconnu après 30 s. Vérifie-la, ferme-la si nécessaire, puis reprends. Aucun clic effectué dedans.': 'A window opened but its content was not recognized after 30 s. Check it, close it if necessary, then resume. No click was made in it.',
    'Aucun clic dans la fenêtre…': 'No click in the window…',
    'Sondage ou commandes de vote détectés : publication ignorée sans clic.': 'Poll or voting controls detected: post skipped without clicking.',
    'La publication a été remplacée par Facebook et ne peut plus être identifiée sans ambiguïté. Aucun clic tenté.': 'The post was replaced by Facebook and can no longer be identified unambiguously. No click attempted.',
    'Le pictogramme de réaction n’est plus identifiable sur cette publication. Aucun clic tenté.': 'The reaction icon can no longer be identified on this post. No click attempted.',
    'La publication a disparu pendant le défilement. Aucun clic tenté.': 'The post disappeared while scrolling. No click attempted.',
    'Pictogramme instable ou introuvable après repositionnement : publication laissée à revoir, sans clic.': 'Icon unstable or not found after repositioning: post left to review, without clicking.',
    'Une fenêtre Facebook étrangère ou en chargement est déjà ouverte. Ferme-la avant de reprendre.': 'A foreign or loading Facebook window is already open. Close it before resuming.',
    'Cible refusée : zone de réaction non sûre ou modifiée. Aucun clic tenté.': 'Target refused: reaction area unsafe or modified. No click attempted.',
    'La fenêtre Facebook est encore visible, mais son contenu a changé. Aucun nouveau clic : ferme-la ou reprends après chargement.': 'The Facebook window is still visible, but its content has changed. No new click: close it or resume after loading.',
    'Fermeture refusée : la fenêtre n’a pas été identifiée comme liste de réactions.': 'Closing refused: the window was not identified as a reactions list.',
    'Fenêtre de réactions détectée, mais bouton Fermer introuvable.': 'Reactions window detected, but the Close button was not found.',
    'La fenêtre de réactions a disparu, mais une autre fenêtre Facebook est visible.': 'The reactions window disappeared, but another Facebook window is visible.',
    'La liste de réactions est toujours visible après deux tentatives de fermeture. Aucun autre clic.': 'The reactions list is still visible after two attempts to close it. No other click.',
    'La Page Facebook a changé. Reviens à la Page de départ pour reprendre.': 'The Facebook Page has changed. Go back to the starting Page to resume.',
    'Ouvre la chronologie d’une Page Facebook, et non le fil d’actualité.': 'Open a Facebook Page timeline, not the news feed.',
    'Détection automatique des réactions : parcours des publications de la Page.': 'Automatic reaction detection: going through the Page\'s posts.',
    'Départ à la publication calibrée, puis parcours vers les publications suivantes.': 'Starting at the calibrated post, then going on to the following posts.',
    'Chaque nouvelle session recontrôle les publications, indépendamment de l’historique.': 'Each new session re-checks the posts, regardless of history.',
    'Restriction Facebook détectée. Vérifie l’interface avant de reprendre.': 'Facebook restriction detected. Check the interface before resuming.',
    'Arrêt de sécurité : parcours anormalement long.': 'Safety stop: abnormally long run.',
    'Ferme d’abord la fenêtre Facebook inattendue (Annuler), puis reprends : cette publication sera ignorée.': 'First close the unexpected Facebook window (Cancel), then resume: this post will be skipped.',
    'Fenêtre étrangère détectée : cible interdite pour cette session.': 'Foreign window detected: target forbidden for this session.',
    'Publication interrompue introuvable. Arrête et relance une session.': 'Interrupted post not found. Stop and start a new session.',
    'Trois publications successives dont les réactions restent inaccessibles : parcours mis en pause pour vérifier le calibrage. Ces publications restent NON traitées.': 'Three successive posts whose reactions remain inaccessible: run paused so you can check. These posts remain UNPROCESSED.',
    'Clique sur « Reprendre » : la fenêtre actuelle sera terminée avant de passer à la suivante.': 'Click "Resume": the current window will be finished before moving on to the next.',
    'Une autre fenêtre Facebook est ouverte. Ferme-la, puis reprends.': 'Another Facebook window is open. Close it, then resume.',
    'Aucune publication reconnue après 15 défilements sur la Page, sans rechargement.': 'No post recognized after 15 scrolls on the Page, without reloading.',
    'Facebook ne présente pas de fil exploitable sur cette vue. Reprendre continue à la position actuelle.': 'Facebook does not present a usable feed in this view. Resume continues from the current position.',
    'Fin de page sans publication reconnue.': 'End of page without any recognized post.',
    'Reprendre ne renverra pas en haut.': 'Resume will not send you back to the top.',
    '12 publications reconnues, mais aucun raccourci de réactions identifié avec certitude.': '12 posts recognized, but no reactions shortcut identified with certainty.',
    'Arrêt sans clic.': 'Stopped without clicking.',
    '18 publications successives sans ouvreur de réactions reconnu. Consulte les indicateurs et le diagnostic. Parcours interrompu pour éviter des clics erronés.': '18 successive posts without a recognized reactions opener. Check the indicators and the diagnostic. Run interrupted to avoid wrong clicks.',
    'Publications présentes, mais aucune réaction ouverte après 8 défilements.': 'Posts found, but no reactions window opened after 8 scrolls.',
    'Douze défilements consécutifs sans ouverture de réactions : parcours arrêté.': 'Twelve consecutive scrolls without opening any reactions: run stopped.',
    'Aucune publication détectée. Ouvre la section Publications de ta Page, puis reprends.': 'No post detected. Open the Posts section of your Page, then resume.',
    'Liste entièrement parcourue.': 'List fully processed.',
    'Aucun clic.': 'No click.',
    'Aucune fenêtre de réactions.': 'No reactions window.',
    'Délai ou mode invalide.': 'Invalid delay or mode.',
    'Plafond invalide.': 'Invalid limit.',
    'Ouvre la chronologie d’une Page Facebook, pas le fil d’actualité ni Business Suite.': 'Open a Facebook Page timeline, not the news feed or Business Suite.',
    'Repérage des publications de la Page…': 'Locating the Page\'s posts…',
    'Recherche de la fenêtre des réactions…': 'Looking for the reactions window…',
    'Ouvre la Page Facebook concernée.': 'Open the relevant Facebook Page.',
    'Onglet Facebook indisponible.': 'Facebook tab unavailable.',
    'Ouvre ta Page sur facebook.com. Le mode Page entière n’est pas destiné à Business Suite.': 'Open your Page on facebook.com. The Whole Page mode is not meant for Business Suite.',
    'Rapport minimal copié (la page Facebook ne répond pas : recharge-la ou relance un parcours pour un rapport complet).': 'Minimal report copied (the Facebook page is not responding: reload it or start a run for a full report).',
    'Délai : entre 1 000 et 30 000 ms.': 'Delay: between 1,000 and 30,000 ms.',
    'Maximum manuel : entre 0 et 100 000.': 'Manual maximum: between 0 and 100,000.',
    'Maximum Page entière : entre 0 et 100 000, 0 sans plafond.': 'Whole Page maximum: between 0 and 100,000, 0 for no limit.',

    // Explications de pause
    'La liste des réactions n’est plus détectée (Facebook a probablement rechargé la fenêtre).': 'The reactions list is no longer detected (Facebook probably reloaded the window).',
    'Vérifie qu’elle est toujours ouverte, puis clique sur Reprendre.': 'Check that it is still open, then click Resume.',
    'La fenêtre des réactions n’est pas ouverte.': 'The reactions window is not open.',
    'Ouvre-la en cliquant sur un emoji de réaction, puis clique sur Reprendre.': 'Open it by clicking a reaction emoji, then click Resume.',
    'La fenêtre est ouverte, mais l’onglet « Toutes » n’est pas confirmé.': 'The window is open, but the "All" tab is not confirmed.',
    'Sélectionne « Toutes » toi-même, puis clique sur Reprendre.': 'Select "All" yourself, then click Resume.',
    'La fenêtre a changé après la sélection de « Toutes ».': 'The window changed after selecting "All".',
    'Vérifie son contenu, puis clique sur Reprendre.': 'Check its content, then click Resume.',
    'Arrêt de sécurité : trop d’étapes sur une même liste.': 'Safety stop: too many steps on a single list.',
    'Clique sur Arrêter, puis relance un parcours.': 'Click Stop, then start a new run.',
    'La fenêtre des réactions a disparu pendant le traitement.': 'The reactions window disappeared during processing.',
    'Facebook semble limiter les invitations.': 'Facebook seems to be limiting invitations.',
    'Vérifie l’écran Facebook et patiente avant de reprendre : insister peut prolonger la restriction.': 'Check the Facebook screen and wait before resuming: insisting may prolong the restriction.',
    'Trois invitations de suite n’ont pas été confirmées visuellement.': 'Three invitations in a row were not visually confirmed.',
    'Vérifie la liste (connexion lente ? limite Facebook ?), puis clique sur Reprendre ou Arrêter.': 'Check the list (slow connection? Facebook limit?), then click Resume or Stop.',
    'Une fenêtre de badges s’est ouverte à la place des réactions.': 'A badges window opened instead of the reactions.',
    'Ferme-la, vérifie l’emoji calibré, puis clique sur Reprendre.': 'Close it, check the calibrated emoji, then click Resume.',
    'Aucune fenêtre ne s’est ouverte après le clic sur l’emoji.': 'No window opened after clicking the emoji.',
    'Vérifie le calibrage, puis clique sur Reprendre.': 'Check the calibration, then click Resume.',
    'La fenêtre s’est ouverte, mais son contenu n’est pas reconnu.': 'The window opened, but its content is not recognized.',
    'Une autre fenêtre Facebook est ouverte.': 'Another Facebook window is open.',
    'Tu as quitté la Page de départ.': 'You left the starting Page.',
    'Reviens sur cette Page, puis clique sur Reprendre.': 'Go back to this Page, then click Resume.',
    'Ancien message de calibrage.': 'Old calibration message.',
    'Clique sur « Lancer les invitations sur la Page » : aucun calibrage n’est plus nécessaire.': 'Click "Start invitations on the Page": no calibration is needed anymore.',
    'Plusieurs publications de suite n’ont pas pu ouvrir leurs réactions.': 'Several posts in a row could not open their reactions.',
    'Vérifie le calibrage, puis clique sur Reprendre ou Arrêter.': 'Check the calibration, then click Resume or Stop.',
    'Aucune liste de réactions n’a pu être ouverte.': 'No reactions list could be opened.',
    'Vérifie le calibrage et la section Publications de ta Page, puis relance.': 'Check the calibration and the Posts section of your Page, then start again.',
    'La fenêtre des réactions ne se ferme pas correctement.': 'The reactions window does not close properly.',
    'Vérifie l’écran Facebook, puis clique sur Reprendre ou Arrêter.': 'Check the Facebook screen, then click Resume or Stop.'
  };

  const EXACT = new Map(Object.keys(RAW).map(k => [normKey(k), RAW[k]]));

  // ---------- Espagnol (clé = français normalisé) ----------
  const RAW_ES = {
    "Invitations Facebook": "Invitaciones de Facebook",
    "Extension Chrome": "Extensión de Chrome",
    "Invitations réactions": "Invitaciones por reacciones",
    "Extension locale": "Extensión local",
    "Une publication": "Una publicación",
    "Clique sur un emoji de réaction de la publication pour ouvrir la liste des personnes ayant réagi. L'extension sélectionne automatiquement « Toutes » si nécessaire, puis parcourt la liste et envoie les invitations disponibles.": "Haz clic en un emoji de reacción de la publicación para abrir la lista de personas que reaccionaron. La extensión selecciona automáticamente «Todo» si hace falta, recorre la lista y envía las invitaciones disponibles.",
    "Lancer les invitations": "Iniciar invitaciones",
    "Toute la Page": "Toda la Página",
    "Ouvre la Page Facebook, puis clique sur le bouton ci-dessous. L'extension repère elle-même les réactions de chaque publication (aucun calibrage), parcourt les publications une à une et envoie les invitations disponibles, jusqu'à la limite choisie ci-dessous. Chaque nouveau lancement réexamine les publications, même déjà visitées.": "Abre la Página de Facebook y haz clic en el botón de abajo. La extensión localiza por sí sola las reacciones de cada publicación (sin calibración), recorre las publicaciones una a una y envía las invitaciones disponibles, hasta el límite elegido abajo. Cada nuevo inicio vuelve a examinar las publicaciones, incluso las ya visitadas.",
    "Lancer les invitations sur la Page": "Iniciar invitaciones en la Página",
    "Cette fenêtre se ferme automatiquement au lancement. L'avancement se suit dans le panneau flottant sur Facebook, que tu peux déplacer et réduire.": "Esta ventana se cierra automáticamente al iniciar. El avance se sigue en el panel flotante de Facebook, que puedes mover y reducir.",
    "Limite d'invitations — Toute la Page": "Límite de invitaciones — Toda la Página",
    "Aucune limite": "Sin límite",
    "Curseur : 10 à 5 000 invitations, dernière position « Aucune limite ». Saisie libre : 0 à 100 000 ;": "Control deslizante: de 10 a 5 000 invitaciones, última posición «Sin límite». Entrada libre: de 0 a 100 000;",
    "0 = Aucune limite": "0 = Sin límite",
    "Conseil de prudence :": "Consejo de prudencia:",
    "sans limite, l'extension ne s'arrête pas à un nombre défini d'invitations. Nous recommandons de ne pas dépasser": "sin límite, la extensión no se detiene en un número definido de invitaciones. Recomendamos no superar",
    "100 invitations par jour": "100 invitaciones al día",
    "afin de réduire le risque de restrictions temporaires de Facebook. Ce seuil est indicatif, et non officiellement garanti.": "para reducir el riesgo de restricciones temporales de Facebook. Este umbral es orientativo y no está garantizado oficialmente.",
    "Tu restes libre de poursuivre": "Eres libre de continuar",
    ", dans les limites imposées par Facebook.": ", dentro de los límites impuestos por Facebook.",
    "Au plafond, « Reprendre » ajoute le même quota et continue au même endroit, sans recalibrer (tant que l'onglet Facebook n'est pas actualisé). Chaque nouveau lancement réexamine les publications, même déjà visitées. Une prolongation conserve le parcours en cours, sans revenir au début. Sondages exclus ; pause en cas de problème.": "Al llegar al límite, «Reanudar» añade la misma cuota y continúa en el mismo punto, sin recalibrar (mientras la pestaña de Facebook no se actualice). Cada nuevo inicio vuelve a examinar las publicaciones, incluso las ya visitadas. Una ampliación mantiene el recorrido en curso, sin volver al principio. Se excluyen las encuestas; el recorrido se pausa si hay algún problema.",
    "Repère des réactions": "Detección de reacciones",
    "Les boutons de réactions sont repérés automatiquement sur chaque publication. Ferme les fenêtres Facebook ouvertes avant de lancer le parcours.": "Los botones de reacciones se detectan automáticamente en cada publicación. Cierra las ventanas de Facebook abiertas antes de iniciar el recorrido.",
    "Calibrage non vérifié.": "Calibración sin comprobar.",
    "Détection automatique : aucun calibrage à faire.": "Detección automática: no hace falta calibrar.",
    "Calibrage actif : clique une fois sur un emoji à droite. Le clic est intercepté.": "Calibración activa: haz clic una vez en un emoji de la derecha. El clic se intercepta.",
    "Réglages avancés — valeurs recommandées": "Ajustes avanzados — valores recomendados",
    "Délai entre deux clics": "Retraso entre dos clics",
    "millisecondes": "milisegundos",
    "Maximum — mode « Une publication »": "Máximo — modo «Una publicación»",
    "0 = sans plafond propre à l'extension": "0 = sin límite propio de la extensión",
    "Prêt": "Listo",
    "Ouvre la Page ou les réactions d'une publication.": "Abre la Página o las reacciones de una publicación.",
    "nous recommandons de limiter les invitations à": "recomendamos limitar las invitaciones a",
    "100 par jour": "100 al día",
    "pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif, non officiellement garanti.": "para reducir el riesgo de una restricción temporal de Facebook. Este umbral es orientativo, no está garantizado oficialmente.",
    "Tu peux choisir de poursuivre": "Puedes decidir continuar",
    "avec « Reprendre » ; une confirmation sera demandée lorsque la reprise autorise plus de 100 invitations cumulées.": "con «Reanudar»; se pedirá confirmación cuando la reanudación permita más de 100 invitaciones acumuladas.",
    "Publications finies": "Publicaciones terminadas",
    "Publications ignorées — sécurité": "Publicaciones omitidas — seguridad",
    "Indices visibles, réactions non reconnues": "Indicios visibles, reacciones no reconocidas",
    "Réactions non détectées": "Reacciones no detectadas",
    "Fenêtres de réactions ouvertes": "Ventanas de reacciones abiertas",
    "Publications non ouvertes, à revoir": "Publicaciones sin abrir, por revisar",
    "La détection des indices visibles est indicative : elle ne garantit pas qu'un compteur soit exploitable. « Non détectées » ne signifie pas « sans réactions ».": "La detección de indicios visibles es orientativa: no garantiza que un contador sea utilizable. «No detectadas» no significa «sin reacciones».",
    "Copier le diagnostic de la session": "Copiar el diagnóstico de la sesión",
    "Arrêter": "Detener",
    "Reprendre": "Reanudar",
    "Le bouton « Lancer les invitations sur la Page » repère automatiquement les réactions de chaque publication, sans calibrage. Chaque session réexamine les publications, y compris celles déjà traitées auparavant : de nouvelles réactions peuvent avoir été ajoutées. Le mode « Toute la Page » ne clique que sur le bouton « Inviter » d'une fenêtre de réactions reconnue. Les invitations réellement envoyées et les limites sont décidées par Facebook. La détection des publications dépend de son interface ; aucune visite de profil.": "El botón «Iniciar invitaciones en la Página» detecta automáticamente las reacciones de cada publicación, sin calibración. Cada sesión vuelve a examinar las publicaciones, incluidas las ya procesadas antes: pueden haberse añadido nuevas reacciones. El modo «Toda la Página» solo hace clic en el botón «Invitar» de una ventana de reacciones reconocida. Facebook decide las invitaciones realmente enviadas y los límites. La detección de publicaciones depende de su interfaz; no se visita ningún perfil.",
    "Logo TQIDr Labs": "Logotipo de TQIDr Labs",
    "Modes d'utilisation": "Modos de uso",
    "Plafond pour toute la Page": "Límite para toda la Página",
    "Curseur de 10 à 5 000 invitations, dernière position : Aucune limite": "Control deslizante de 10 a 5 000 invitaciones, última posición: Sin límite",
    "Nombre libre d'invitations, 0 sans plafond": "Número libre de invitaciones, 0 para sin límite",
    "Calibrage": "Calibración",
    "En cours": "En curso",
    "En pause": "En pausa",
    "Terminé": "Terminado",
    "Arrêté": "Detenido",
    "Erreur": "Error",
    "Suivi des invitations Facebook": "Seguimiento de invitaciones de Facebook",
    "Glisse pour déplacer le panneau": "Arrastra para mover el panel",
    "Réduire le panneau": "Reducir el panel",
    "Agrandir le panneau": "Ampliar el panel",
    "Réduire / agrandir": "Reducir / ampliar",
    "Indicateurs de la session": "Indicadores de la sesión",
    "Confirmées": "Confirmadas",
    "Clics envoyés": "Clics enviados",
    "À revoir": "Por revisar",
    "Clics sans confirmation visuelle et publications dont la fenêtre n'a pas pu s'ouvrir.": "Clics sin confirmación visual y publicaciones cuya ventana no se pudo abrir.",
    "Plafond d'invitations": "Límite de invitaciones",
    "Progression vers le plafond d'invitations": "Progreso hacia el límite de invitaciones",
    "limite de préférence les invitations à": "limita de preferencia las invitaciones a",
    "pour réduire le risque de restriction temporaire par Facebook. Ce seuil n'est pas officiellement garanti.": "para reducir el riesgo de una restricción temporal de Facebook. Este umbral no está garantizado oficialmente.",
    "avec « Reprendre » : une confirmation sera demandée avant prolongation.": "con «Reanudar»: se pedirá confirmación antes de ampliar.",
    "Mode calibrage": "Modo calibración",
    "Mode Page entière": "Modo Página completa",
    "Mode manuel": "Modo manual",
    "Conseil de prudence : nous recommandons de limiter les invitations à 100 par jour pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif, non officiellement garanti.": "Consejo de prudencia: recomendamos limitar las invitaciones a 100 al día para reducir el riesgo de una restricción temporal de Facebook. Este umbral es orientativo, no está garantizado oficialmente.",
    "Conseil de prudence : nous recommandons de limiter les invitations à 100 par jour pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif et non officiellement garanti.": "Consejo de prudencia: recomendamos limitar las invitaciones a 100 al día para reducir el riesgo de una restricción temporal de Facebook. Este umbral es orientativo y no está garantizado oficialmente.",
    "Cette reprise porterait le plafond cumulé à": "Esta reanudación elevaría el límite acumulado a",
    "Tu peux poursuivre à ta discrétion. Souhaites-tu continuer sans reprendre depuis le début ?": "Puedes continuar a tu criterio. ¿Quieres continuar sin empezar desde el principio?",
    "Tu restes libre de poursuivre. Souhaites-tu continuer sans remonter la Page ?": "Eres libre de continuar. ¿Quieres continuar sin volver a subir por la Página?",
    "« Aucune limite » retire uniquement le plafond de l'extension, pas les restrictions de Facebook. Souhaites-tu lancer ce parcours sans plafond ?": "«Sin límite» solo quita el límite de la extensión, no las restricciones de Facebook. ¿Quieres iniciar este recorrido sin límite?",
    "Choisis un mode dans l'extension.": "Elige un modo en la extensión.",
    "Prêt à lancer le traitement.": "Listo para empezar.",
    "En pause. Clique sur Reprendre pour continuer.": "En pausa. Haz clic en Reanudar para continuar.",
    "Reprise du traitement…": "Reanudando…",
    "La Page Facebook a changé. Reviens sur la Page de départ ; cette reprise sans rescannage nécessite le même onglet non actualisé.": "La Página de Facebook ha cambiado. Vuelve a la Página de inicio; esta reanudación sin volver a escanear necesita la misma pestaña sin actualizar.",
    "Trop de clics cumulés : plafond numérique dépassé.": "Demasiados clics acumulados: se superó el límite numérico.",
    "Reprise à la position actuelle, sans remonter la Page.": "Reanudando en la posición actual, sin volver a subir por la Página.",
    "Fenêtre de réactions introuvable.": "No se encuentra la ventana de reacciones.",
    "Fenêtre ouverte, mais impossible de confirmer que toutes les réactions sont affichées : pause de sécurité.": "Ventana abierta, pero no se puede confirmar que se muestren todas las reacciones: pausa de seguridad.",
    "Fenêtre non reconnue après sélection de « Toutes ». Aucun autre clic tenté.": "Ventana no reconocida tras seleccionar «Todo». No se intentó ningún otro clic.",
    "Arrêt de sécurité : trop d'itérations.": "Parada de seguridad: demasiadas iteraciones.",
    "Fenêtre de réactions non visible pendant le traitement. Vérifie-la avant de reprendre.": "Ventana de reacciones no visible durante el procesamiento. Compruébala antes de reanudar.",
    "Facebook semble limiter les invitations. Vérifie l'écran avant de reprendre.": "Facebook parece limitar las invitaciones. Comprueba la pantalla antes de reanudar.",
    "Vérification de l'invitation en cours…": "Comprobando la invitación…",
    "Trois clics sans confirmation visuelle : pause de sécurité.": "Tres clics sin confirmación visual: pausa de seguridad.",
    "Invitation confirmée. Traitement en cours…": "Invitación confirmada. Procesando…",
    "Clic sans confirmation visuelle. Traitement sous surveillance…": "Clic sin confirmación visual. Procesando bajo vigilancia…",
    "Recherche dans les réactions…": "Buscando en las reacciones…",
    "Zone de défilement des réactions perdue.": "Se perdió la zona de desplazamiento de las reacciones.",
    "Impossible d'identifier cette Page Facebook.": "No se puede identificar esta Página de Facebook.",
    "Restriction Facebook détectée pendant le chargement de la fenêtre.": "Restricción de Facebook detectada mientras se cargaba la ventana.",
    "Publication mise de côté sans nouveau clic.": "Publicación apartada sin ningún clic nuevo.",
    "Une fenêtre s'est ouverte mais son contenu n'a pas été reconnu après 30 s. Vérifie-la, ferme-la si nécessaire, puis reprends. Aucun clic effectué dedans.": "Se abrió una ventana pero su contenido no se reconoció tras 30 s. Compruébala, ciérrala si es necesario y reanuda. No se hizo ningún clic en ella.",
    "Aucun clic dans la fenêtre…": "Ningún clic en la ventana…",
    "Sondage ou commandes de vote détectés : publication ignorée sans clic.": "Se detectaron una encuesta o controles de votación: publicación omitida sin hacer clic.",
    "La publication a été remplacée par Facebook et ne peut plus être identifiée sans ambiguïté. Aucun clic tenté.": "Facebook sustituyó la publicación y ya no se puede identificar sin ambigüedad. No se intentó ningún clic.",
    "Le pictogramme de réaction n'est plus identifiable sur cette publication. Aucun clic tenté.": "El icono de reacción ya no se puede identificar en esta publicación. No se intentó ningún clic.",
    "La publication a disparu pendant le défilement. Aucun clic tenté.": "La publicación desapareció durante el desplazamiento. No se intentó ningún clic.",
    "Pictogramme instable ou introuvable après repositionnement : publication laissée à revoir, sans clic.": "Icono inestable o no encontrado tras reposicionar: publicación pendiente de revisión, sin hacer clic.",
    "Une fenêtre Facebook étrangère ou en chargement est déjà ouverte. Ferme-la avant de reprendre.": "Ya hay abierta una ventana de Facebook ajena o en carga. Ciérrala antes de reanudar.",
    "Cible refusée : zone de réaction non sûre ou modifiée. Aucun clic tenté.": "Objetivo rechazado: zona de reacción no segura o modificada. No se intentó ningún clic.",
    "La fenêtre Facebook est encore visible, mais son contenu a changé. Aucun nouveau clic : ferme-la ou reprends après chargement.": "La ventana de Facebook sigue visible, pero su contenido ha cambiado. Ningún clic nuevo: ciérrala o reanuda tras la carga.",
    "Fermeture refusée : la fenêtre n'a pas été identifiée comme liste de réactions.": "Cierre rechazado: la ventana no se identificó como lista de reacciones.",
    "Fenêtre de réactions détectée, mais bouton Fermer introuvable.": "Ventana de reacciones detectada, pero no se encuentra el botón Cerrar.",
    "La fenêtre de réactions a disparu, mais une autre fenêtre Facebook est visible.": "La ventana de reacciones desapareció, pero hay otra ventana de Facebook visible.",
    "La liste de réactions est toujours visible après deux tentatives de fermeture. Aucun autre clic.": "La lista de reacciones sigue visible tras dos intentos de cierre. Ningún otro clic.",
    "La Page Facebook a changé. Reviens à la Page de départ pour reprendre.": "La Página de Facebook ha cambiado. Vuelve a la Página de inicio para reanudar.",
    "Ouvre la chronologie d'une Page Facebook, et non le fil d'actualité.": "Abre la biografía de una Página de Facebook, no el feed de noticias.",
    "Détection automatique des réactions : parcours des publications de la Page.": "Detección automática de reacciones: recorriendo las publicaciones de la Página.",
    "Départ à la publication calibrée, puis parcours vers les publications suivantes.": "Empezando en la publicación calibrada y siguiendo con las publicaciones siguientes.",
    "Chaque nouvelle session recontrôle les publications, indépendamment de l'historique.": "Cada nueva sesión vuelve a comprobar las publicaciones, independientemente del historial.",
    "Restriction Facebook détectée. Vérifie l'interface avant de reprendre.": "Restricción de Facebook detectada. Comprueba la interfaz antes de reanudar.",
    "Arrêt de sécurité : parcours anormalement long.": "Parada de seguridad: recorrido anormalmente largo.",
    "Ferme d'abord la fenêtre Facebook inattendue (Annuler), puis reprends : cette publication sera ignorée.": "Cierra primero la ventana inesperada de Facebook (Cancelar) y luego reanuda: esta publicación se omitirá.",
    "Fenêtre étrangère détectée : cible interdite pour cette session.": "Ventana ajena detectada: objetivo prohibido para esta sesión.",
    "Publication interrompue introuvable. Arrête et relance une session.": "No se encuentra la publicación interrumpida. Detén el recorrido e inicia una sesión nueva.",
    "Trois publications successives dont les réactions restent inaccessibles : parcours mis en pause pour vérifier le calibrage. Ces publications restent NON traitées.": "Tres publicaciones seguidas cuyas reacciones siguen siendo inaccesibles: recorrido en pausa para que lo compruebes. Estas publicaciones quedan SIN procesar.",
    "Clique sur « Reprendre » : la fenêtre actuelle sera terminée avant de passer à la suivante.": "Haz clic en «Reanudar»: se terminará la ventana actual antes de pasar a la siguiente.",
    "Une autre fenêtre Facebook est ouverte. Ferme-la, puis reprends.": "Hay otra ventana de Facebook abierta. Ciérrala y reanuda.",
    "Aucune publication reconnue après 15 défilements sur la Page, sans rechargement.": "Ninguna publicación reconocida tras 15 desplazamientos por la Página, sin recargar.",
    "Facebook ne présente pas de fil exploitable sur cette vue. Reprendre continue à la position actuelle.": "Facebook no presenta un feed utilizable en esta vista. Reanudar continúa desde la posición actual.",
    "Fin de page sans publication reconnue.": "Final de la página sin ninguna publicación reconocida.",
    "Reprendre ne renverra pas en haut.": "Reanudar no te devolverá al principio.",
    "12 publications reconnues, mais aucun raccourci de réactions identifié avec certitude.": "12 publicaciones reconocidas, pero ningún acceso directo a las reacciones identificado con certeza.",
    "Arrêt sans clic.": "Detenido sin hacer clic.",
    "18 publications successives sans ouvreur de réactions reconnu. Consulte les indicateurs et le diagnostic. Parcours interrompu pour éviter des clics erronés.": "18 publicaciones seguidas sin un acceso a las reacciones reconocido. Consulta los indicadores y el diagnóstico. Recorrido interrumpido para evitar clics erróneos.",
    "Publications présentes, mais aucune réaction ouverte après 8 défilements.": "Hay publicaciones, pero no se abrió ninguna reacción tras 8 desplazamientos.",
    "Douze défilements consécutifs sans ouverture de réactions : parcours arrêté.": "Doce desplazamientos consecutivos sin abrir reacciones: recorrido detenido.",
    "Aucune publication détectée. Ouvre la section Publications de ta Page, puis reprends.": "No se detectó ninguna publicación. Abre la sección Publicaciones de tu Página y reanuda.",
    "Liste entièrement parcourue.": "Lista recorrida por completo.",
    "Aucun clic.": "Ningún clic.",
    "Aucune fenêtre de réactions.": "Ninguna ventana de reacciones.",
    "Délai ou mode invalide.": "Retraso o modo no válido.",
    "Plafond invalide.": "Límite no válido.",
    "Ouvre la chronologie d'une Page Facebook, pas le fil d'actualité ni Business Suite.": "Abre la biografía de una Página de Facebook, no el feed de noticias ni Business Suite.",
    "Repérage des publications de la Page…": "Localizando las publicaciones de la Página…",
    "Recherche de la fenêtre des réactions…": "Buscando la ventana de reacciones…",
    "Ouvre la Page Facebook concernée.": "Abre la Página de Facebook correspondiente.",
    "Onglet Facebook indisponible.": "Pestaña de Facebook no disponible.",
    "Ouvre ta Page sur facebook.com. Le mode Page entière n'est pas destiné à Business Suite.": "Abre tu Página en facebook.com. El modo Toda la Página no está pensado para Business Suite.",
    "Rapport minimal copié (la page Facebook ne répond pas : recharge-la ou relance un parcours pour un rapport complet).": "Informe mínimo copiado (la página de Facebook no responde: recárgala o inicia un recorrido para obtener un informe completo).",
    "Délai : entre 1 000 et 30 000 ms.": "Retraso: entre 1 000 y 30 000 ms.",
    "Maximum manuel : entre 0 et 100 000.": "Máximo manual: entre 0 y 100 000.",
    "Maximum Page entière : entre 0 et 100 000, 0 sans plafond.": "Máximo de Toda la Página: entre 0 y 100 000, 0 para sin límite.",
    "La liste des réactions n'est plus détectée (Facebook a probablement rechargé la fenêtre).": "Ya no se detecta la lista de reacciones (Facebook probablemente recargó la ventana).",
    "Vérifie qu'elle est toujours ouverte, puis clique sur Reprendre.": "Comprueba que sigue abierta y haz clic en Reanudar.",
    "La fenêtre des réactions n'est pas ouverte.": "La ventana de reacciones no está abierta.",
    "Ouvre-la en cliquant sur un emoji de réaction, puis clique sur Reprendre.": "Ábrela haciendo clic en un emoji de reacción y luego haz clic en Reanudar.",
    "La fenêtre est ouverte, mais l'onglet « Toutes » n'est pas confirmé.": "La ventana está abierta, pero la pestaña «Todo» no está confirmada.",
    "Sélectionne « Toutes » toi-même, puis clique sur Reprendre.": "Selecciona «Todo» tú mismo y luego haz clic en Reanudar.",
    "La fenêtre a changé après la sélection de « Toutes ».": "La ventana cambió tras seleccionar «Todo».",
    "Vérifie son contenu, puis clique sur Reprendre.": "Comprueba su contenido y haz clic en Reanudar.",
    "Arrêt de sécurité : trop d'étapes sur une même liste.": "Parada de seguridad: demasiados pasos en una misma lista.",
    "Clique sur Arrêter, puis relance un parcours.": "Haz clic en Detener e inicia un nuevo recorrido.",
    "La fenêtre des réactions a disparu pendant le traitement.": "La ventana de reacciones desapareció durante el procesamiento.",
    "Facebook semble limiter les invitations.": "Facebook parece limitar las invitaciones.",
    "Vérifie l'écran Facebook et patiente avant de reprendre : insister peut prolonger la restriction.": "Comprueba la pantalla de Facebook y espera antes de reanudar: insistir puede prolongar la restricción.",
    "Trois invitations de suite n'ont pas été confirmées visuellement.": "Tres invitaciones seguidas no se confirmaron visualmente.",
    "Vérifie la liste (connexion lente ? limite Facebook ?), puis clique sur Reprendre ou Arrêter.": "Comprueba la lista (¿conexión lenta? ¿límite de Facebook?) y haz clic en Reanudar o Detener.",
    "Une fenêtre de badges s'est ouverte à la place des réactions.": "Se abrió una ventana de insignias en lugar de las reacciones.",
    "Ferme-la, vérifie l'emoji calibré, puis clique sur Reprendre.": "Ciérrala, comprueba el emoji calibrado y haz clic en Reanudar.",
    "Aucune fenêtre ne s'est ouverte après le clic sur l'emoji.": "No se abrió ninguna ventana tras hacer clic en el emoji.",
    "Vérifie le calibrage, puis clique sur Reprendre.": "Comprueba la calibración y haz clic en Reanudar.",
    "La fenêtre s'est ouverte, mais son contenu n'est pas reconnu.": "La ventana se abrió, pero su contenido no se reconoce.",
    "Une autre fenêtre Facebook est ouverte.": "Hay otra ventana de Facebook abierta.",
    "Tu as quitté la Page de départ.": "Has salido de la Página de inicio.",
    "Reviens sur cette Page, puis clique sur Reprendre.": "Vuelve a esta Página y haz clic en Reanudar.",
    "Ancien message de calibrage.": "Mensaje antiguo de calibración.",
    "Clique sur « Lancer les invitations sur la Page » : aucun calibrage n'est plus nécessaire.": "Haz clic en «Iniciar invitaciones en la Página»: ya no hace falta calibrar.",
    "Plusieurs publications de suite n'ont pas pu ouvrir leurs réactions.": "Varias publicaciones seguidas no pudieron abrir sus reacciones.",
    "Vérifie le calibrage, puis clique sur Reprendre ou Arrêter.": "Comprueba la calibración y haz clic en Reanudar o Detener.",
    "Aucune liste de réactions n'a pu être ouverte.": "No se pudo abrir ninguna lista de reacciones.",
    "Vérifie le calibrage et la section Publications de ta Page, puis relance.": "Comprueba la calibración y la sección Publicaciones de tu Página y vuelve a empezar.",
    "La fenêtre des réactions ne se ferme pas correctement.": "La ventana de reacciones no se cierra correctamente.",
    "Vérifie l'écran Facebook, puis clique sur Reprendre ou Arrêter.": "Comprueba la pantalla de Facebook y haz clic en Reanudar o Detener."
  };
  RAW_ES['Pause'] = 'Pausar';
  const EXACT_ES = new Map(Object.entries(RAW_ES));

  // ---------- Messages à valeurs variables ----------
  const cur = s => String(s).replace(/^Publication\b/, 'Post');
  const plural = (n, one, many) => (String(n).replace(/\D/g, '') === '1' ? one : many);
  const P = [
    [/^(.+) : étape 2\/2, onglet « Toutes »…$/, m => `${cur(m[1])}: step 2/2, "All" tab…`],
    [/^(.+) : une seule catégorie de réaction, pas d'onglet « Toutes »\.$/, m => `${cur(m[1])}: a single reaction category, no "All" tab.`],
    [/^(\d+) personne\(s\) vue\(s\) sur (\d+) annoncée\(s\) : Facebook n'a pas chargé le reste de la liste \(ou certaines lignes n'ont pas de bouton Inviter\)\.$/, m => `${m[1]} person(s) seen out of ${m[2]} announced: Facebook did not load the rest of the list (or some rows have no Invite button).`],
    [/^Fin de liste apparente : (\d+) personne\(s\) vue\(s\) sur (\d+) annoncée\(s\), attente de Facebook…$/, m => `Apparent end of list: ${m[1]} person(s) seen out of ${m[2]} announced, waiting for Facebook…`],
    [/^Nouveau plafond cumulé : (.+) clics\.$/, m => `New cumulative limit: ${m[1]} clicks.`],
    [/^Arrêt manuel : (\d+) publication\(s\) terminée\(s\)\.$/, m => `Manual stop: ${m[1]} post(s) finished.`],
    [/^(.+) : vérification de l'ouverture \((.+) s\)…$/, m => `${cur(m[1])}: checking the opening (${m[2]} s)…`],
    [/^Aucune fenêtre de réactions après (\d+) ms\.$/, m => `No reactions window after ${m[1]} ms.`],
    [/^(.+) : fenêtre ouverte, attente du contenu \((\d+)\/30 s\)\.$/, m => `${cur(m[1])}: window open, waiting for content (${m[2]}/30 s).`],
    [/^(.+) : réactions inaccessibles ou instables\.$/, m => `${cur(m[1])}: reactions inaccessible or unstable.`],
    [/^Publication mise de côté \(non traitée, (\d+) échec\(s\)\)\.$/, m => `Post set aside (not processed, ${m[1]} failure(s)).`],
    [/^(.+) : ouverture de la liste des réactions…$/, m => `${cur(m[1])}: opening the reactions list…`],
    [/^(.+) : fermeture de la fenêtre de réactions…$/, m => `${cur(m[1])}: closing the reactions window…`],
    [/^(.+) : recherche de la rangée de réactions en bas de publication…$/, m => `${cur(m[1])}: looking for the reactions row at the bottom of the post…`],
    [/^Plafond de (.+) clics atteint\.$/, m => `Limit of ${m[1]} clicks reached.`],
    [/^Clique sur « Reprendre » pour ajouter (.+) clics, sans recalibrage ni retour en haut\.$/, m => `Click "Resume" to add ${m[1]} clicks, without recalibrating or going back to the top.`],
    [/^Plafond de (.+) clics atteint au milieu d'une publication\.$/, m => `Limit of ${m[1]} clicks reached in the middle of a post.`],
    [/^(.+) : sondage ignoré par sécurité \((\d+)\)\.$/, m => `${cur(m[1])}: poll skipped for safety (${m[2]}).`],
    [/^(.+) : reprise de l'ouverture des réactions…$/, m => `${cur(m[1])}: resuming the opening of the reactions…`],
    [/^(.+) terminée · (\d+) publication\(s\) vérifiée\(s\) pendant cette session\.$/, m => `${cur(m[1])} finished · ${m[2]} post(s) checked during this session.`],
    [/^Recherche des publications sous les encarts : défilement (\d+)\/15…$/, m => `Looking for posts below the inserts: scroll ${m[1]}/15…`],
    [/^(.+) : déjà visitée dans le passé, mais réexaminée intégralement \((\d+) recontrôle\(s\)\)\.$/, m => `${cur(m[1])}: already visited in the past, but fully re-examined (${m[2]} re-check(s)).`],
    [/^(.+) : publication ignorée par sécurité \(sondage, (\d+)\)\.$/, m => `${cur(m[1])}: post skipped for safety (poll, ${m[2]}).`],
    [/^(.+) : indices visibles de réactions, mais ouverture non reconnue\.$/, m => `${cur(m[1])}: visible reaction clues, but opener not recognized.`],
    [/^Aucun clic tenté \((\d+)\)\.$/, m => `No click attempted (${m[1]}).`],
    [/^(.+) : aucun indice de réactions identifié après repositionnement\.$/, m => `${cur(m[1])}: no reaction clue identified after repositioning.`],
    [/^Cela ne prouve pas leur absence \((\d+)\)\.$/, m => `This does not prove they are absent (${m[1]}).`],
    [/^Recherche de publications plus anciennes… (\d+) terminée\(s\), (\d+) recontrôlée\(s\)\.$/, m => `Looking for older posts… ${m[1]} finished, ${m[2]} re-checked.`],
    [/^Parcours terminé : (\d+) publication\(s\) achevée\(s\), (\d+) recontrôlée\(s\), (\d+) avec indices non reconnus, (\d+) sans indices fiables, (\d+) ignorée\(s\) par sécurité, (\d+) non ouverte\(s\) à vérifier\.$/, m => `Run finished: ${m[1]} post(s) completed, ${m[2]} re-checked, ${m[3]} with unrecognized clues, ${m[4]} without reliable clues, ${m[5]} skipped for safety, ${m[6]} not opened to review.`],
    [/^(\d+) liste\(s\) de réactions incomplète\(s\) côté Facebook \(total annoncé non atteint\)\.$/, m => `${m[1]} reactions list(s) incomplete on Facebook's side (announced total not reached).`],
    [/^Maximum de (\d+) clic\(s\) atteint\.$/, m => `Maximum of ${m[1]} click(s) reached.`],
    [/^Liste parcourue, mais incomplète : (.+)$/, m => `List processed, but incomplete: ${tr(m[1])}`],
    [/^Pause de sécurité : (.+)$/, m => `Safety pause: ${tr(m[1])}`],
    [/^Détail technique : (.+)$/, m => `Technical detail: ${tr(m[1])}`],
    [/^(.+) Vérifie l'écran Facebook, puis clique sur Reprendre ou Arrêter\.$/, m => `${tr(m[1])} Check the Facebook screen, then click Resume or Stop.`],
    [/^(\d+) publication\(s\) finie\(s\) · (\d+) fenêtre\(s\) ouverte\(s\) · (\d+) indices visibles non reconnus · (\d+) sans indice détecté · (\d+) ignorée\(s\) par sécurité · (\d+) non ouverte\(s\)$/, m => `${m[1]} post(s) finished · ${m[2]} window(s) opened · ${m[3]} visible clues not recognized · ${m[4]} without clue detected · ${m[5]} skipped for safety · ${m[6]} not opened`],
    [/^(.+) confirmées? · (.+) clics?$/, m => `${m[1]} confirmed · ${m[2]} click${plural(m[2], '', 's')}`],
    [/^Reprendre \(\+(.+)\)$/, m => `Resume (+${m[1]})`],
    [/^(.+) \/ (.+) · (\d+) %$/, m => `${m[1]} / ${m[2]} · ${m[3]}%`],
    [/^(.+) invitations? confirmées? visuellement$/, m => `${m[1]} invitation${plural(m[1], '', 's')} visually confirmed`],
    [/^(\d+) clics? sans confirmation visuelle\. Vérifie les invitations si le nombre augmente\.$/, m => `${m[1]} click${plural(m[1], '', 's')} without visual confirmation. Check the invitations if the number grows.`],
    [/^Diagnostic copié : résumé de session et (\d+) événement\(s\), sans noms ni profils\. Colle-le dans un fichier texte\.$/, m => `Diagnostic copied: session summary and ${m[1]} event(s), with no names or profiles. Paste it into a text file.`],
    [/^Impossible de copier le diagnostic : (.+)$/, m => `Unable to copy the diagnostic: ${m[1]}`],
    [/^Cette reprise porterait le plafond cumulé à (.+) invitations\.$/, m => `This resume would bring the cumulative limit to ${m[1]} invitations.`]
  ];

  const curEs = s => String(s).replace(/^Publication\b/, 'Publicación');
  const PES = [
    m => `${curEs(m[1])}: paso 2/2, pestaña «Todo»…`,
    m => `${curEs(m[1])}: una sola categoría de reacción, sin pestaña «Todo».`,
    m => `${m[1]} persona(s) vista(s) de ${m[2]} anunciada(s): Facebook no cargó el resto de la lista (o algunas filas no tienen botón Invitar).`,
    m => `Final aparente de la lista: ${m[1]} persona(s) vista(s) de ${m[2]} anunciada(s), esperando a Facebook…`,
    m => `Nuevo límite acumulado: ${m[1]} clics.`,
    m => `Parada manual: ${m[1]} publicación(es) terminada(s).`,
    m => `${curEs(m[1])}: comprobando la apertura (${m[2]} s)…`,
    m => `Ninguna ventana de reacciones tras ${m[1]} ms.`,
    m => `${curEs(m[1])}: ventana abierta, esperando el contenido (${m[2]}/30 s).`,
    m => `${curEs(m[1])}: reacciones inaccesibles o inestables.`,
    m => `Publicación apartada (no procesada, ${m[1]} fallo(s)).`,
    m => `${curEs(m[1])}: abriendo la lista de reacciones…`,
    m => `${curEs(m[1])}: cerrando la ventana de reacciones…`,
    m => `${curEs(m[1])}: buscando la fila de reacciones al pie de la publicación…`,
    m => `Límite de ${m[1]} clics alcanzado.`,
    m => `Haz clic en «Reanudar» para añadir ${m[1]} clics, sin recalibrar ni volver al principio.`,
    m => `Límite de ${m[1]} clics alcanzado en mitad de una publicación.`,
    m => `${curEs(m[1])}: encuesta omitida por seguridad (${m[2]}).`,
    m => `${curEs(m[1])}: reanudando la apertura de las reacciones…`,
    m => `${curEs(m[1])} terminada · ${m[2]} publicación(es) revisada(s) durante esta sesión.`,
    m => `Buscando publicaciones bajo los recuadros: desplazamiento ${m[1]}/15…`,
    m => `${curEs(m[1])}: ya visitada en el pasado, pero reexaminada por completo (${m[2]} recontrol(es)).`,
    m => `${curEs(m[1])}: publicación omitida por seguridad (encuesta, ${m[2]}).`,
    m => `${curEs(m[1])}: indicios visibles de reacciones, pero apertura no reconocida.`,
    m => `Ningún clic intentado (${m[1]}).`,
    m => `${curEs(m[1])}: ningún indicio de reacciones identificado tras reposicionar.`,
    m => `Eso no prueba que no existan (${m[1]}).`,
    m => `Buscando publicaciones más antiguas… ${m[1]} terminada(s), ${m[2]} recontrolada(s).`,
    m => `Recorrido terminado: ${m[1]} publicación(es) completada(s), ${m[2]} recontrolada(s), ${m[3]} con indicios no reconocidos, ${m[4]} sin indicios fiables, ${m[5]} omitida(s) por seguridad, ${m[6]} sin abrir por revisar.`,
    m => `${m[1]} lista(s) de reacciones incompleta(s) por parte de Facebook (total anunciado no alcanzado).`,
    m => `Máximo de ${m[1]} clic(s) alcanzado.`,
    m => `Lista recorrida, pero incompleta: ${tr(m[1])}`,
    m => `Pausa de seguridad: ${tr(m[1])}`,
    m => `Detalle técnico: ${tr(m[1])}`,
    m => `${tr(m[1])} Comprueba la pantalla de Facebook y haz clic en Reanudar o Detener.`,
    m => `${m[1]} publicación(es) terminada(s) · ${m[2]} ventana(s) abierta(s) · ${m[3]} indicios visibles no reconocidos · ${m[4]} sin indicio detectado · ${m[5]} omitida(s) por seguridad · ${m[6]} sin abrir`,
    m => `${m[1]} confirmada${plural(m[1], '', 's')} · ${m[2]} clic${plural(m[2], '', 's')}`,
    m => `Reanudar (+${m[1]})`,
    m => `${m[1]} / ${m[2]} · ${m[3]} %`,
    m => `${m[1]} ${plural(m[1], 'invitación confirmada', 'invitaciones confirmadas')} visualmente`,
    m => `${m[1]} clic${plural(m[1], '', 's')} sin confirmación visual. Comprueba las invitaciones si el número aumenta.`,
    m => `Diagnóstico copiado: resumen de la sesión y ${m[1]} evento(s), sin nombres ni perfiles. Pégalo en un archivo de texto.`,
    m => `No se puede copiar el diagnóstico: ${m[1]}`,
    m => `Esta reanudación elevaría el límite acumulado a ${m[1]} invitaciones.`
  ];

  // ---------- Moteur ----------
  let lang = 'fr';
  const SPLIT = /(?<=[.!?…])\s+/;
  function lookup(k) {
    const es = lang === 'es';
    const hit = (es ? EXACT_ES : EXACT).get(k);
    if (hit !== undefined) return hit;
    for (let i = 0; i < P.length; i++) {
      const m = P[i][0].exec(k);
      if (m) return es ? PES[i](m) : P[i][1](m);
    }
    return null;
  }
  function tr(s) {
    if (lang === 'fr' || typeof s !== 'string' || !s.trim()) return s;
    if (s.includes('\n')) return s.split('\n').map(tr).join('\n');
    const k = normKey(s);
    const whole = lookup(k);
    if (whole !== null) return whole;
    const parts = k.split(SPLIT);
    if (parts.length > 1) {
      // Segments de plusieurs phrases : on cherche d'abord la suite de phrases la plus longue connue.
      let any = false; const out = [];
      for (let i = 0; i < parts.length;) {
        let done = false;
        for (let j = parts.length; j > i; j--) {
          const t = lookup(parts.slice(i, j).join(' '));
          if (t !== null) { out.push(t); any = true; i = j; done = true; break; }
        }
        if (!done) { out.push(parts[i]); i++; }
      }
      if (any) return out.join(' ');
    }
    return s;
  }

  const textMemo = new WeakMap(), attrMemo = new WeakMap();
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  function wrapText(fr) {
    const lead = (fr.match(/^\s*/) || [''])[0], trail = (fr.match(/\s*$/) || [''])[0];
    const core = fr.slice(lead.length, fr.length - trail.length);
    const t = tr(core);
    return t === core ? fr : lead + t + trail;
  }
  function translateTree(root) {
    if (!root) return;
    const doc = root.ownerDocument || root;
    const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */);
    let node;
    while ((node = walker.nextNode())) {
      const p = node.parentNode && node.parentNode.nodeName;
      if (p === 'SCRIPT' || p === 'STYLE') continue;
      const cur = node.nodeValue;
      let rec = textMemo.get(node);
      const fr = rec && rec.out === cur ? rec.fr : cur;
      const out = lang !== 'fr' ? wrapText(fr) : fr;
      if (out !== cur) node.nodeValue = out;
      textMemo.set(node, {fr, out});
    }
    const els = [];
    if (root.nodeType === 1) els.push(root);
    if (root.querySelectorAll) els.push(...root.querySelectorAll('[aria-label],[title],[placeholder],[alt]'));
    for (const el of els) {
      let memo = attrMemo.get(el); if (!memo) { memo = {}; attrMemo.set(el, memo); }
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const cur = el.getAttribute(a), rec = memo[a];
        const fr = rec && rec.out === cur ? rec.fr : cur;
        const out = lang !== 'fr' ? wrapText(fr) : fr;
        if (out !== cur) el.setAttribute(a, out);
        memo[a] = {fr, out};
      }
    }
    if (doc.documentElement && root === doc) doc.documentElement.lang = lang;
  }

  function defaultLang() {
    const ui = (global.chrome && chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || navigator.language || 'fr';
    return /^fr/i.test(ui) ? 'fr' : /^es/i.test(ui) ? 'es' : 'en';
  }
  function setLang(l) { lang = (l === 'en' || l === 'es') ? l : 'fr'; }
  async function load() {
    let l = null;
    try { const r = await chrome.storage.local.get(KEY); l = r && r[KEY]; } catch { /* stockage indisponible */ }
    setLang(l || defaultLang());
    return lang;
  }
  async function save(l) {
    setLang(l);
    try { await chrome.storage.local.set({[KEY]: lang}); } catch { /* sans effet */ }
    return lang;
  }
  function onChange(cb) {
    try {
      chrome.storage.onChanged.addListener((ch, area) => {
        if (area === 'local' && ch[KEY]) { setLang(ch[KEY].newValue); cb(lang); }
      });
    } catch { /* sans effet */ }
  }
  global.TQ_I18N = {tr, translateTree, load, save, onChange, setLang, get lang() { return lang; }, _exact: EXACT, _patterns: P};
})(typeof window !== 'undefined' ? window : globalThis);
