/*
 * Invitations des réactions Facebook — V2.25.0 (habillage graphique, fiabilité des délais, popup large, panneau amélioré).
 * Actions strictement locales dans l'onglet explicitement activé.
 * Aucune requête réseau, aucun profil ouvert, aucun contournement des limites Meta.
 * Le mode "Page entière" dépend de la structure HTML visible de Facebook.
 */
(() => {
  'use strict';
  const GLOBAL_KEY = '__fbReactionInviterExtensionV2';
  if (window[GLOBAL_KEY]) return;
  window[GLOBAL_KEY] = true;

  const state = {
    phase: 'idle', mode: 'manual', attempts: 0, confirmed: 0, verifying: false, scrolls: 0,
    posts: 0, skipped: 0, pollsSkipped: 0, securitySkipped: 0, inaccessible: 0, visibleUnrecognized: 0, noReactionEvidence: 0, failures: 0, historyCount: 0, opens: 0, feedScrolls: 0, current: '',
    detail: 'Choisis un mode dans l’extension.', delay: 2500, limit: 0,
    cancel: false, paused: false, pauseReason: '', runId: 0,
    workerActive: false, pageKey: '', pageInitialized: false, bootstrapScrolls: 0,
    batchLimit: 0, limitReached: false
  };
  let clickedElements = new WeakSet();
  let seenPosts = new Set();
  let historyPosts = new Set();
  // Repère temporaire de la publication choisie pendant le calibrage.
  // Il n'est ni sauvegardé ni réutilisé au lancement suivant.
  let initialPageAnchor = null;
  let temporaryHandles = new WeakMap();
  let nextTemporaryHandle = 0;
  let pendingRunId = 0;
  let overlay, line, stats, pauseButton, stopButton;
  // Fenêtre ouverte par le clic de réaction, parfois sans l'onglet « Toutes ».
  let lastReactionDialog = null;
  // Une fenêtre confirmée reste reconnue durant le défilement, même si React
  // virtualise momentanément les lignes de personnes.
  const trustedReactionDialogs = new WeakSet();
  // La publication n'est validée qu'après traitement ET fermeture de sa fenêtre.
  // En cas de pause/erreur, on conserve l'étape en cours pour « Reprendre ».
  let pendingPost = null;
  let failedPosts = new Set();
  let lastFailedReason = '';
  // Ces publications ne sont JAMAIS ajoutées à l'historique des publications terminées.
  // Un seul calibrage manuel par Page ; aucune image ni nom de personne stockés.
  let scanCalibration = null;
  let calibrationArmed = false;
  let calibrationListener = null;
  let pendingCalibrationStart = null;
  // Diagnostic de session seulement : aucune identité, photo, nom ni URL
  // de personne. Le repère de publication est haché localement.
  let diagnosisLog = [];
  const MAX_DIAGNOSES = 150;
  function anonymizePostKey(key) {
    let hash=2166136261;
    for (const c of String(key||'')) {
      hash^=c.charCodeAt(0);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(16).padStart(8,'0');
  }
  function logDiagnosis(category, key, reason, evidence='', extra=null) {
    diagnosisLog.push({time:new Date().toISOString(),category,post_ref:anonymizePostKey(key),reason,evidence,...(extra?{detail:extra}:{})});
    if (diagnosisLog.length>MAX_DIAGNOSES) diagnosisLog.shift();
  }

  // 2.24.9.6 : instantané ANONYMISÉ d'une publication problématique, joint au diagnostic de session.
  // Aucun nom ni texte libre : seuls des mots d'interface connus et des nombres sont conservés, le reste devient « X ».
  const SNAP_WORDS = new Set(('voir qui a ont réagi réagit à cette ce publication publications personne personnes autre autres et aime j’aime j\'aime adore j’adore solidaire haha wouah wow triste grr réaction réactions commentaire commentaires partage partages partager commenter envoyer fois vues vue toutes tous afficher masquer plus moins avec sur en pour par dans suivre inviter fermer menu actions options like love care angry sad laugh comment share comments shares people person other others and see who reacted this post all show more').split(/\s+/));
  const snapShape = v => {
    if (v==null) return null;
    const t=String(v).replace(/[\u200b-\u200f\u2060]/g,'').replace(/\s+/g,' ').trim();
    if (!t) return '';
    if (t.length>90) return `[texte ${t.length} car.]`;
    return t.split(' ').map(w=>{const c=w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'');
      return (!c || /^\d[\d\s.,]*[kKmM]?$/.test(c) || SNAP_WORDS.has(c.toLowerCase())) ? w : 'X';}).join(' ');
  };
  let snapshotsTaken = 0, lastClickInfo = null;
  function snapshotPost(post) {
    try {
      if (!post || !post.isConnected || snapshotsTaken>=4) return null;
      const pr=post.getBoundingClientRect(), lines=[];
      const attrsOf=el=>{
        const p=[];
        for (const a of ['role','aria-hidden','aria-expanded','tabindex']) if (el.hasAttribute(a)) p.push(`${a}="${el.getAttribute(a)}"`);
        for (const a of ['aria-label','alt','title']) if (el.hasAttribute(a)) p.push(`${a}="${snapShape(el.getAttribute(a))}"`);
        if (el.tagName==='A') p.push('lien');
        const r=el.getBoundingClientRect(); p.push(`@${Math.round(r.right-pr.right)},${Math.round(r.top-pr.top)},${Math.round(r.width)},${Math.round(r.height)}`);
        return p.join(' ');
      };
      const walk=(el,d)=>{
        if (lines.length>420) return;
        const r=el.getBoundingClientRect();
        if (r.bottom < pr.bottom-340 && d>0) return;           // seulement le bas de la publication
        const pad='  '.repeat(d), tag=el.tagName.toLowerCase();
        lines.push(`${pad}<${tag} ${attrsOf(el)}>`);
        if (['svg','video','canvas','img','input','path'].includes(tag)) return;
        let run=0,last='',skipped=0;
        for (const n of el.childNodes) {
          if (n.nodeType===3) { const t=snapShape(n.textContent); if (t) lines.push(`${pad}  "${t}"`); }
          else if (n.nodeType===1) {
            if (n.getAttribute('role')==='article') { lines.push(`${pad}  [commentaire omis]`); continue; }
            const sig=n.tagName+'|'+(n.getAttribute('role')||'')+'|'+n.childElementCount; run=sig===last?run+1:1; last=sig;
            if (run>3) { skipped++; continue; }
            if (skipped) { lines.push(`${pad}  [… ${skipped} similaire(s)]`); skipped=0; }
            walk(n,d+1);
          }
        }
        if (skipped) lines.push(`${pad}  [… ${skipped} similaire(s)]`);
      };
      walk(post,0); snapshotsTaken++;
      const cands=(()=>{try{return iconCandidates(post,false).slice(0,4).map(c=>({gap:Math.round(c.gap),y:Math.round(c.y-pr.top),score:Math.round(c.score),tag:c.icon.tagName.toLowerCase(),label:snapShape(reactionLabel(c.icon))}));}catch{return null;}})();
      return {post:{w:Math.round(pr.width),h:Math.round(pr.height),top:Math.round(pr.top),bottom_vs_viewport:Math.round(pr.bottom-innerHeight)},
        viewport:[innerWidth,innerHeight], scrollY:Math.round(scrollY), candidates:cands, last_click:lastClickInfo, structure:lines.join('\n')};
    } catch(e) { return {error:String(e&&e.message||e)}; }
  }

  // 2.24.9.6b : relevé du fil. Pour chaque publication visible à l'écran : retenue ou non par le parcours, et pourquoi.
  let feedScansLogged = 0;
  function logFeedScan(posts) {
    try {
      if (feedScansLogged>=14) return;
      const top=Array.from(document.querySelectorAll('main [role="article"],[role="main"] [role="article"]')).filter(el=>!el.parentElement?.closest('[role="article"]'));
      const items=top.map(el=>{
        const r=el.getBoundingClientRect();
        if (r.bottom<=0 || r.top>=innerHeight || r.height<60) return null;
        const collected=posts.some(p=>p===el||p.contains(el)||el.contains(p));
        let seen=null,opener=null,likely=null;
        try { likely=likelyPost(el); opener=!!findReactionOpener(el); seen=seenPosts.has(postHandle(el)); } catch {}
        return {top:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width),articles_imbriques:el.querySelectorAll('[role="article"]').length,
          collecte:collected,exact:posts.includes(el),probable:likely,indicateurs:postIndicators(el),bouton_trouve:opener,deja_vu:seen};
      }).filter(Boolean);
      feedScansLogged++;
      logDiagnosis('feed_scan','', 'etat_du_fil','',{collectes:posts.length,articles_visibles:items});
    } catch {}
  }
  function safeDiagnosisReport() {
    try { return diagnosisReport(); }
    catch (error) {
      let version=null; try { version=chrome.runtime.getManifest().version; } catch {}
      return {schema:'reaction-inviter-diagnostics-v1',version,
        erreur_generation_rapport:String(error&&error.message||error).slice(0,200),
        summary:{phase:state?.phase,mode:state?.mode,detail:String(state?.detail||'').slice(0,200),publications_finies:state?.posts,fenetres_ouvertes:state?.opens,clics_envoyes:state?.attempts,invitations_confirmees:state?.confirmed},
        events:(()=>{try{return diagnosisLog.slice(-40);}catch{return [];}})()};
    }
  }
  function diagnosisReport() {
    return {schema:'reaction-inviter-diagnostics-v1',version:chrome.runtime.getManifest().version,
      summary:{phase:state.phase,mode:state.mode,detail:String(state.detail||'').slice(0,200),
        publications_finies:state.posts,fenetres_ouvertes:state.opens,clics_envoyes:state.attempts,invitations_confirmees:state.confirmed,
        recontroles:state.skipped,defilements_liste:state.scrolls,defilements_fil:state.feedScrolls,non_ouvertes:state.failures,
        delai_ms:state.delay,plafond:state.limit,
        navigateur:(navigator.userAgent.match(/(?:Chrome|Edg|OPR)\/[\d.]+/)||[''])[0],langue_navigateur:navigator.language,langue_page:document.documentElement.lang||null,
        fenetre:[innerWidth,innerHeight],zoom:devicePixelRatio},
      counters:{visible_unrecognized:state.visibleUnrecognized,no_reaction_evidence:state.noReactionEvidence,
        security_skipped:state.securitySkipped,polls_skipped:state.pollsSkipped,unopened:state.failures},
      events:diagnosisLog.slice()};
  }



  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clean = s => String(s || '').replace(/[\u200b-\u200f\u2060]/g, '').replace(/\s+/g, ' ').trim();
  const btnText = el => clean(el?.innerText || el?.getAttribute?.('aria-label') || el?.textContent);
  const rect = el => el?.getBoundingClientRect?.();
  const own = () => ({ phase: state.phase, mode: state.mode, attempts: state.attempts,
    confirmed: state.confirmed, verifying: state.verifying, scrolls: state.scrolls, posts: state.posts,
    skipped: state.skipped, pollsSkipped: state.pollsSkipped, securitySkipped: state.securitySkipped, inaccessible: state.inaccessible, visibleUnrecognized: state.visibleUnrecognized, noReactionEvidence: state.noReactionEvidence, diagnosticCount: diagnosisLog.length, failures: state.failures, historyCount: state.historyCount, opens: state.opens, feedScrolls: state.feedScrolls,
    current: state.current, detail: state.detail, limit: state.limit, batchLimit: state.batchLimit,
    canContinue: state.phase === 'done' && state.mode === 'page' && state.limitReached && state.batchLimit > 0,
    pageKey: state.pageKey, calibrated: Boolean(scanCalibration), calibrationArmed });

  function inViewport(el) {
    if (!el?.isConnected) return false;
    const r = rect(el);
    if (!r || r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
    let p = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const style = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY + ' ' + style.overflowX)) {
        const box = rect(p);
        if (r.top >= box.bottom - 2 || r.bottom <= box.top + 2 || r.left >= box.right - 2 || r.right <= box.left + 2) return false;
      }
      p = p.parentElement;
    }
    return true;
  }
  function isActionable(el) {
    return !!el && el.getAttribute('aria-disabled') !== 'true' && !el.disabled && !el.closest('[data-fb-reactions-tool]');
  }
  const invite = el => /^(inviter|invite)$/i.test(btnText(el)) && isActionable(el);
  // Facebook affiche couramment « Invité(e) » avec parenthèses pour les
  // invitations déjà envoyées. Sans cette forme, une liste entièrement invitée
  // cesse d'être reconnue comme liste de réactions alors qu'elle est ouverte.
  const isReactionProfileStatus = value => /^(?:inviter|invite|invité(?:e|\(e\))?|déjà\s+invité(?:e|\(e\))?|suivi(?:e|\(e\))?|suivre|following|followed|already invited|invited)$/i.test(clean(value));
  const inviteButtons = root => root ? Array.from(root.querySelectorAll('button,[role="button"]')).filter(el => inViewport(el) && invite(el)) : [];

  function allTab(root) {
    if (!root) return null;
    const matches = Array.from(root.querySelectorAll('[role="tab"],button,[role="button"],[tabindex="0"],a,span,div'))
      .filter(el => inViewport(el) && /^(toutes|all)$/i.test(btnText(el)) &&
        !Array.from(el.children).some(child => /^(toutes|all)$/i.test(btnText(child))));
    for (const el of matches) {
      const actionable = el.closest('[role="tab"],button,[role="button"],[tabindex="0"],a');
      if (actionable && root.contains(actionable)) {
        // Un onglet Facebook peut être une ancre, mais ne doit jamais mener à un profil.
        if (actionable.closest('a[href]') && !actionable.getAttribute('role')?.includes('tab')) continue;
        return actionable;
      }
      if (el.parentElement && root.contains(el.parentElement)) return el.parentElement;
      return el;
    }
    return null;
  }
  function closeButton(root) {
    return root ? Array.from(root.querySelectorAll('button,[role="button"]')).find(el =>
      inViewport(el) && isActionable(el) && !el.closest('a[href]') &&
      /^(?:fermer|close|dismiss|quitter)$/i.test(clean(el.getAttribute('aria-label') || el.getAttribute('title') || btnText(el)))) : null;
  }
  // Une ancienne modale peut rester dans le DOM pendant l'animation de
  // fermeture. inViewport() seul ne suffit pas à dire qu'elle est à l'écran.
  // On rejette les ancêtres cachés et les modales qui ne sont plus au premier
  // plan à leurs coordonnées. Aucun clic n'est effectué par cette vérification.
  function visibleModalShell(el) {
    if (!el || !el.isConnected || !inViewport(el)) return false;
    for (let parent=el; parent; parent=parent.parentElement) {
      if (parent.hidden || parent.inert || parent.getAttribute?.('aria-hidden')==='true') return false;
      const css=getComputedStyle(parent);
      if (css.display==='none' || css.visibility==='hidden' || Number(css.opacity)<0.02) return false;
    }
    const r=rect(el);
    if (!r) return false;
    const closer=closeButton(el);
    const cr=closer && rect(closer);
    const points = cr ? [[cr.left+cr.width/2,cr.top+cr.height/2]] : [
      [Math.max(1,Math.min(innerWidth-2,r.left+r.width/2)), Math.max(1,Math.min(innerHeight-2,r.top+r.height/2))],
      [Math.max(1,Math.min(innerWidth-2,r.left+r.width/2)), Math.max(1,Math.min(innerHeight-2,r.top+Math.min(r.height*.2,90)))]
    ];
    return points.some(([x,y])=>{
      if (x<0 || y<0 || x>=innerWidth || y>=innerHeight) return false;
      const top=document.elementFromPoint(x,y);
      return top && (top===el || el.contains(top));
    });
  }
  function visibleModals() {
    return Array.from(new Set(document.querySelectorAll('[role="dialog"],[aria-modal="true"]')))
      .filter(el => !el.closest('[data-fb-reactions-tool]') && visibleModalShell(el));
  }
  // Plusieurs interfaces Facebook donnent au role=dialog la taille de TOUT
  // l'écran (fond gris compris) : ses icônes ne sont donc pas à root.top+130.
  // Le bouton Fermer, lui, est dans l'en-tête du panneau blanc.
  // Signature FORTE (vue sur la vraie fenêtre Facebook) : onglets role=tab dont l'aria-label
  // annonce « Afficher les N personnes qui ont réagi avec X ». Une fenêtre « Inviter des amis »
  // ou autre n'en a jamais.
  const REACTION_TAB_LABEL = /(?:afficher|voir|see|show)\s+(?:les\s+|all\s+)?\d[\d\s.,]*\s*(?:personnes?|people|person)\b.*(?:réagi|reacted)/i;
  function strongReactionTabs(root) {
    return Array.from(root.querySelectorAll('[role="tab"]')).filter(el => REACTION_TAB_LABEL.test(el.getAttribute('aria-label') || ''));
  }
  function announcedReactionTotal(root) {
    const t = strongReactionTabs(root).find(el => /(?:avec|with)\s+(?:toutes|all)\s*$/i.test(el.getAttribute('aria-label') || '')) || strongReactionTabs(root)[0];
    const m = t && /(\d[\d\s.,]*)/.exec(t.getAttribute('aria-label') || '');
    if (!m) return null;
    const n = parseInt(m[1].replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  }
  function singleReactionPanel(root) {
    if (!root) return false;
    const closer = closeButton(root);
    if (!closer) return false;
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')).filter(inViewport);
    if (tabs.length > 1 || allTab(root)) return false;
    // Onglet unique : ne prouve pas que ce sont des réactions.
    const cr = rect(closer);
    if (!cr) return false;
    const nearHeader = el => {
      const r = rect(el);
      return r && inViewport(el) && r.top >= cr.top - 90 && r.top <= cr.bottom + 90 &&
        r.left < cr.left + 25 && r.width < 170 && r.height < 62;
    };
    const topNumbers = Array.from(root.querySelectorAll('span,div,button,[role="button"]'))
      .filter(el => nearHeader(el) && bareNumber.test(clean(el.innerText || '')));
    const headerIcons = Array.from(root.querySelectorAll('img,svg,[role="img"],span[aria-label]'))
      .filter(el => {
        const r=rect(el);
        return nearHeader(el) && r.width>=10 && r.width<=45 && r.height>=10 && r.height<=45;
      });
    const profileStatus = Array.from(root.querySelectorAll('button,[role="button"]')).some(el => {
      const name=clean(el.innerText || el.getAttribute('aria-label'));
      return inViewport(el) && isReactionProfileStatus(name);
    });
    // Le statut Suivi(e) est un indice très fort d'une liste de personnes.
    // Sans lui, imposer un compteur ET un pictogramme à hauteur du Fermer.
    const clearHeader = (topNumbers.length>0 && headerIcons.some(el=>reactionNames.test(reactionLabel(el))));
    // 2.24.6 : un statut « Inviter » ou des avatars sous l'en-tête ne suffisent plus.
    // Il faut un onglet annonçant des réactions, ou un compteur ET une icône NOMMÉE.
    // 2.24.7 : catégorie unique SANS onglet. En-tête = uniquement un compteur et une icône,
    // aucun titre en texte (les fenêtres étrangères ont un titre), bouton Inviter + avatars en dessous.
    const band = el => { const r=rect(el); return r && inViewport(el) && r.top >= cr.top-40 && r.top <= cr.bottom+8 && r.left < cr.left-10; };
    const bandTexts = Array.from(root.querySelectorAll('span,div,a,h1,h2,h3,button,[role="button"]'))
      .filter(el => band(el) && el!==closer && !closer.contains(el) && !el.querySelector('span,div,a,h1,h2,h3,button,[role="button"]'))
      .map(el => clean(el.innerText||'')).filter(Boolean);
    const bandIcons = Array.from(root.querySelectorAll('img,svg,[role="img"]')).filter(el => {
      const r=rect(el); return band(el) && !closer.contains(el) && r.width>=10 && r.width<=45 && r.height>=10 && r.height<=45; });
    const untitledHeader = tabs.length===0 && bandTexts.length>0 && bandTexts.length<=2 &&
      bandTexts.every(t => bareNumber.test(t)) && bandIcons.length>0;
    return (profileStatus || (clearHeader && reactionProfileRows(root))) &&
      (strongReactionTabs(root).length>0 || clearHeader || (untitledHeader && profileStatus && reactionProfileRows(root)));
  }
  // Une fenêtre « Toutes » peut contenir uniquement des noms et des avatars,
  // sans AUCUN bouton Inviter / Invité(e) / Suivi(e). Elle doit rester traitable.
  // On utilise la signature POSITIVE de l'en-tête des réactions ET des lignes
  // de personnes, sans prendre un autre dialogue Facebook pour une liste.
  function reactionHeaderSignature(root, requireAll=true) {
    const close=closeButton(root), cr=close && rect(close);
    if (!cr || (requireAll && !allTab(root))) return false;
    const head = el => {
      const r=rect(el);
      return r && inViewport(el) && r.top >= cr.top - 72 && r.bottom <= cr.bottom + 94 &&
        r.left < cr.left - 16 && r.width <= 240 && r.height <= 74;
    };
    const headerTabs=Array.from(root.querySelectorAll('[role="tab"]')).filter(head);
    const all=allTab(root);
    if (requireAll && (!all || !head(all))) return false;
    const namedIcons=Array.from(root.querySelectorAll('img,svg,[role="img"],span[aria-label]'))
      .filter(el => {
        const r=rect(el);
        return head(el) && r.width>=10 && r.width<=45 && r.height>=10 && r.height<=45 &&
          reactionNames.test(reactionLabel(el));
      });
    const numberNodes=Array.from(root.querySelectorAll('span,div,button,[role="tab"]'))
      .filter(el => head(el) && /^\d+(?:[\s.,]\d+)*\s*[kKmM]?$/.test(clean(el.innerText||'')));
    const categoryTabs=headerTabs.filter(tab => tab !== all && !/^(toutes|all)$/i.test(btnText(tab)));
    const namedCategory=categoryTabs.some(tab => {
      const label=normalizedReactionLabel(btnText(tab));
      return /^(?:j'aime|j'adore|haha|wouah|grr+|triste|solidaire|like|love|angry|sad|wow|care|laugh)(?:\s+\d+[\d\s.,kKmM]*)?$/.test(label) ||
        Array.from(tab.querySelectorAll('img,svg,[role="img"]')).some(el=>reactionNames.test(reactionLabel(el)));
    });
    // La présence d'un vrai onglet de catégorie est le signal le plus fort.
    // Si Facebook utilise des div plutôt que role=tab, exiger simultanément
    // une icône NOMMÉE et un nombre dans l'en-tête.
    return (namedCategory && (namedIcons.length>0 || /\d/.test(categoryTabs.map(btnText).join(' ')))) ||
      (namedIcons.length>0 && numberNodes.length>0 && (requireAll || !all));
  }
  function reactionProfileRows(root) {
    const closer=closeButton(root), cr=closer && rect(closer);
    if (!cr) return false;
    // Chercher de petites photos de personnes SOUS l'en-tête (pas les emojis),
    // à gauche du bouton Fermer. Aucun lien de profil n'est activé.
    const avatars=Array.from(root.querySelectorAll('img,svg,[role="img"],picture'))
      .filter(el=>{
        const r=rect(el);
        return r && inViewport(el) && r.width>=27 && r.width<=90 && r.height>=27 && r.height<=90 &&
          r.top>cr.bottom+7 && r.left<cr.left-70;
      });
    // Deux lignes identifiables évitent de valider un panneau étranger.
    if (avatars.length>=2) return true;
    if (avatars.length===1) {
      const avatar=avatars[0];
      const area=avatar.closest('a,[role="listitem"],li') || avatar.parentElement?.parentElement;
      const name=clean(area?.innerText||'');
      return name.length>=3 && name.length<180 && /\p{L}/u.test(name);
    }
    return false;
  }
  // La présence d'une modale et d'un bouton Fermer ne prouve RIEN : badges,
  // photos et menus sont aussi des fenêtres Facebook.
  function isConfirmedReactionDialog(root) {
    if (!root || !inViewport(root) || !closeButton(root)) return false;
    if (singleReactionPanel(root)) {
      trustedReactionDialogs.add(root);
      return true;
    }
    const tab=allTab(root);
    const statuses=Array.from(root.querySelectorAll('button,[role="button"]'))
      .filter(inViewport).some(el=>isReactionProfileStatus(btnText(el)));
    if (tab && statuses) {
      const categoryEvidence=reactionHeaderSignature(root,true);
      const otherTabs=Array.from(root.querySelectorAll('[role="tab"],button,[role="button"]'))
        .filter(inViewport).filter(el=>el!==tab && (
          reactionNames.test(normalizedReactionLabel(btnText(el))) ||
          /^[\d\s,.kKmM]+$/.test(btnText(el)) && el.closest('[role="tab"]')));
      // 2.24.6 : un onglet numérique quelconque ou une icône « J'aime » décorative ne prouvent rien.
      if (strongReactionTabs(root).length>0 || categoryEvidence) {
        trustedReactionDialogs.add(root);
        return true;
      }
    }
    // Cas confirmé par l'utilisateur : fenêtres « Toutes » avec des noms et
    // avatars mais aucune commande de statut, même grisée.
    if (tab && reactionHeaderSignature(root,true) &&
        (reactionProfileRows(root) || trustedReactionDialogs.has(root))) {
      trustedReactionDialogs.add(root);
      return true;
    }
    // Au cours du défilement React peut virtualiser les photos des profils ;
    // conserver la fenêtre déjà vérifiée tant que son en-tête reste cohérent.
    if (trustedReactionDialogs.has(root) && reactionHeaderSignature(root,!!tab)) return true;
    return false;
  }
  function reactionDialog() {
    // Après un scroll Facebook peut virtualiser les lignes et enlever
    // temporairement les onglets / statuts. Un dialogue dont la signature a
    // déjà été VÉRIFIÉE garde son identité tant qu'il est réellement visible.
    // Il faut le retrouver pour le fermer, même si aucun bouton Inviter ne reste.
    if (lastReactionDialog && visibleModalShell(lastReactionDialog) &&
        trustedReactionDialogs.has(lastReactionDialog) && closeButton(lastReactionDialog) &&
        !foreignModalHint.test((lastReactionDialog.innerText||'').slice(0,1500))) {
      return lastReactionDialog;
    }
    // Ne pas effacer prématurément un panneau confirmé encore visible. Une
    // modale totalement remplacée sera réévaluée avec les signatures normales.
    const prior=lastReactionDialog;
    const dialogs = visibleModals().filter(isConfirmedReactionDialog);
    const leaves=dialogs.filter(el=>!dialogs.some(other=>other!==el && el.contains(other)));
    if (leaves.length === 1) { lastReactionDialog=leaves[0]; return lastReactionDialog; }
    if (!prior || !visibleModalShell(prior)) lastReactionDialog=null;
    return null;
  }
  function newlyOpenedReactionDialog(previousModals) {
    const dialogs = visibleModals().filter(el => !previousModals.has(el));
    // REFUS de toute modale non positivement identifiee comme liste de reactions.
    if (dialogs.length !== 1 || !isConfirmedReactionDialog(dialogs[0])) return null;
    lastReactionDialog=dialogs[0];
    return lastReactionDialog;
  }
  function findScrollable(root) {
    if (!root) return null;
    return [root,...root.querySelectorAll('*')].filter(el => {
      if (!inViewport(el) || el.clientHeight < 70 || el.scrollHeight - el.clientHeight < 20) return false;
      return /auto|scroll/.test(getComputedStyle(el).overflowY);
    }).map(el => ({el, score: (inviteButtons(el).length ? 10000 : 0) +
      Math.min(el.scrollHeight - el.clientHeight,10000) + (rect(el).width < 850 ? 1000 : 0)}))
      .sort((a,b) => b.score - a.score)[0]?.el || null;
  }
  const restriction = str => /(?:trop d['’]invitations|limite d['’]invitations|réessayez plus tard|vous avez atteint (?:la|votre) limite|too many invites|too many invitations|try again later|temporarily blocked|action (?:bloquée|blocked)|vous ne pouvez pas (?:envoyer|inviter))/i.test(clean(str));
  function blockedByFacebook(root) {
    if (restriction((root?.innerText || '').slice(0, 25000))) return true;
    return Array.from(document.querySelectorAll('[role="alert"],[aria-live="assertive"],[role="alertdialog"]'))
      .filter(inViewport).some(el => restriction((el.innerText || '').slice(0, 4000)));
  }

  function installOverlay() {
    if (overlay?.isConnected) return;
    overlay = document.createElement('div');
    overlay.setAttribute('data-fb-reactions-tool', '');
    overlay.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;pointer-events:auto;';
    const shadow = overlay.attachShadow({mode:'open'});
    shadow.innerHTML = `<style>
      /* Composant isolé par Shadow DOM : aucune règle ne cible Facebook.
         Jetons communs avec popup.css (système TQIDr Labs). */
      :host{--tq-font:"Segoe UI Variable Text","Segoe UI Variable","Segoe UI",system-ui,-apple-system,sans-serif;
        --tq-deep:#102a33;--tq-deep-2:#174246;--tq-teal:#075954;--tq-green:#245e57;
        --tq-accent:#18a999;--tq-accent-light:#92dfd2;--tq-ink-light:#eef8f4;--tq-muted-light:#c9dfdb;
        --tq-line-light:rgba(146,223,210,.22);--tq-warn:#f1bc73;--tq-warn-ink:#ffe2b9;
        font-family:var(--tq-font)}
      *{box-sizing:border-box}
      section{width:360px;max-width:calc(100vw - 24px);max-height:calc(100vh - 28px);overflow:auto;
        color:var(--tq-ink-light);border:1px solid #41676a;border-radius:14px;
        background:linear-gradient(155deg,var(--tq-deep) 0%,#14343a 72%,#16433d 100%);
        box-shadow:0 14px 35px rgba(0,0,0,.28);font:12px/1.45 var(--tq-font);
        scrollbar-width:thin;scrollbar-color:#537c7b transparent}
      .top{display:flex;align-items:center;gap:10px;padding:10px 11px 9px 12px;cursor:grab;
        touch-action:none;user-select:none;border-radius:13px 13px 0 0;
        background:linear-gradient(118deg,var(--tq-deep) 0%,var(--tq-deep-2) 65%,var(--tq-teal) 100%);
        border-bottom:3px solid var(--tq-accent)}
      .top.dragging{cursor:grabbing}
      .logo{flex:0 0 30px;width:30px;height:30px;object-fit:cover;border-radius:8px;
        border:1px solid rgba(140,213,205,.28);background:#050909}
      .titles{min-width:0;flex:1}
      .brand{margin:0 0 1px;font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--tq-accent-light)}
      h2{margin:0;font-size:14px;color:#f7fffd;font-weight:750;line-height:1.2}
      .modeLine{margin:1px 0 0;color:#bcd9d3;font-size:11px;font-weight:500}
      .miniCount{margin:2px 0 0;font-size:11px;color:var(--tq-muted-light);display:none}
      section.collapsed .miniCount{display:block}
      .phase{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:4px 9px;
        color:#c8f4e8;background:#24514d;border:1px solid #447e74;border-radius:999px;
        font-size:11px;font-weight:750}
      .phase::before{content:"";width:7px;height:7px;background:var(--tq-accent-light);border-radius:50%}
      section[data-phase="running"] .phase::before{animation:tqPulse 1.4s ease-in-out infinite}
      @keyframes tqPulse{50%{opacity:.35;transform:scale(.75)}}
      section[data-phase="paused"] .phase,section[data-phase="error"] .phase,
      section[data-phase="stopped"] .phase,section[data-phase="calibrating"] .phase{
        background:#493e39;color:var(--tq-warn-ink);border-color:#826b53}
      section[data-phase="paused"] .phase::before,section[data-phase="error"] .phase::before,
      section[data-phase="stopped"] .phase::before,section[data-phase="calibrating"] .phase::before{background:var(--tq-warn)}
      .fold{flex:0 0 28px;width:28px;min-width:28px;height:28px;min-height:28px;padding:0;flex:none;
        font-size:16px;line-height:1;border-radius:8px;background:rgba(5,30,34,.35);border-color:#58837e}
      .body{padding:12px 14px 13px}
      #line{margin:0 0 8px;color:#dcebe8;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
      .tech{margin:0 0 10px;color:#a9c5c0;font-size:10.5px;line-height:1.45;overflow-wrap:anywhere}
      .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 10px}
      .metric{min-width:0;min-height:60px;border:1px solid #41666a;border-radius:9px;
        background:rgba(5,30,34,.22);padding:8px 8px}
      .metric.warn{border-color:#826b53;background:rgba(101,72,36,.2)}
      .value{display:block;color:#f6fffc;font-size:20px;font-weight:800;line-height:1.2;
        font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
      .of{font-size:12px;font-weight:650;color:var(--tq-muted-light)}
      .metric-label{display:block;color:var(--tq-muted-light);font-size:11px;line-height:1.2;margin-top:3px}
      .progress{margin:0 0 10px}
      .progressRow{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--tq-muted-light);margin-bottom:4px}
      .bar{height:6px;border-radius:999px;background:rgba(5,30,34,.45);border:1px solid #41666a;overflow:hidden}
      .bar span{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--tq-green),var(--tq-accent));transition:width .3s ease}
      .controls{display:flex;gap:8px;margin-bottom:0}
      button{min-width:0;flex:1;cursor:pointer;padding:9px 9px;min-height:38px;
        border:1px solid #58837e;border-radius:9px;background:var(--tq-green);
        font:700 12px/1.25 var(--tq-font);color:#fff;overflow-wrap:anywhere}
      .controls button:last-child{color:#ffd9dc;background:#3c2a30;border-color:#79565d}
      button:disabled{opacity:.48;cursor:not-allowed}
      button:hover:not(:disabled){filter:brightness(1.15)}
      button:focus-visible{outline:3px solid var(--tq-accent-light);outline-offset:2px}
      small{display:block;margin:10px 0 0;padding-top:9px;border-top:1px solid rgba(158,219,208,.15);
        color:#c5d8d5;font-size:11px;line-height:1.55;overflow-wrap:anywhere}
      .dailyAdvice{font-size:11px;line-height:1.5;color:#f8deb9;border:1px solid #8c714e;
        background:rgba(101,72,36,.2);padding:10px;border-radius:9px;margin:0 0 10px}
      section.collapsed .extra{display:none}
      section.collapsed .body{padding-top:10px}
      [hidden]{display:none!important}
      @media(prefers-reduced-motion:reduce){button,.bar span{transition:none}
        section[data-phase="running"] .phase::before{animation:none}}
    </style><section data-phase="idle" aria-label="Suivi des invitations Facebook">
      <div class="top" id="grip" title="Glisse pour déplacer le panneau">
        <img class="logo" id="logo" alt="" width="30" height="30" src="data:image/png;base64,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">
        <div class="titles"><p class="brand">TQIDr Labs</p>
          <h2>Invitations réactions</h2><p class="modeLine" id="mode"></p>
          <p class="miniCount" id="miniCount"></p></div>
        <span class="phase" id="phase">Prêt</span>
        <button class="fold" id="fold" type="button" aria-expanded="true" aria-label="Réduire le panneau" title="Réduire / agrandir">–</button>
      </div>
      <div class="body">
        <div class="extra">
          <p id="line" aria-live="polite"></p>
          <p class="tech" id="tech" hidden></p>
          <div class="metrics" aria-label="Indicateurs de la session">
            <div class="metric"><span class="value" id="mConfirmed">0</span><span class="metric-label">Confirmées</span></div>
            <div class="metric"><span class="value"><span id="mClicks">0</span><span class="of" id="mClicksOf"></span></span><span class="metric-label">Clics envoyés</span></div>
            <div class="metric" id="mReviewBox" title="Clics sans confirmation visuelle et publications dont la fenêtre n’a pas pu s’ouvrir."><span class="value" id="mReview">0</span><span class="metric-label">À revoir</span></div>
          </div>
          <div class="progress" id="progressWrap" hidden>
            <div class="progressRow"><span>Plafond d’invitations</span><span id="progressText"></span></div>
            <div class="bar" id="bar" role="progressbar" aria-label="Progression vers le plafond d’invitations" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="barFill"></span></div>
          </div>
          <p id="dailyAdvice" class="dailyAdvice" hidden><strong>Conseil de prudence :</strong> limite de préférence les invitations à <strong>1 000 par jour</strong> pour réduire le risque de restriction temporaire par Facebook. Ce seuil n'est pas officiellement garanti. <strong>Tu peux choisir de poursuivre</strong> avec « Reprendre » : une confirmation sera demandée avant prolongation.</p>
        </div>
        <div class="controls"><button id="pause" type="button">Pause</button>
        <button id="stop" type="button">Arrêter</button></div>
        <small class="extra" id="stats" hidden></small>
      </div></section>`;
    line = shadow.getElementById('line'); stats = shadow.getElementById('stats');
    pauseButton = shadow.getElementById('pause'); stopButton = shadow.getElementById('stop');
    // Le logo est embarqué (aucune ressource web exposée) ; s'il est bloqué, on le masque.
    shadow.getElementById('logo').addEventListener('error', event => { event.target.hidden = true; });
    pauseButton.addEventListener('click', () => {
      if (state.phase === 'done' && state.limitReached) {
        const nextLimit = state.limit + state.batchLimit;
        if (nextLimit <= 1000 || window.confirm(`Conseil de prudence : nous recommandons de limiter les invitations à 1 000 par jour pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif, non officiellement garanti.\n\nCette reprise porterait le plafond cumulé à ${nextLimit.toLocaleString('fr-FR')} invitations. Tu restes libre de poursuivre. Souhaites-tu continuer sans remonter la Page ?`)) continueAfterLimit();
      } else if (state.phase === 'paused') resume();
      else pause();
    });
    stopButton.addEventListener('click', stop);
    // Affichage uniquement : réduire / agrandir et déplacer le panneau.
    const panelRoot = shadow.querySelector('section'), foldButton = shadow.getElementById('fold');
    foldButton.addEventListener('click', () => {
      const collapsed = panelRoot.classList.toggle('collapsed');
      foldButton.textContent = collapsed ? '+' : '–';
      foldButton.setAttribute('aria-expanded', String(!collapsed));
      foldButton.setAttribute('aria-label', collapsed ? 'Agrandir le panneau' : 'Réduire le panneau');
    });
    const grip = shadow.getElementById('grip');
    let drag = null;
    grip.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const box = overlay.getBoundingClientRect();
      drag = {dx: event.clientX - box.left, dy: event.clientY - box.top, w: box.width};
      grip.setPointerCapture(event.pointerId); grip.classList.add('dragging');
    });
    grip.addEventListener('pointermove', event => {
      if (!drag) return;
      const x = Math.max(0, Math.min(innerWidth - drag.w, event.clientX - drag.dx));
      const y = Math.max(0, Math.min(innerHeight - 48, event.clientY - drag.dy));
      Object.assign(overlay.style, {left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto'});
    });
    const endDrag = event => {
      if (!drag) return;
      drag = null; grip.classList.remove('dragging');
      try { grip.releasePointerCapture(event.pointerId); } catch { /* déjà relâché */ }
    };
    grip.addEventListener('pointerup', endDrag); grip.addEventListener('pointercancel', endDrag);
    document.documentElement.appendChild(overlay);
    renderOverlay();
  }
  function renderOverlay() {
    if (!overlay?.isConnected) return;
    const panel = overlay.shadowRoot, $ = id => panel.getElementById(id);
    line.textContent = state.detail;
    const tech = state.phase === 'paused' && state.pauseReason ? state.pauseReason : '';
    $('tech').textContent = tech ? `Détail technique : ${tech}` : '';
    $('tech').hidden = !tech;
    $('mode').textContent = calibrationArmed ? 'Mode calibrage' : (state.mode === 'page' ? 'Mode Page entière' : 'Mode manuel');
    const c = state.confirmed;
    // Valeurs d'affichage uniquement ; l'état de l'automatisation est inchangé.
    const unconfirmed = state.verifying ? 0 : Math.max(0, state.attempts - c);
    const review = unconfirmed + (state.mode === 'page' ? state.failures : 0);
    const phaseLabels = {idle:'Prêt',calibrating:'Calibrage',running:'En cours',paused:'En pause',done:'Terminé',stopped:'Arrêté',error:'Erreur'};
    panel.querySelector('section').dataset.phase = state.phase;
    $('phase').textContent = phaseLabels[state.phase] || 'Prêt';
    $('mConfirmed').textContent = c.toLocaleString('fr-FR');
    $('mClicks').textContent = state.attempts.toLocaleString('fr-FR');
    $('mClicksOf').textContent = state.limit > 0 ? ` / ${state.limit.toLocaleString('fr-FR')}` : '';
    $('mReview').textContent = review.toLocaleString('fr-FR');
    $('mReviewBox').classList.toggle('warn', review > 0);
    const hasLimit = state.limit > 0;
    $('progressWrap').hidden = !hasLimit;
    if (hasLimit) {
      const percent = Math.max(0, Math.min(100, Math.round(state.attempts / state.limit * 100)));
      $('barFill').style.width = percent + '%';
      $('bar').setAttribute('aria-valuenow', String(percent));
      $('progressText').textContent = `${state.attempts.toLocaleString('fr-FR')} / ${state.limit.toLocaleString('fr-FR')} · ${percent} %`;
    }
    $('miniCount').textContent = `${c.toLocaleString('fr-FR')} confirmée${c === 1 ? '' : 's'} · ${state.attempts.toLocaleString('fr-FR')} clic${state.attempts === 1 ? '' : 's'}`;
    // Détail secondaire seulement (le mode manuel n'en a pas : pas de doublon avec les chiffres ci-dessus).
    const detailText = state.mode === 'page'
      ? `${state.posts} publication(s) finie(s) · ${state.opens} fenêtre(s) ouverte(s) · ${state.visibleUnrecognized} indices visibles non reconnus · ${state.noReactionEvidence} sans indice détecté · ${state.securitySkipped} ignorée(s) par sécurité · ${state.failures} non ouverte(s)`
      : '';
    stats.textContent = detailText; stats.hidden = !detailText;
    const active = state.phase === 'running' || state.phase === 'paused';
    const canContinue = state.phase === 'done' && state.mode === 'page' && state.limitReached && state.batchLimit > 0;
    $('dailyAdvice').hidden = !(canContinue && state.limit + state.batchLimit > 1000);
    pauseButton.disabled = !active && !canContinue;
    pauseButton.textContent = canContinue ? `Reprendre (+${state.batchLimit.toLocaleString('fr-FR')})` : state.phase === 'paused' ? 'Reprendre' : 'Pause';
    stopButton.disabled = !(active || state.phase === 'calibrating');
  }
  function update(phase, detail) { state.phase = phase; state.detail = detail; renderOverlay(); }
  function pause() {
    if (state.phase === 'running') { state.paused = true; state.pauseReason = ''; update('paused','En pause. Clique sur Reprendre pour continuer.'); }
    return own();
  }
  function resume() {
    if (state.phase !== 'paused') return own();
    state.paused = false; state.pauseReason = '';
    update('running', 'Reprise du traitement…');
    if (!state.workerActive) launchWorker(state.runId);
    return own();
  }
  // Reprise spécifique au plafond : ne réinitialise NI le défilement du fil,
  // NI la publication/la modale en cours, NI les publications déjà vues.
  // Chaque clic sur Reprendre ajoute exactement le même quota de clics.
  function continueAfterLimit() {
    if (state.phase !== 'done' || state.mode !== 'page' || !state.limitReached || state.batchLimit <= 0) return own();
    if (pageKeyFromLocation() !== state.pageKey) {
      update('error','La Page Facebook a changé. Reviens sur la Page de départ ; cette reprise sans rescannage nécessite le même onglet non actualisé.');
      return own();
    }
    const next = state.limit + state.batchLimit;
    if (!Number.isSafeInteger(next)) {
      update('error','Trop de clics cumulés : plafond numérique dépassé.');
      return own();
    }
    // Un document réactualisé a perdu cet état JS : le bouton n'y est plus
    // proposé. Sur le même document, pendingPost et seenPosts sont conservés.
    state.limit = next;
    state.limitReached = false;
    state.paused = false; state.cancel = false; state.pauseReason = '';
    const id = ++state.runId;
    update('running',`Reprise à la position actuelle, sans remonter la Page. Nouveau plafond cumulé : ${next.toLocaleString('fr-FR')} clics.`);
    launchWorker(id);
    return own();
  }
  function stop() {
    if (calibrationArmed || state.phase === 'calibrating') {
      clearCalibrationListeners();
      pendingCalibrationStart=null;
      state.cancel=true; state.paused=false; ++state.runId;
      update('stopped','Calibrage annulé. Aucune action effectuée sur Facebook.');
      return own();
    }
    if (['running','paused'].includes(state.phase)) {
      state.cancel = true; state.paused = false; ++state.runId;
      update('stopped', `Arrêt manuel : ${state.posts} publication(s) terminée(s).`);
    }
    return own();
  }
  async function checkPause(id) {
    while (state.paused && !state.cancel && id === state.runId) await sleep(150);
    return !state.cancel && id === state.runId;
  }
  async function wait(id, ms) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (!(await checkPause(id))) return false;
      await sleep(Math.min(170, until - Date.now()));
    }
    return await checkPause(id);
  }
  async function waitForChange(button,id) {
    for (let n=0; n<27; n++) { // ~4 s (2.24.2 ; 1,8 s déclenchait des pauses sur connexion lente)
      if (!(await checkPause(id))) return false;
      if (!button.isConnected || !invite(button)) return true;
      await sleep(150);
    }
    return !button.isConnected || !invite(button);
  }

  // La routine V1 est conservée pour le mode manuel, et réutilisée sur chaque publication.
  // 2.24.6 : écart entre le total annoncé par l'onglet « Toutes » et les personnes réellement vues.
  let lastListNote = '', shortfallPosts = 0;
  const END_IDLE_SCROLLS = 5, END_IDLE_SCROLLS_SHORT = 18;   // ~5 s normal, ~16 s si la liste semble incomplète
  async function processList(id) {
    lastListNote = '';
    const rowsSeen = new WeakSet(); let seenCount = 0;
    const countRows = (sc) => {
      if (!sc) return;
      for (const row of sc.querySelectorAll('[data-visualcompletion="ignore-dynamic"]')) {
        if (rowsSeen.has(row) || !row.querySelector('a[role="link"],a[href]')) continue;
        rowsSeen.add(row); seenCount++;
      }
    };
    let root = reactionDialog();
    if (!root) throw new Error('Fenêtre de réactions introuvable.');
    update('running',`${state.current || 'Publication'} : étape 2/2, onglet « Toutes »…`);
    const tab = allTab(root);
    if (tab) {
      if (tab.getAttribute('aria-selected') !== 'true') {
        tab.click();
        if (!(await wait(id, 950))) return 'cancelled';
      }
    } else {
      // Une seule catégorie : Facebook n'affiche parfois aucun onglet « Toutes ».
      // Ne pas accepter silencieusement un dialogue à plusieurs onglets.
      const otherTabs = Array.from(root.querySelectorAll('[role="tab"]')).filter(inViewport);
      if (otherTabs.length>1 || !singleReactionPanel(root)) throw new Error('Fenêtre ouverte, mais impossible de confirmer que toutes les réactions sont affichées : pause de sécurité.');
      update('running',`${state.current || 'Publication'} : une seule catégorie de réaction, pas d’onglet « Toutes ».`);
    }
    root = reactionDialog();
    if (!root) {
      for (let settle=0;settle<8 && !root;settle++) {
        if (!(await wait(id,160))) return 'cancelled';
        root=reactionDialog();
      }
    }
    if (!root) throw new Error('Fenêtre non reconnue après sélection de « Toutes ». Aucun autre clic tenté.');
    let scroller = findScrollable(root) || root;
    let idleScrolls = 0, withoutConfirmation = 0, loops = 0;
    while (await checkPause(id)) {
      if (++loops > 50000) throw new Error('Arrêt de sécurité : trop d’itérations.');
      if (!visibleModalShell(root)) {
        const replacement=reactionDialog();
        if (replacement) { root=replacement; scroller=findScrollable(root)||root; }
        else throw new Error('Fenêtre de réactions non visible pendant le traitement. Vérifie-la avant de reprendre.');
      }
      if (blockedByFacebook(root)) throw new Error('Facebook semble limiter les invitations. Vérifie l’écran avant de reprendre.');
      if (state.limit > 0 && state.attempts >= state.limit) return 'limit';
      countRows(scroller);
      const found = inviteButtons(scroller).filter(el => !clickedElements.has(el));
      if (found.length) {
        const button = found[0];
        clickedElements.add(button);
        if (!inViewport(button)) continue;
        // Clic exclusivement sur un bouton « Inviter » dans la fenêtre de réactions.
        button.click();
        state.attempts += 1;
        state.verifying = true;
        update('running', 'Vérification de l’invitation en cours…');
        let changed;
        try { changed = await waitForChange(button,id); }
        finally { state.verifying = false; }
        if (!(await checkPause(id))) return 'cancelled';
        if (changed) { state.confirmed++; withoutConfirmation = 0; }
        else if (++withoutConfirmation >= 3) throw new Error('Trois clics sans confirmation visuelle : pause de sécurité.');
        update('running', changed ? 'Invitation confirmée. Traitement en cours…' : 'Clic sans confirmation visuelle. Traitement sous surveillance…');
        if (!(await wait(id,state.delay))) return 'cancelled';
        continue;
      }
      const candidate = findScrollable(root);
      if (scroller === root && !candidate) return 'complete';
      if (candidate && candidate !== scroller) scroller = candidate;
      const before = scroller.scrollTop, heightBefore = scroller.scrollHeight;
      scroller.scrollTop += Math.max(170,Math.round(scroller.clientHeight*.78));
      scroller.dispatchEvent(new Event('scroll',{bubbles:true}));
      state.scrolls++;
      if (!(await wait(id,850))) return 'cancelled';
      const after = scroller.scrollTop;
      idleScrolls = (Math.abs(after-before) < 2 && scroller.scrollHeight <= heightBefore + 2) ? idleScrolls+1 : 0;
      update('running','Recherche dans les réactions…');
      countRows(scroller);
      if (idleScrolls >= END_IDLE_SCROLLS) {
        const total = announcedReactionTotal(root);
        const short = total != null && seenCount < total;
        if (!short) return 'complete';
        if (idleScrolls >= END_IDLE_SCROLLS_SHORT) {
          lastListNote = `${seenCount} personne(s) vue(s) sur ${total} annoncée(s) : Facebook n’a pas chargé le reste de la liste (ou certaines lignes n’ont pas de bouton Inviter).`;
          shortfallPosts++;
          return 'complete';
        }
        update('running', `Fin de liste apparente : ${seenCount} personne(s) vue(s) sur ${total} annoncée(s), attente de Facebook…`);
      }
      if (!scroller.isConnected) {
        root = reactionDialog(); scroller = findScrollable(root);
        if (!scroller) throw new Error('Zone de défilement des réactions perdue.');
      }
    }
    return 'cancelled';
  }

  function pageKeyFromLocation() {
    const url = new URL(location.href);
    if (!/^(?:www|web|m)\.facebook\.com$/i.test(url.hostname)) return null;
    const path = url.pathname.replace(/\/+$/,'');
    if (!path || path === '/' || /^\/(?:groups|watch|marketplace|friends|gaming|reel|reels|events|notifications|messages|search|settings|home|pages\/feed)(?:\/|$)/i.test(path)) return null;
    if (/^\/profile\.php$/i.test(path)) {
      const id = url.searchParams.get('id'); return id ? `profile:${id}` : null;
    }
    if (/^\/pages\//i.test(path)) {
      const parts = path.split('/').filter(Boolean);
      return parts.length >= 3 ? `pages:${parts[2]}` : null;
    }
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 1) return null;
    return `page:${segments[0].toLowerCase()}`;
  }
  const historyStoreKey = pageKey => `fbReactionsInviter.v2.done:${pageKey}`;
  // 2.24.11 : plus AUCUNE mémorisation des publications. Une ancienne liste enregistrée par une version
  // précédente est effacée au lancement ; markCompleted() n'écrit plus rien.
  async function loadHistory() {
    historyPosts = new Set(); state.historyCount = 0;
    try { await chrome.storage.local.remove(historyStoreKey(state.pageKey)); } catch {}
  }
  async function markCompleted() { /* volontairement vide : aucune mémorisation */ }

  function hash(input) {
    // Empreinte non cryptographique pour éviter de conserver le contenu des publications.
    let a=2166136261;
    for (let i=0;i<input.length;i++) { a^=input.charCodeAt(i); a=Math.imul(a,16777619); }
    return (a>>>0).toString(36);
  }
  function extractPostKey(post) {
    const hrefs = Array.from(post.querySelectorAll('a[href]')).slice(0,90).map(a=>a.getAttribute('href') || '');
    for (const href of hrefs) {
      try {
        const u = new URL(href,location.origin);
        if (!/facebook\.com$/i.test(u.hostname)) continue;
        const postPath = u.pathname.match(/\/(?:posts|permalink|videos|photos|reel)\/([a-z\d_-]{5,})/i);
        if (postPath) return 'url:'+postPath[1];
        const story = u.searchParams.get('story_fbid') || (/(?:photo\.php|photo)/i.test(u.pathname) && u.searchParams.get('fbid'));
        if (story && /^[\w-]{5,}$/.test(story)) return 'id:'+story;
      } catch { /* lien invalide */ }
    }
    const time = post.querySelector('time[datetime],abbr[data-utime]');
    const timeVal = time?.getAttribute('datetime') || time?.getAttribute('data-utime') || '';
    const content = clean(post.innerText || '').slice(0,400);
    // Pas de clé sauvegardée si le texte d'identification est trop ambigu.
    if (content.length >= 60 && (timeVal || content.length >= 120)) return 'text:'+hash(timeVal+'|'+content.slice(0,320));
    return null;
  }
  function postHandle(post) {
    const stable = extractPostKey(post);
    // Sans permalien ni horodatage vérifiable, un hash de texte seul peut
    // identifier à tort deux publications distinctes comme une seule. Dans
    // ce cas, dédupliquer par carte DOM pendant la session uniquement.
    if (stable && !stable.startsWith('text:')) return stable;
    const time=post.querySelector('time[datetime],abbr[data-utime]');
    if (stable && (time?.getAttribute('datetime') || time?.getAttribute('data-utime'))) return stable;
    if (!temporaryHandles.has(post)) temporaryHandles.set(post, `temporary:${++nextTemporaryHandle}`);
    return temporaryHandles.get(post);
  }
  // EXCLUSION ABSOLUE des sondages (y compris anciens sondages dont le
  // créateur possède des boutons de suppression d'options). Leur structure
  // a déjà provoqué l'ouverture réelle de « Supprimer l'option ».
  // Un faux positif est acceptable : mieux vaut IGNORER une publication.
  function isPollPost(post) {
    if (!post || !post.isConnected) return false;
    const text=normalizedReactionLabel(clean(post.innerText||'').slice(0,18000));
    // Intitulés explicites, même si les résultats sont présentés en lecture seule.
    if (/(?:\bsondage\b|\bpoll\b|ajouter une option|supprimer l['’]option|supprimer cette option|option du sondage|poll option|delete poll|poll results?|resultats? du sondage)/i.test(text)) return true;
    const removeControl=Array.from(post.querySelectorAll('button,[role="button"],[aria-label],[title]')).some(el=>
      /(?:supprimer|delete|remove|retirer|effacer).{0,32}(?:option|choix|sondage|poll)|(?:option|choix|poll).{0,32}(?:supprimer|delete|remove)/i.test(clean([
        el.getAttribute('aria-label'),el.getAttribute('title'),el.innerText?.slice(0,90)
      ].filter(Boolean).join(' '))));
    if (removeControl) return true;
    const voteWidgets=post.querySelector('[role="checkbox"],input[type="checkbox"],[role="radio"],input[type="radio"],[role="progressbar"]');
    const percentages=(text.match(/(?:^|\s)\d{1,3}(?:[.,]\d+)?\s*%/g)||[]).length;
    return !!voteWidgets && (percentages>=1 || /(?:voter|votez|votes?\b|choisir une reponse|choose an answer)/i.test(text));
  }
  function isUnsafeTarget(node) {
    if (!node || !node.closest) return true;
    // Ne jamais cliquer dans une option de sondage ou sur un bouton destructif.
    if (node.closest('[role="checkbox"],input[type="checkbox"],[role="radio"],input[type="radio"],[role="progressbar"],[role="menuitem"],[role="menu"]')) return true;
    const action=node.closest('button,[role="button"],label,[aria-label],[title]');
    if (!action) return false;
    const descriptor=normalizedReactionLabel(clean([
      action.getAttribute('aria-label'), action.getAttribute('title'),
      (action.innerText||'').slice(0,110)
    ].filter(Boolean).join(' ')));
    return /(?:supprimer|delete|remove|retirer|effacer|modifier|edit|ajouter une option|add poll option|voter|vote now)/i.test(descriptor);
  }
  function postIsPinned(post) {
    // Ne lire que les premiers mots : un post parlant d'un contenu "épinglé" n'est pas nécessairement épinglé.
    return /(?:^|\s)(?:publication épinglée|post épinglé|pinned post|pinned)(?:\s|$)/i.test(clean(post.innerText).slice(0,175));
  }
  function postIndicators(node) {
    if (!node || !node.isConnected) return 0;
    let score=0;
    if (node.matches('article,[role="article"],[data-pagelet*="FeedUnit"],[data-testid="fbfeed_story"]')) score+=4;
    if (node.querySelector('a[href*="/posts/"],a[href*="story_fbid="],a[href*="story.php"],a[href*="permalink.php"]')) score+=3;
    if (node.querySelector('div[data-ad-preview="message"],div[data-ad-comet-preview="message"],time,abbr[data-utime]')) score+=2;
    const txt=clean(node.innerText||'');
    if (/(?:commenter|comment|partager|share)/i.test(txt) && /(?:j’aime|j'aime|like)/i.test(txt)) score+=2;
    if (node.querySelector('img[alt],svg,[role="img"]')) score++;
    return score;
  }
  function likelyPost(node) {
    if (!node || !node.isConnected || node.closest('[role="dialog"],[aria-modal="true"],[data-fb-reactions-tool]')) return false;
    const r=rect(node);
    if (!r || r.width<250 || r.height<115 || r.height>6500 || r.bottom<35 || r.top>innerHeight*1.6) return false;
    if (getComputedStyle(node).display==='none') return false;
    const main=document.querySelector('main,[role="main"]');
    if (main && !main.contains(node)) return false;
    return postIndicators(node)>=4;
  }
  function nearestPostShell(anchor) {
    if (!anchor || anchor.closest('[role="dialog"],[aria-modal="true"],[data-fb-reactions-tool]')) return null;
    const main=document.querySelector('main,[role="main"]');
    if (main && !main.contains(anchor)) return null;
    const standard=anchor.closest('[role="article"],article,[data-pagelet*="FeedUnit"],[data-testid="fbfeed_story"]');
    if (standard && likelyPost(standard)) return standard;
    let fallback=null;
    for (let node=anchor.parentElement,depth=0;node && node!==document.body && depth<17;node=node.parentElement,depth++) {
      if (node.matches('main,[role="main"],[role="feed"]')) break;
      const r=rect(node);
      if (!r || r.width<250 || r.width>1400 || r.height<115 || r.height>5000) continue;
      const score=postIndicators(node);
      if (score>=4 && node.querySelector('a[href*="/posts/"],a[href*="story_fbid="],a[href*="story.php"],a[href*="permalink.php"]')) {
        fallback=node;
        // Les petits conteneurs qui englobent seulement le lien de date ne sont pas des posts.
        if (r.height>=145 && (node.querySelector('[role="button"],button') || clean(node.innerText).length>=65)) break;
      }
    }
    return fallback && likelyPost(fallback) ? fallback : null;
  }
  function collectPosts() {
    const selectors='[role="article"],article,[data-pagelet^="FeedUnit"],[data-pagelet*="TimelineFeedUnit"],[data-testid="fbfeed_story"],[aria-posinset]';
    const base=Array.from(document.querySelectorAll(selectors)).filter(likelyPost);
    // Préférer les articles eux-mêmes, pas le conteneur global contenant plusieurs publications.
    const nested=base.filter(node=>!base.some(child=>child!==node && node.contains(child) &&
      (child.matches('[role="article"],article') || postIndicators(child)>=5)));
    // De nombreuses interfaces Pages n'utilisent ni role=article ni les anciens data-pagelet.
    // Retrouver les cartes autour d'un lien de publication ou d'une ligne de réactions.
    const anchors=Array.from(document.querySelectorAll('main a[href*="/posts/"],main a[href*="story.php"],main a[href*="permalink.php"],main a[href*="story_fbid="], [role="main"] a[href*="/posts/"],[role="main"] a[href*="story.php"],[role="main"] a[href*="permalink.php"],main img[alt],main [role="img"][aria-label],main svg[aria-label],[role="main"] img[alt],[role="main"] svg[aria-label],main [role="toolbar"][aria-label*="réagi"],main [role="toolbar"][aria-label*="reacted"],[role="main"] [role="toolbar"][aria-label*="réagi"]'));
    const discovered=[];
    for (const anchor of anchors.slice(0,1200)) {
      if (anchor.matches('img,[role="img"],svg')) {
        if (!reactionNames.test(reactionLabel(anchor))) continue;
      }
      const candidate=nearestPostShell(anchor);
      if (candidate) discovered.push(candidate);
    }
    const combined=[...nested,...discovered];
    const unique=Array.from(new Set(combined));
    const pruned=unique.filter(node=>!unique.some(child=>child!==node && node.contains(child) &&
      (child.matches('[role="article"],article') || (postIndicators(child)>=5 && rect(child)?.height>120))));
    // 2.24.10 : toute barre « Voir qui a réagi » d'une publication (hors commentaires) non couverte par
    // une publication déjà trouvée en crée une : plus petit bloc ancêtre assez large et haut.
    const main=document.querySelector('main,[role="main"]');
    for (const tb of document.querySelectorAll('[role="toolbar"]')) {
      if (!WHO_REACTED_TOOLBAR.test(tb.getAttribute('aria-label')||'')) continue;
      if (main && !main.contains(tb)) continue;
      if (tb.closest('[role="dialog"],[aria-modal="true"],[role="menu"],[data-fb-reactions-tool]')) continue;
      const art=tb.closest('[role="article"]');
      if (art && (rect(art)?.height||0)<200) continue;                  // barre d'un commentaire
      if (pruned.some(p=>p.contains(tb))) continue;
      for (let n=tb.parentElement,d=0;n && n!==document.body && d<20;n=n.parentElement,d++) {
        if (main && n===main) break;
        const r=rect(n);
        if (r && r.width>=250 && r.width<=1400 && r.height>=115 && r.height<=6500) { pruned.push(n); break; }
      }
    }
    return pruned.sort((a,b)=>rect(a).top-rect(b).top);
  }
  function diagnostics() {
    const main=document.querySelector('main,[role="main"]');
    const root=main || document;
    return `diagnostic : ${root.querySelectorAll('[role="article"]').length} article(s), `+
      `${root.querySelectorAll('a[href*="/posts/"],a[href*="story.php"],a[href*="permalink.php"]').length} lien(s) de publication, `+
      `${root.querySelectorAll('img[alt],svg[aria-label],[role="img"][aria-label]').length} image(s) légendée(s).`;
  }
  /*
   * Dans Facebook, un compteur de réactions peut être un div, un span, ou un
   * véritable bouton. Le seul nombre "31 K" n'est PAS suffisant : il faut
   * aussi un indice de réactions ou un libellé explicite. On refuse tous
   * les liens <a href> afin de ne jamais ouvrir un profil ou un permalink.
   */
  const reactionWords = /(?:réactions?|reactions?|personnes? (?:qui |ayant )?ont réagi|people (?:who )?reacted|ont aimé|likes? on this post|view reactions?|voir les réactions)/i;
  const reactionIcons = /(?:j’aime|j'adore|love|like|haha|wow|care|sad|angry|solidaire|triste|grr|reaction|réaction)/i;
  const bareNumber = /^(?:\d{1,3}(?:[\s\u00a0.,]\d{3})+|\d+)(?:[.,]\d+)?\s*[kKmM]?$/;
  function hasReactionIcon(el) {
    if (!el) return false;
    return Array.from(el.querySelectorAll('img[alt],svg[aria-label],span[aria-label],img[src]'))
      .slice(0,30).some(node => reactionIcons.test([
        node.getAttribute('alt'),node.getAttribute('aria-label'),node.getAttribute('src')
      ].filter(Boolean).join(' ')));
  }
  function isOwnLikeAction(el,post) {
    const clickable=el?.closest('button,[role="button"]');
    if (!clickable || !post.contains(clickable)) return false;
    const label=normalizedReactionLabel(clean([clickable.getAttribute('aria-label'),clickable.getAttribute('title'),
      clickable.innerText].filter(Boolean).join(' ')));
    // Un pictogramme d'action J'aime, y compris dans les commentaires, ne
    // doit JAMAIS servir d'ouvreur de la liste des personnes ayant réagi.
    const r=rect(clickable), pr=rect(post);
    // Facebook peut labelliser « J’aime » une pastille du résumé à droite.
    // La commande pour réagir soi-même est normalement sur la rangée d’actions à gauche.
    // Une petite cible située dans la bande droite n’est pas exclue par ce seul libellé ;
    // sa reconnaissance comme RÉSUMÉ reste exigée par les autres contrôles.
    if (r && pr && r.width<=140 && r.height<=65 &&
        (r.left+r.right)/2 > pr.left+pr.width*.70 && pr.right-r.right<160) return false;
    if (/^(?:j'aime|like|react|reagir|j'adore|love)(?:\s+\d+)?$/i.test(label)) return true;
    const aria=normalizedReactionLabel(clean(clickable.getAttribute('aria-label')));
    return /^(?:j'aime|like|react|reagir|j'adore|love)$/i.test(aria);
  }
  function isReactionPickerItem(el) {
    if (!el) return false;
    if (el.closest('[role="menu"],[role="menuitem"]')) return true;
    // Palette hover de Facebook : 6-7 émoticônes alignées dans un
    // popover compact, différente du résumé des réactions déjà reçues.
    for (let n=el.parentElement, level=0;n && level<5;level++,n=n.parentElement) {
      const box=rect(n);
      if (!box || box.height>125 || box.width>410) break;
      const icons=Array.from(n.querySelectorAll('img[alt],svg[aria-label],[role="img"][aria-label],span[aria-label]'));
      if (icons.filter(x=>reactionNames.test(reactionLabel(x))).length>=5) return true;
    }
    return false;
  }
  function isSafeReactionTarget(el,post) {
    if (!el || !post.contains(el) || isPollPost(post) || isUnsafeTarget(el) || !isActionable(el) || el.closest('a[href],[role="dialog"],[aria-modal="true"]')) return false;
    if (isReactionPickerItem(el)) return false;
    // Ici on vérifie uniquement la sûreté de base. Le filtrage du « J’aime »
    // personnel se fait dans calibratedIconCandidates, avec preuve de groupe
    // de réactions et position droite. Les éléments de résumé héritent parfois
    // d'un grand conteneur interactif nommé « J’aime ».

    const r=rect(el);
    if (!r || r.width < 8 || r.height < 8 || r.width > 760 || r.height > 110) return false;
    const aria=clean([el.getAttribute('aria-label'),el.getAttribute('title')].filter(Boolean).join(' '));
    if (/(?:commentaires?|comments?|partages?|shares?|répondre|reply|publications? similaire|nombre de vues|views?)/i.test(aria)) return false;
    return true;
  }
  // L'interface observée a DEUX niveaux : clic sur une des pastilles
  // de réaction de la publication, PUIS clic sur l'onglet « Toutes ».
  // Ne pas confondre ces pastilles avec le bouton « J’aime » qui réagit
  // lui-même à la publication, ni avec une photo/un lien de profil.
  function normalizedReactionLabel(value) {
    return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’]/g,"'");
  }
  const reactionNames = /^(?:j'aime|j'adore|solidaire|haha|wouah|wow|triste|grr+|en colere|like|love|care|angry|sad|laugh|funny|reaction(?:s)?|reactions?)$/i;
  function reactionLabel(node) {
    return normalizedReactionLabel([
      node.getAttribute('alt'), node.getAttribute('aria-label'), node.getAttribute('title')
    ].filter(Boolean).join(' '));
  }
  function hasVisibleReactionCount(area) {
    if (!area) return false;
    const text = clean(area.innerText || '').slice(0,140);
    const labels = clean([area.getAttribute('aria-label'),area.getAttribute('title')].filter(Boolean).join(' '));
    // Il faut un vrai indice de compteur, pas seulement un logo « J’aime ».
    if (reactionWords.test(labels) && /\d/.test(labels)) return true;
    if (reactionWords.test(text) && /\d/.test(text)) return true;
    // Exemple : [logo Haha] [logo J’adore] 31 K [20 commentaires].
    return /^(?:[\s\u00a0]*\d[\d\s\u00a0.,]*\s*[kKmM]?\b)/.test(text) ||
      /(?:^|\s)\d[\d\s\u00a0.,]*\s*[kKmM]?(?:\s|$)/.test(text) &&
      !/(?:ajouter un commentaire|write a comment|commenter)/i.test(text);
  }
  function summaryGeometry(icon,post) {
    const ir=rect(icon), pr=rect(post);
    if (!ir || !pr || ir.width>46 || ir.height>46) return false;
    // Un groupe de réactions est souvent à droite de la ligne de statistiques.
    const rightSide=(ir.left+ir.width/2) > pr.left+pr.width*.58;
    // Variante : icône immédiatement accolée à son compteur. Exclure les
    // boutons d'action personnels via isOwnLikeAction plus haut.
    let adjacentNumber=false;
    for (let n=icon.parentElement, depth=0; n && post.contains(n) && depth<3; n=n.parentElement,depth++) {
      const nr=rect(n);
      if (!nr || nr.height>72 || nr.width>850) break;
      for (const el of n.querySelectorAll('span,div,button')) {
        if (el===icon || el.contains(icon) || !bareNumber.test(clean(el.innerText||''))) continue;
        if (Array.from(el.children).some(c=>clean(c.innerText||'')===clean(el.innerText||''))) continue;
        const r=rect(el);
        if (r && Math.abs((r.top+r.bottom-ir.top-ir.bottom)/2)<23 &&
            r.left>=ir.left-25 && r.left-ir.right<100 && r.width<145 && r.height<48) {
          adjacentNumber=true;break;
        }
      }
      if (adjacentNumber) break;
    }
    return rightSide || adjacentNumber;
  }
  function isReactionSummary(icon,post) {
    if (!post.contains(icon) || icon.closest('a[href],[role="dialog"],[aria-modal="true"]')) return false;
    if (isOwnLikeAction(icon,post) || !summaryGeometry(icon,post)) return false;
    // Confirmer que ce pictogramme relève de la ligne des réactions :
    // compter seulement dans un conteneur compact. Ne pas remonter jusqu'à
    // tout le post (qui contient presque toujours d'autres nombres).
    let node=icon.parentElement;
    for (let depth=0; node && post.contains(node) && depth<5;depth++,node=node.parentElement) {
      const r=rect(node);
      if (!r || r.height>75 || r.width>850) break;
      if (hasVisibleReactionCount(node)) return true;
      if (r.width>160 && r.width<850 &&
          Array.from(node.querySelectorAll('img[alt],svg[aria-label],[role="img"][aria-label]'))
            .filter(el=>reactionNames.test(reactionLabel(el)) && inViewport(el)).length >= 2) return true;
    }
    // Le compteur peut être affiché ailleurs sur la même ligne (exemple :
    // nombre de likes à gauche, pictogrammes à droite).
    if (summaryGeometry(icon,post)) {
      const ir=rect(icon);
      const parents=[icon.parentElement,icon.parentElement?.parentElement,icon.parentElement?.parentElement?.parentElement];
      return parents.some(n => {
        if (!n || !post.contains(n)) return false;
        const r=rect(n);
        return r && r.height<70 && r.width>180 && r.width<850 &&
          Array.from(n.querySelectorAll('span,div')).some(c => {
            const t=clean(c.innerText||''); const cr=rect(c);
            return bareNumber.test(t) && cr && cr.height<48 && cr.width<160 &&
              Math.abs((cr.top+cr.bottom-ir.top-ir.bottom)/2)<26;
          });
      });
    }
    return false;
  }
  // Balayage GEOMETRIQUE de la bande droite des publications :
  // retrouver les elements graphiques aux memes coordonnees relatives
  // que le pictogramme choisi une fois par l'utilisateur.
  const calKey = pageKey => `fbReactionInviter.v2.12.scan:${pageKey}`;
  async function loadCalibration(pageKey) {
    const value=await chrome.storage.local.get(calKey(pageKey));
    const obj=value[calKey(pageKey)];
    scanCalibration=obj && Number.isFinite(obj.rightGap) && obj.rightGap>=0 && obj.rightGap<=240 ? obj : null;
    return scanCalibration;
  }
  function visualIcon(node) {
    if (!node || node.nodeType!==1) return false;
    const r=rect(node);
    if (!r || r.width<9 || r.width>43 || r.height<9 || r.height>43) return false;
    if (node.matches('img,svg,i,[role="img"]')) return true;
    const style=getComputedStyle(node);
    return (node.matches('span,div') && ((style.backgroundImage && style.backgroundImage!=='none') ||
      (style.maskImage && style.maskImage!=='none') ||
      (style.webkitMaskImage && style.webkitMaskImage!=='none') ||
      /^[\p{Extended_Pictographic}\ufe0f\u200d]{1,8}$/u.test(clean(node.innerText||''))));
  }
  function scanPostForPoint(target) {
    const posts=collectPosts();
    const item=posts.filter(post=>post.contains(target)).sort((a,b)=>rect(a).height-rect(b).height)[0];
    return item || nearestPostShell(target);
  }
  function hasStatsOnSameRow(icon,post) {
    const ir=rect(icon), pr=rect(post);
    if (!ir || !pr) return false;
    for (let row=icon.parentElement,n=0;row && post.contains(row) && n<10;row=row.parentElement,n++) {
      const rr=rect(row);
      if (!rr || rr.height>82 || rr.width>pr.width+14) break;
      if (rr.width<pr.width*.56) continue;
      // Vrais compteurs (par ex. 221, 20, 7) a GAUCHE des emoticones.
      const counts=Array.from(row.querySelectorAll('span,div,button'))
        .filter(el=>!el.contains(icon) && !icon.contains(el) &&
          bareNumber.test(clean(el.innerText||'')) &&
          !Array.from(el.children).some(child=>clean(child.innerText||'')===clean(el.innerText||'')))
        .filter(el=>{const r=rect(el);return r && r.width<=125 && r.height<=47 &&
          r.right<ir.left-22 && Math.abs((r.top+r.bottom-ir.top-ir.bottom)/2)<28;});
      if (counts.length) return true;
    }
    return false;
  }
  // Résumés Facebook réels : parfois trois pastilles à droite SANS compteur
  // numérique dans leur ligne. Compter les icônes distinctes côte à côte,
  // et non exiger un nombre (l'ancien filtre faisait échouer le calibrage).
  function reactionIconCluster(icon, post, pool) {
    const ir=rect(icon);
    if (!ir) return false;
    const cx=(ir.left+ir.right)/2,cy=(ir.top+ir.bottom)/2;
    const centers=[];
    for (const candidate of pool) {
      if (!visualIcon(candidate) || candidate.closest('a[href],[role="menu"],[role="dialog"]') ||
          isReactionPickerItem(candidate)) continue;
      const r=rect(candidate); if (!r) continue;
      const pr=rect(post);
      if (!pr || (r.left+r.right)/2 < pr.left+pr.width*.63 || pr.right-(r.left+r.right)/2>205 || pr.right-(r.left+r.right)/2< -65) continue;
      const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
      if (Math.abs(y-cy)>17 || Math.abs(x-cx)>85 || x<cx-85) continue;
      if (!centers.some(old=>Math.abs(old-x)<11)) centers.push(x);
      if (centers.length>=2) return true;
    }
    return false;
  }
  function reactionSummaryEvidence(icon,post,pool) {
    // Plusieurs icônes groupées sont des indices suffisants pour scanner la zone
    // montrée par l'utilisateur, même sans compteur numérique adjacent.
    if (reactionIconCluster(icon,post,pool)) return true;
    if (hasStatsOnSameRow(icon,post)) return true;
    // Icône seule : n'accepter que si son identité de réaction est explicite.
    return reactionNames.test(reactionLabel(icon)) && summaryGeometry(icon,post) &&
      isReactionSummary(icon,post);
  }
  // Ligne de séparation entre statistiques de publication et réponses :
  // les réactions AUX COMMENTAIRES, même avec plusieurs emoji, ne doivent
  // pas devenir un ouvreur de réactions de la publication.
  function commentSectionTop(post) {
    const walker=document.createTreeWalker(post,NodeFilter.SHOW_TEXT);
    const clues=/^(?:voir plus de commentaires|voir les commentaires|afficher davantage de commentaires|view more comments|view all comments|voir les .*commentaires|commenter en tant que|write a comment|comment as )/i;
    let node, count=0, boundary=Infinity;
    while ((node=walker.nextNode()) && ++count<1600) {
      const label=clean(node.textContent);
      if (!label || label.length>125 || !clues.test(label)) continue;
      const element=node.parentElement;
      if (!element || !post.contains(element)) continue;
      const r=rect(element);
      if (r && r.height>0 && r.height<90) boundary=Math.min(boundary,r.top);
    }
    return boundary;
  }
  function reactionRowCandidate(icon,post,commentsTop) {
    const r=rect(icon),pr=rect(post);
    if (!r || !pr) return false;
    const cy=(r.top+r.bottom)/2;
    // Si « Voir plus de commentaires » est visible, le résumé principal
    // se situe au-dessus. Les commentaires eux-mêmes ne sont pas éligibles.
    if (Number.isFinite(commentsTop) && cy>=commentsTop-3) return false;
    return true;
  }
  // Second contrôle INDÉPENDANT du sélecteur de clic : ne cherche jamais
  // d'élément actionnable. Il relève uniquement des indices VISIBLES dans
  // la bande de réactions à droite, AU-DESSUS des commentaires. Il est
  // volontairement conservateur et ne prouve pas la présence d'un bouton.
  function readOnlyReactionEvidence(post) {
    if (!post?.isConnected) return {visible:false,signal:'post_absent'};
    const pr=rect(post), boundary=commentSectionTop(post);
    if (!pr || pr.width<250) return {visible:false,signal:'post_dimensions'};
    const rightEdge=Math.min(195,pr.width*.43);
    const hits=[];
    for(const el of post.querySelectorAll('img[alt],svg,[role="img"],i,span[aria-label],span[title],div[aria-label]')) {
      if (!visualIcon(el) || !inViewport(el) || el.closest('[role="menu"],[role="menuitem"],[role="dialog"],a[href]')) continue;
      const r=rect(el); if(!r) continue;
      const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
      if (x<pr.left+pr.width*.62 || pr.right-x>rightEdge || pr.right-x < -32 ||
          y<=pr.top+60 || y>=pr.bottom-12 || y>=boundary-3) continue;
      // Ne pas inclure la palette « J'aime » qui ouvre des réactions à poster.
      if (isReactionPickerItem(el)) continue;
      hits.push({x,y,named:reactionNames.test(reactionLabel(el))});
    }
    const named=hits.filter(h=>h.named);
    // Deux pictogrammes compacts proches, dont au moins un porte un nom
    // identifiable, suffisent pour « indices visuels présents ».
    for(let i=0;i<hits.length;i++) for(let j=i+1;j<hits.length;j++) {
      const a=hits[i],b=hits[j];
      if(Math.abs(a.x-b.x)>=11 && Math.abs(a.x-b.x)<=70 && Math.abs(a.y-b.y)<=16 &&
         (a.named || b.named)) return {visible:true,signal:'groupe_emojis'};
    }
    // Une seule icône explicitement désignée (Like / Haha / etc) peut
    // apparaître quand la publication a une catégorie unique de réactions.
    if (named.length && named.some(h=>Math.abs(pr.right-h.x-(scanCalibration?.rightGap||0))<=62))
      return {visible:true,signal:'emoji_nomme_zone_calibree'};
    // Indice textuel explicite de réactions sans cible graphique accessible.
    for (const el of post.querySelectorAll('[aria-label],[title]')) {
      if(!inViewport(el) || el.closest('[role="menu"],a[href],[role="dialog"]')) continue;
      const r=rect(el);if(!r) continue;
      const y=(r.top+r.bottom)/2,x=(r.left+r.right)/2;
      if(x<pr.left+pr.width*.55 || y<=pr.top+60 || y>=boundary-3 || y>=pr.bottom-12) continue;
      const phrase=clean(`${el.getAttribute('aria-label')||''} ${el.getAttribute('title')||''}`);
      if(reactionWords.test(phrase) && /\d/.test(phrase)) return {visible:true,signal:'libelle_compteur_reactions'};
    }
    return {visible:false,signal:hits.length?'emojis_ambigus':'aucun_indice_fiable'};
  }
  // Icônes de la barre « Commenter en tant que … » (emoji, photo, GIF, autocollant).
  const COMPOSER_LABEL = /(?:emoji|émoticône|emoticon|gif|autocollant|sticker|photo|vidéo|video|joindre|attach|insérer|insert)/i;
  function isCommentComposerIcon(icon, post) {
    if (icon.closest('form,[contenteditable="true"],[role="textbox"]')) return true;
    for (let n=icon, d=0; n && n!==post && d<5; n=n.parentElement, d++) {
      if (COMPOSER_LABEL.test([n.getAttribute?.('aria-label'), n.getAttribute?.('title'), n.getAttribute?.('alt')].filter(Boolean).join(' '))) return true;
    }
    const row=icon.closest('[role="button"]')?.parentElement?.parentElement || icon.parentElement?.parentElement;
    return !!row && !!row.querySelector?.('[role="textbox"],[contenteditable="true"],form,input,textarea');
  }
  // 2.24.9 : détection AUTOMATIQUE. useGap=true ne sert que si une ancienne calibration existe ;
  // sans elle (ou si elle ne trouve rien), mêmes contrôles de sûreté, sans exiger de distance précise.
  function iconCandidates(post,useGap) {
    if (isPollPost(post)) return [];
    const pr=rect(post);
    if (!pr || pr.width<300) return [];
    // L'espacement a droite est independant de la hauteur des publications.
    const targetGap=useGap ? scanCalibration.rightGap : null;
    const icons=Array.from(post.querySelectorAll('img,svg,i,[role="img"],span,div'));
    const commentsTop=commentSectionTop(post);
    const list=[];
    for (const icon of icons) {
      if (!visualIcon(icon) || !isSafeReactionTarget(icon,post)) continue;
      const r=rect(icon), cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2;
      const gap=pr.right-cx;
      if (gap< -65 || gap>Math.min(240,pr.width*.48) || (useGap && Math.abs(gap-targetGap)>112)) continue;
      if (cy<pr.top+65 || cy>pr.bottom+2) continue;
      // 2.24.8 : sans zone de commentaires, la ligne de réactions est tout en bas de la carte
      // (≈19 px du bord). L'ancienne marge fixe de 22 px la rejetait. On la remplace par un
      // rejet ciblé des icônes de la barre de saisie (emoji, photo, GIF, autocollant).
      if (cy>pr.bottom-26 && isCommentComposerIcon(icon,post)) continue;
      if (isReactionPickerItem(icon) || !reactionRowCandidate(icon,post,commentsTop)) continue;
      // Cas réel : les 3 emojis reçus sont parfois enveloppés par un
      // grand bouton aria-label="J'aime". Ne pas le confondre avec le
      // bouton personnel ; exiger dans ce cas PLUSIEURS pastilles distinctes
      // regroupées, à droite, exactement sur la zone calibrée.
      const cluster=reactionIconCluster(icon,post,icons);
      if (isOwnLikeAction(icon,post) && !cluster) continue;
      if (!reactionSummaryEvidence(icon,post,icons)) continue;
      // Eviter liens vers profil, menus de badges, photos et commentaires.
      if (icon.closest('a[href],[role="menu"],[role="dialog"]')) continue;
      const hit=document.elementsFromPoint(cx,cy);
      if (inViewport(icon) && !hit.some(el=>el===icon || el.contains(icon) || icon.contains(el))) continue;
      const lab=reactionLabel(icon);
      const tag=icon.tagName.toLowerCase();
      const confidence=(useGap ? 100-Math.abs(gap-targetGap) : 100-Math.min(gap,200)/4) + (reactionNames.test(lab)?25:0) +
        (reactionIconCluster(icon,post,icons)?20:0) + (useGap && tag===scanCalibration.tag?8:0);
      list.push({icon,score:confidence,gap,y:cy});
    }
    // La première rangée complète (la plus haute) est prioritaire ;
    // dans cette même rangée seulement, choisir le meilleur score.
    return list.sort((a,b)=>Math.abs(a.y-b.y)>28 ? a.y-b.y : b.score-a.score);
  }
  function calibratedIconCandidates(post) {
    const withGap = (scanCalibration && !scanCalibration.auto && Number.isFinite(scanCalibration.rightGap)) ? iconCandidates(post,true) : [];
    return withGap.length ? withGap : iconCandidates(post,false);
  }
  // 2.24.10 : DÉTECTION SÉMANTIQUE (structure réelle relevée par le diagnostic d'un parcours) :
  //   <span role="toolbar" aria-label="Voir qui a réagi">
  //     <div role="button" aria-label="Haha : 40 personnes"><img role="presentation"></div> …
  // Aucune position, aucun calibrage. Les barres des COMMENTAIRES (articles imbriqués) sont exclues.
  const WHO_REACTED_TOOLBAR = /(?:voir qui a réagi|see who reacted|who reacted)/i;
  const REACTION_COUNT_BUTTON = /^[^:]{1,40}\s?:\s?\d[\d\s\u00a0.,]*\s*[kKmM]?\s*(?:personnes?|people|person)\b/i;
  function semanticOpeners(post) {
    const out=[];
    if (!post) return out;
    for (const tb of post.querySelectorAll('[role="toolbar"]')) {
      if (!WHO_REACTED_TOOLBAR.test(tb.getAttribute('aria-label')||'')) continue;
      const art=tb.closest('[role="article"]');
      if (art && art!==post && !art.contains(post)) continue;            // réactions d'un commentaire
      if (tb.closest('[role="dialog"],[aria-modal="true"],[role="menu"]')) continue;
      for (const b of tb.querySelectorAll('[role="button"]')) {
        if (REACTION_COUNT_BUTTON.test(b.getAttribute('aria-label')||'')) out.push(b);
      }
    }
    return out;
  }
  function findReactionOpener(post) {
    if (!post || isPollPost(post)) return null;
    return semanticOpeners(post)[0] || null;
  }
  // Calibrage par la position d'un véritable pictogramme affiché.
  // Les rectangles de certains ancêtres Facebook N'ENFERMENT PAS leurs enfants
  // rendus en overflow:visible. Il ne faut pas imposer que le point soit à
  // l'intérieur du rectangle d'un article déduit de son DOM.
  function visualAtClick(x,y,target) {
    const stack=document.elementsFromPoint(x,y);
    const nodes=[];
    for(const el of [target,...stack]) {
      if(!el || el.nodeType!==1) continue;
      for(const n of [el,el.closest('svg,img,i,[role="img"]')]) {
        if(n && visualIcon(n) && !nodes.includes(n)) nodes.push(n);
      }
    }
    return nodes.sort((a,b)=>{
      const ar=rect(a),br=rect(b);
      const ad=Math.hypot((ar.left+ar.right)/2-x,(ar.top+ar.bottom)/2-y);
      const bd=Math.hypot((br.left+br.right)/2-x,(br.top+br.bottom)/2-y);
      return ad-bd;
    })[0]||null;
  }
  function calibrationCardBounds(icon, target, x, y) {
    const post=scanPostForPoint(target);
    const candidates=[];
    // Un bloc de publication correct donne la largeur du fil. Sinon on cherche
    // une large ligne autour du pictogramme; ses limites peuvent mieux
    // représenter la carte VISIBLE que celles d'un ancêtre HTML arbitraire.
    const add=(node,depth)=>{
      if(!node || !node.isConnected) return;
      const r=rect(node);
      if(!r || r.width<235 || r.width>1400 || r.right<x-55 || r.right>x+260 ||
         r.left>x-130 || r.top>y+45 || r.bottom<y-45) return;
      const gap=r.right-x;
      candidates.push({node,r,gap,depth,score:Math.abs(gap-28)+Math.max(0,r.width-750)*.13+depth*1.5});
    };
    let ancestor=icon || target;
    for(let depth=0;ancestor && depth<24;ancestor=ancestor.parentElement,depth++) add(ancestor,depth);
    if(post) add(post,25);
    candidates.sort((a,b)=>a.score-b.score);
    return {post, best:candidates[0]||null};
  }
  function calibrationNearbyIcons(root, icon, x, y) {
    const centers=[];
    const candidateNodes=Array.from(root.querySelectorAll('img,svg,i,[role="img"],span,div'));
    for (const node of candidateNodes) {
      if (!visualIcon(node) || node.closest('[role="dialog"],[aria-modal="true"],[role="menu"],[data-fb-reactions-tool]')) continue;
      const r=rect(node); if(!r) continue;
      const cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2;
      if(Math.abs(cx-x)>94 || Math.abs(cy-y)>17) continue;
      if(!centers.some(px=>Math.abs(px-cx)<11)) centers.push(cx);
      if(centers.length>=2) return true;
    }
    return false;
  }
  function calibrationCapture(event) {
    if (!calibrationArmed || event.target?.closest?.('[data-fb-reactions-tool]')) return;
    // Neutralise TOUJOURS le clic de formation, même s'il est refusé.
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    const target=event.target, x=event.clientX, y=event.clientY;
    if (target.closest?.('[role="dialog"],[aria-modal="true"],[role="menu"],[role="menuitem"],[data-fb-reactions-tool]')) {
      update('calibrating','Calibrage refusé : ferme les menus et les fenêtres Facebook avant de sélectionner un emoji reçu.');
      return;
    }
    const main=target.closest?.('main,[role="main"]') || document.querySelector('main,[role="main"]');
    if (main && !main.contains(target)) {
      update('calibrating','Calibrage refusé : sélectionne une réaction sur une publication, dans la colonne principale.');
      return;
    }
    const icon=visualAtClick(x,y,target);
    if (!icon) {
      update('calibrating','Calibrage non retenu : clique sur le pictogramme lui-même (le petit rond coloré), pas sur la zone vide.');
      return;
    }
    if (isReactionPickerItem(icon)) {
      update('calibrating','Calibrage non retenu : menu de réactions personnelles détecté. Clique sur les petites réactions reçues sous une publication.');
      return;
    }
    const {post:calibratedPost,best}=calibrationCardBounds(icon,target,x,y);
    const reference=best?.r || (main ? rect(main) : null);
    const rightEdge=reference?.right || innerWidth;
    const gap=rightEdge-x;
    // Le clic est choisi par l'utilisateur. On n'a plus besoin de valider un
    // article via collectPosts(), qui peut renvoyer un rectangle erroné.
    // En revanche, refuser une action à gauche et un élément hors de la bande droite.
    const inRightBand=gap>=-55 && gap<=205 &&
      (reference ? (x-reference.left)>reference.width*.56 : x>innerWidth*.60);
    const clustered=calibrationNearbyIcons(main || document.body,icon,x,y);
    const named=reactionNames.test(reactionLabel(icon));
    if (!inRightBand || (!clustered && !named)) {
      update('calibrating','Calibrage non retenu : sélectionne un petit pictogramme de réaction reçue, à droite de la ligne sous la publication.');
      return;
    }
    const calibration={rightGap:+Math.max(0,gap).toFixed(1),
      tag:icon.tagName.toLowerCase(),createdAt:Date.now()};
    const key=pageKeyFromLocation();
    if (!key) {update('error','Impossible d’identifier cette Page Facebook.');return;}
    scanCalibration=calibration;
    clearCalibrationListeners();
    const requestedStart=pendingCalibrationStart;
    pendingCalibrationStart=null;
    // Le repère est capturé au moment précis du clic, AVANT les opérations
    // asynchrones. La carte peut être recréée entre-temps par Facebook.
    const startAnchor={
      post:calibratedPost || scanPostForPoint(target),
      target:icon,
      stable:calibratedPost ? extractPostKey(calibratedPost) : null,
      x, y
    };
    chrome.storage.local.set({[calKey(key)]:calibration})
      .then(async()=>{
        update('idle','Calibrage enregistré. Le clic a été neutralisé, sans ouverture de fenêtre Facebook.');
        if (requestedStart) await start('page',{...requestedStart,forceCalibration:false,startAnchor});
        else update('idle','Calibrage enregistré. Clique sur « Lancer les invitations sur la Page » pour démarrer.');
      })
      .catch(()=>update('error','Impossible de sauvegarder le calibrage : aucune invitation lancée.'));
  }
  // Capture de TOUTE la séquence souris. La capture du seul click laissait
  // Facebook réagir au pointerdown/mousedown et pouvait ouvrir un dialogue.
  const calibrationEvents=['pointerdown','mousedown','pointerup','mouseup','click','auxclick','dblclick'];
  function clearCalibrationListeners() {
    calibrationArmed=false;
    if (calibrationListener) for(const type of calibrationEvents)
      window.removeEventListener(type,calibrationListener,true);
    calibrationListener=null;
  }
  function calibrationGate(event) {
    if (!calibrationArmed || event.target?.closest?.('[data-fb-reactions-tool]')) return;
    // L'utilisateur a demandé explicitement de désigner le repère : aucune
    // de ces interactions ne doit atteindre les gestionnaires Facebook.
    if (event.type==='click') { calibrationCapture(event); return; }
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
  }
  window.addEventListener('keydown', event => {
    if (event.key==='Escape' && calibrationArmed) {
      clearCalibrationListeners();
      pendingCalibrationStart=null;
      update('idle','Calibrage annulé. Aucune action effectuée.');
    }
  },true);
  function startCalibration({autoStartOptions=null}={}) {
    if (calibrationArmed && state.phase==='calibrating') return own();
    if (state.phase==='running') return {error:'Mets le parcours en pause ou arrête-le avant de calibrer.'};
    if (state.phase==='paused') {
      if (!/calibrage nécessaire/i.test(state.pauseReason))
        return {error:'Arrête le parcours en pause avant de calibrer.'};
      // Récupération de l'ancienne impasse : neutralise le worker suspendu.
      state.cancel=true; state.paused=false; ++state.runId;
      update('idle','Calibration demandée.');
    }
    const key=pageKeyFromLocation();
    if (!key) return {error:'Ouvre la Page Facebook concernée.'};
    installOverlay();
    if (visibleModals().length) {
      update('idle','Ferme d’abord la fenêtre Facebook ouverte avec sa croix, puis relance l’extension. Ne clique pas sur un emoji tant que la fenêtre est ouverte.');
      return own();
    }
    pendingCalibrationStart=autoStartOptions;
    calibrationArmed=true;
    if (calibrationListener) clearCalibrationListeners();
    calibrationArmed=true;
    calibrationListener=calibrationGate;
    for(const type of calibrationEvents) window.addEventListener(type,calibrationListener,true);
    update('calibrating',autoStartOptions ?
      'CALIBRAGE AVANT DÉMARRAGE : clique une seule fois sur un petit emoji reçu à droite d’une publication. Le clic sera neutralisé ; le parcours démarrera ensuite.' :
      'CALIBRAGE : clique une seule fois sur un petit emoji reçu à droite d’une publication. Le clic sera neutralisé. Puis relance l’extension.');
    return own();
  }
  // Facebook affiche parfois une fenêtre avec de simples rectangles gris
  // (chargement asynchrone). L'absence d'onglet « Toutes » dans les 4 premières
  // secondes ne doit pas être confondue avec une fenêtre étrangère.
  // Ne jamais cliquer dans une fenêtre tant que la liste n'a pas été confirmée.
  const REACTION_NO_MODAL_WAIT_MS = 6000;   // 2.24.9.6 : 1,5 s était trop court si Facebook met du temps à afficher la fenêtre // 2.24.2 : 100 ms était trop court (latence réseau). Attente seule, aucun clic.
  const REACTION_DIALOG_POLL_MS = 300;
  const REACTION_DIALOG_LOADING_MAX_MS = 30000; // seulement si une modale est visible.
  const foreignModalHint = /(?:a gagné \d+ badges?|mes badges|badge auteur|profil de badges|author badge|earned a badge|supprimer l['’]option|supprimer cette option|voulez-vous vraiment supprimer|delete poll option|remove this option)/i;

  async function awaitReactionsAfterClick(id, previousModals) {
    let modalSeen = false;
    let modalOpenedAt = 0;
    let initialCheckDone = false;
    while (true) {
      if (!(await checkPause(id))) return false;
      // Ne jamais interpréter un ancien panneau fermé comme une nouvelle fenêtre.
      const candidates=visibleModals().filter(el=>!previousModals.has(el));
      if (candidates.length && !modalSeen) {
        modalSeen=true;
        modalOpenedAt=Date.now();
      }
      const recognized=candidates.filter(isConfirmedReactionDialog);
      let matched=null;
      if (recognized.length===1) matched=recognized[0];
      else if (recognized.length>1) {
        const leaves=recognized.filter(el=>!recognized.some(other=>other!==el && el.contains(other)));
        if (leaves.length===1) matched=leaves[0];
      }
      if (matched) {
        lastReactionDialog=matched;
        if (pendingPost && !pendingPost.countedOpen) {
          state.opens++; pendingPost.countedOpen=true;
        }
        if (pendingPost) pendingPost.awaitingReaction=false;
        return true;
      }
      if (blockedByFacebook(null)) throw new Error('Restriction Facebook détectée pendant le chargement de la fenêtre.');
      if (candidates.some(el=>foreignModalHint.test((el.innerText||'').slice(0,1800)))) {
        throw new Error('Une fenêtre de badges, et non les réactions reçues, s’est ouverte. Ferme-la puis vérifie le pictogramme calibré.');
      }
      if (!modalSeen) {
        // Un contrôle initial unique (REACTION_NO_MODAL_WAIT_MS) : aucun cycle de 30 s
        // tant qu'aucune fenêtre n'a effectivement commencé à apparaître.
        if (!initialCheckDone) {
          initialCheckDone=true;
          update('running',`${state.current} : vérification de l’ouverture (${(REACTION_NO_MODAL_WAIT_MS/1000).toLocaleString('fr-FR')} s)…`);
          if (!(await wait(id,REACTION_NO_MODAL_WAIT_MS))) return false;
          continue;
        }
        if (pendingPost) pendingPost.awaitingReaction=false;
        throw new Error(`Aucune fenêtre de réactions après ${REACTION_NO_MODAL_WAIT_MS} ms. Publication mise de côté sans nouveau clic.`);
      }
      // Une vraie fenêtre vient d'apparaître : distinguer le chargement gris
      // d'un clic inactif. Ici seulement, attendre 30 secondes maximum.
      const elapsed=Date.now()-modalOpenedAt;
      if (elapsed >= REACTION_DIALOG_LOADING_MAX_MS) {
        throw new Error('Une fenêtre s’est ouverte mais son contenu n’a pas été reconnu après 30 s. Vérifie-la, ferme-la si nécessaire, puis reprends. Aucun clic effectué dedans.');
      }
      update('running',`${state.current} : fenêtre ouverte, attente du contenu (${Math.floor(elapsed/1000)}/30 s). Aucun clic dans la fenêtre…`);
      if (!(await wait(id,Math.min(REACTION_DIALOG_POLL_MS,REACTION_DIALOG_LOADING_MAX_MS-elapsed)))) return false;
    }
  }

  function deferPostWithoutDialog(reason) {
    if (!pendingPost) return;
    const item=pendingPost;
    if (!failedPosts.has(item.key)) {
      failedPosts.add(item.key);
      state.failures++;
      logDiagnosis('open_failed',item.key,'fenetre_non_ouverte_ou_cible_instable','aucun_clic_supplementaire',{raison:String(reason||'').slice(0,140),...(snapshotPost(item.post)||{})});
    }
    lastFailedReason=reason;
    // Ni historique de réussite ni clic supplémentaire sur ce post.
    pendingPost=null;
    lastReactionDialog=null;
    update('running',`${state.current} : réactions inaccessibles ou instables. Publication mise de côté (non traitée, ${state.failures} échec(s)).`);
  }
  // Facebook peut reconstruire une carte ou sa rangée d'emoji après
  // scrollIntoView(). Ne JAMAIS conserver un node initial comme preuve
  // d'identité de la cible : revalider un ouvreur dans LA MEME publication.
  function currentPendingPost(original) {
    if (original?.isConnected) return original;
    // Sans identifiant stable, la correspondance est ambiguë : aucun clic.
    const identity=pendingPost?.stable;
    if (!identity) return null;
    const matches=collectPosts().filter(node=>extractPostKey(node)===identity);
    if (matches.length!==1) return null;
    pendingPost.post=matches[0];
    return matches[0];
  }
  async function stabilizedReactionOpener(original,id) {
    let post=currentPendingPost(original);
    if (isPollPost(post)) throw new Error('Sondage ou commandes de vote détectés : publication ignorée sans clic.');
    if (!post) throw new Error('La publication a été remplacée par Facebook et ne peut plus être identifiée sans ambiguïté. Aucun clic tenté.');
    let opener=findReactionOpener(post);
    if (!opener) throw new Error('Le pictogramme de réaction n’est plus identifiable sur cette publication. Aucun clic tenté.');
    // Un premier défilement est nécessaire quand le compteur est encore
    // au-dessous du viewport. Après lui, Facebook peut recréer les nodes.
    opener.scrollIntoView({block:'center',inline:'nearest'});
    if (!(await wait(id,350))) return null;
    let previous=null;
    for (let attempt=0;attempt<7;attempt++) {
      if (!(await checkPause(id))) return null;
      post=currentPendingPost(post);
      if (!post) throw new Error('La publication a disparu pendant le défilement. Aucun clic tenté.');
      if (isPollPost(post)) throw new Error('Sondage ou commandes de vote détectés : publication ignorée sans clic.');
      const candidate=findReactionOpener(post);
      if (!candidate || !candidate.isConnected) {
        previous=null;
        if (!(await wait(id,220))) return null;
        continue;
      }
      if (!inViewport(candidate)) {
        // Un candidat hors écran ne peut jamais être cliqué. Repositionnement
        // ciblé du compteur, sans rouvrir les menus ou naviguer vers un profil.
        candidate.scrollIntoView({block:'center',inline:'nearest'});
        previous=null;
        if (!(await wait(id,260))) return null;
        continue;
      }
      if (!isSafeReactionTarget(candidate,post)) {
        previous=null;
        if (!(await wait(id,220))) return null;
        continue;
      }
      // La sélection doit rester identique sur deux lectures successives.
      // Les garde-fous géométriques et d'exclusion des actions J'aime sont
      // réévalués à chacune, via findReactionOpener().
      if (previous===candidate) return {post,opener:candidate};
      previous=candidate;
      if (!(await wait(id,220))) return null;
    }
    throw new Error('Pictogramme instable ou introuvable après repositionnement : publication laissée à revoir, sans clic.');
  }
  async function openReactions(post,id) {
    if (reactionDialog()) {
      if (pendingPost) pendingPost.awaitingReaction=false;
      return true;
    }
    let existing=visibleModals();
    // Après fermeture manuelle, React peut conserver la modale un instant.
    // Observer brièvement sa disparition avant de déclarer une fenêtre étrangère.
    if (existing.length && !reactionDialog()) {
      for (let settle=0;settle<7;settle++) {
        if (!(await wait(id,160))) return false;
        existing=visibleModals();
        if (!existing.length || reactionDialog()) break;
      }
      if (reactionDialog()) return true;
    }
    // Sur « Reprendre », une fenêtre en chargement peut être encore ouverte.
    // Attendre sa résolution, SANS réactiver le compteur et SANS cliquer dans
    // la fenêtre. Avant le premier clic, une fenêtre déjà présente est refusée.
    if (existing.length) {
      if (!pendingPost?.awaitingReaction) {
        throw new Error('Une fenêtre Facebook étrangère ou en chargement est déjà ouverte. Ferme-la avant de reprendre.');
      }
      return awaitReactionsAfterClick(id,new Set());
    }
    const oldModals=new Set(existing);
    const stabilized=await stabilizedReactionOpener(post,id);
    if (!stabilized) return false;
    const {opener}=stabilized;
    // Dernier contrôle AU MOMENT du clic : Facebook peut réorganiser le DOM.
    // Aucun élément rattaché à un sondage ou à une commande destructrice
    // n'est autorisé, même s'il ressemble à un emoji calibré.
    const current=stabilized.post;
    const r=rect(opener);
    const hit=r && document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
    if (!r || isPollPost(current) || !isSafeReactionTarget(opener,current) ||
        isUnsafeTarget(hit) || findReactionOpener(current)!==opener) {
      throw new Error('Cible refusée : zone de réaction non sûre ou modifiée. Aucun clic tenté.');
    }
    update('running',`${state.current} : ouverture de la liste des réactions…`);
    if (pendingPost) pendingPost.awaitingReaction=true;
    try {
      const pr=rect(current);
      lastClickInfo={tag:opener.tagName.toLowerCase(),label:snapShape(reactionLabel(opener)),gap:Math.round(pr.right-(r.left+r.right)/2),y:Math.round((r.top+r.bottom)/2-pr.top),
        hit_is_opener:!!hit && (hit===opener||opener.contains(hit)||hit.contains(opener)),hit_tag:hit?.tagName?.toLowerCase(),hit_role:hit?.getAttribute?.('role')||null,
        inside_viewport:inViewport(opener)};
    } catch { lastClickInfo=null; }
    if (typeof opener.click==='function') opener.click();
    else opener.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    return awaitReactionsAfterClick(id,oldModals);
  }
  async function closeReactions(id) {
    // Le simple fait que reactionDialog() ne reconnaisse plus l'en-tête ne
    // prouve PAS que la fenêtre est fermée. Ne jamais marquer la publication
    // comme achevée tant qu'une modale est toujours visible.
    let root=reactionDialog();
    if (!root && lastReactionDialog && trustedReactionDialogs.has(lastReactionDialog) &&
        visibleModalShell(lastReactionDialog)) root=lastReactionDialog;
    if (!root) {
      if (visibleModals().length) {
        throw new Error('La fenêtre Facebook est encore visible, mais son contenu a changé. Aucun nouveau clic : ferme-la ou reprends après chargement.');
      }
      lastReactionDialog=null;
      return true;
    }
    if (!trustedReactionDialogs.has(root)) {
      throw new Error('Fermeture refusée : la fenêtre n’a pas été identifiée comme liste de réactions.');
    }
    for (let attempt=0;attempt<2;attempt++) {
      const closer=closeButton(root);
      if (!closer) throw new Error('Fenêtre de réactions détectée, mais bouton Fermer introuvable.');
      update('running',`${state.current} : fermeture de la fenêtre de réactions…`);
      closer.click();
      for (let n=0;n<12;n++) {
        if (!(await wait(id,140))) return false;
        // Il faut observer la disparition effective, pas seulement la perte
        // d'un statut « Inviter » ou le remplacement des lignes React.
        if (!visibleModalShell(root)) {
          if (lastReactionDialog===root) lastReactionDialog=null;
          // Une autre modale peut apparaître en fin d'animation : ne pas
          // commencer la publication suivante si elle masque la Page.
          if (visibleModals().length) throw new Error('La fenêtre de réactions a disparu, mais une autre fenêtre Facebook est visible.');
          return true;
        }
      }
      // Facebook peut ignorer un premier clic pendant une animation. Il est
      // sûr de réessayer une seule fois sur CE MÊME bouton Fermer confirmé.
    }
    throw new Error('La liste de réactions est toujours visible après deux tentatives de fermeture. Aucun autre clic.');
  }
  function ensureSamePage() {
    if (pageKeyFromLocation() !== state.pageKey) throw new Error('La Page Facebook a changé. Reviens à la Page de départ pour reprendre.');
  }
  // V2.5 : ne JAMAIS changer d'URL pour chercher les publications.
  // Facebook peut rediriger /<page>/posts vers la Page principale, ce qui
  // détruit le script en cours et empêche la reprise. Chercher le fil dans
  // la Page actuellement ouverte en défilant progressivement.
  function findFeedScroller() {
    const documentScroller = document.scrollingElement || document.documentElement;
    const root = document.querySelector('main,[role="main"]');
    // Quand Facebook utilise un défilement interne, cibler le fil plutôt que
    // la colonne latérale de navigation ou le panneau de l'extension.
    const inside = root ? [root,...root.querySelectorAll('div')].filter(el => {
      if (el.closest('[role="dialog"],[data-fb-reactions-tool]') || !inViewport(el)) return false;
      const r=rect(el);
      return r && r.height>innerHeight*.40 && r.width>300 &&
        el.scrollHeight>el.clientHeight+200 && /auto|scroll/.test(getComputedStyle(el).overflowY);
    }) : [];
    if (documentScroller.scrollHeight>documentScroller.clientHeight+80) return documentScroller;
    return inside.sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight))[0] || documentScroller;
  }
  async function scrollFeed(id, toTop=false) {
    const el = findFeedScroller();
    const before = el.scrollTop;
    const step = Math.max(390, Math.floor(innerHeight*.74));
    el.scrollTop = toTop ? 0 : before + step;
    el.dispatchEvent(new Event('scroll',{bubbles:true}));
    state.scrolls++;
    if (!toTop) state.feedScrolls++;
    if (!(await wait(id,toTop ? 1250 : 1450))) return false;
    return Math.abs(el.scrollTop-before) >= 2;
  }
  async function seekReactionRow(post,stable,id) {
    if (!post?.isConnected || isPollPost(post)) return null;
    const original=rect(post);
    if (!original) return null;
    update('running',`${state.current} : recherche de la rangée de réactions en bas de publication…`);
    // On fait défiler sans cliquer : Facebook peut ne rendre les emojis
    // qu'à l'approche du bas de la publication. Pas de ciblage approximatif.
    if (original.bottom > innerHeight-35 || original.top < 0) {
      post.scrollIntoView({block:'end',inline:'nearest',behavior:'instant'});
      if (!(await wait(id,450))) return null;
    }
    if (!(await checkPause(id))) return null;
    let candidate=post;
    if (!post.isConnected && stable) {
      const matches=collectPosts().filter(x=>extractPostKey(x)===stable);
      candidate=matches.length===1 ? matches[0] : null;
    }
    if (!candidate || isPollPost(candidate)) return null;
    return findReactionOpener(candidate) ? candidate : null;
  }

  // Distinguer clairement l'historique persistant (informatif) de la
  // déduplication TEMPORAIRE d'une session. Aucun post n'est écarté au seul
  // motif qu'il a été terminé lors d'un précédent parcours.
  function alignToCalibratedPost(anchor) {
    const posts=collectPosts();
    const same=(post)=>post===anchor.post ||
      (anchor.target?.isConnected && post.contains(anchor.target)) ||
      (anchor.post?.isConnected && (post.contains(anchor.post) || anchor.post.contains(post))) ||
      (anchor.stable && extractPostKey(post)===anchor.stable);
    let index=posts.findIndex(same);
    if (index<0) {
      // Facebook peut avoir déplacé ou remplacé la carte entre le clic
      // intercepté et le démarrage. Se rabattre uniquement sur sa position
      // visible, jamais sur une commande trouvée ailleurs sur la Page.
      index=posts.findIndex(post=>{
        const r=rect(post);
        return r && r.left-35<=anchor.x && r.right+35>=anchor.x &&
          r.top-30<=anchor.y && r.bottom+30>=anchor.y;
      });
    }
    if (index<0) {
      // Aucun retour en haut. On écarte seulement les cartes entièrement
      // situées AU-DESSUS du point sélectionné dans le viewport courant.
      for (const post of posts) {
        const r=rect(post);
        if (r && r.bottom < anchor.y-20) seenPosts.add(postHandle(post));
      }
      return;
    }
    for (const post of posts.slice(0,index)) seenPosts.add(postHandle(post));
  }

  async function runPage(id) {
    if (!state.pageKey) throw new Error('Ouvre la chronologie d’une Page Facebook, et non le fil d’actualité.');
    ensureSamePage();
    // 2.24.9.5 : plus de calibrage obligatoire. Une ancienne calibration éventuelle sert d'indice, sinon détection automatique.
    await loadCalibration(state.pageKey);
    // Lors d'une reprise, ne jamais fermer une fenêtre ouverte pour la publication
    // en cours : on doit la traiter, pas sauter cette publication.
    if (!pendingPost && reactionDialog()) {
      if (!(await closeReactions(id))) return;
    }
    if (!state.pageInitialized) {
      state.pageInitialized = true;
      await loadHistory();
      if (!(await checkPause(id))) return;
      // Le lancement ne déplace PLUS le fil vers le haut. On traite d'abord
      // la publication où l'utilisateur a calibré les réactions, puis celles
      // qui sont plus bas. Les cartes précédentes ne sont hors du parcours
      // QUE parce que l'utilisateur a choisi son point de départ.
      const hadAnchor = !!initialPageAnchor;
      if (initialPageAnchor) {
        alignToCalibratedPost(initialPageAnchor);
        initialPageAnchor=null;
      }
      update('running',(hadAnchor ? 'Départ à la publication calibrée, puis parcours vers les publications suivantes.' : 'Détection automatique des réactions : parcours des publications de la Page.') + ' Chaque nouvelle session recontrôle les publications, indépendamment de l’historique.');
    }
    let idle = 0, visited = 0, missesSinceOpen = 0, scrollsSinceOpen = 0, bootstrapThisRun = 0, consecutiveNoDialog = 0;
    while (await checkPause(id)) {
      ensureSamePage();
      if (blockedByFacebook(null)) throw new Error('Restriction Facebook détectée. Vérifie l’interface avant de reprendre.');
      if (state.limit > 0 && state.attempts >= state.limit) {
        state.limitReached = true;
        update('done',`Plafond de ${state.limit.toLocaleString('fr-FR')} clics atteint. Clique sur « Reprendre » pour ajouter ${state.batchLimit.toLocaleString('fr-FR')} clics, sans recalibrage ni retour en haut.`);
        return;
      }
      if (++visited > 40000) throw new Error('Arrêt de sécurité : parcours anormalement long.');
      if (pendingPost) {
        const item=pendingPost;
        if (item.rejectAfterForeignDialog) {
          if (visibleModals().length) throw new Error('Ferme d’abord la fenêtre Facebook inattendue (Annuler), puis reprends : cette publication sera ignorée.');
          deferPostWithoutDialog('Fenêtre étrangère détectée : cible interdite pour cette session.');
          continue;
        }
        if (isPollPost(currentPendingPost(item.post))) {
          state.pollsSkipped++; state.securitySkipped++;
          logDiagnosis('security_skip',item.key,'sondage_detecte','aucun_clic');
          pendingPost=null;
          update('running',`${state.current} : sondage ignoré par sécurité (${state.pollsSkipped}).`);
          continue;
        }
        if (item.phase !== 'closing') {
          const loadedDialog = reactionDialog();
          if (loadedDialog && item.awaitingReaction) {
            item.awaitingReaction=false;
            if (!item.countedOpen) { state.opens++; item.countedOpen=true; }
          }
          if (!loadedDialog) {
            if (!item.post.isConnected) throw new Error('Publication interrompue introuvable. Arrête et relance une session.');
            update('running',`${state.current} : reprise de l’ouverture des réactions…`);
            try {
              if (!(await openReactions(item.post,id))) return;
            } catch(error) {
              // Aucun dialogue: ce lien n'est pas exploitable. Reprendre sans
              // re-cliquer dessus. Si une fenêtre quelconque existe, on PAUSE.
              if (visibleModals().length===0 && (
                  /^Aucune fenêtre de réactions après (?:\d+ ms|30 s)\./.test(error.message) ||
                  /^(?:Pictogramme instable|Le pictogramme de réaction n’est plus identifiable|La publication a été remplacée|La publication a disparu)/.test(error.message))) {
                deferPostWithoutDialog(error.message);
                if (++consecutiveNoDialog >= 3) {
                  throw new Error('Trois publications successives dont les réactions restent inaccessibles : parcours mis en pause pour vérifier le calibrage. Ces publications restent NON traitées.');
                }
                continue;
              }
              if (visibleModals().length && !reactionDialog()) item.rejectAfterForeignDialog=true;
              throw error;
            }
          }
          const outcome=await processList(id);
          if (outcome === 'cancelled' || !(await checkPause(id))) return;
          if (outcome === 'limit') {
            state.limitReached = true;
            update('done',`Plafond de ${state.limit.toLocaleString('fr-FR')} clics atteint au milieu d’une publication. Clique sur « Reprendre » : la fenêtre actuelle sera terminée avant de passer à la suivante.`);
            return;
          }
          item.phase='closing';
        }
        if (!(await closeReactions(id))) return;
        state.posts++;
        consecutiveNoDialog=0;
        if (item.stable) await markCompleted(item.stable);
        pendingPost=null;
        update('running',`${state.current} terminée · ${state.posts} publication(s) vérifiée(s) pendant cette session.`);
        continue;
      }
      // Si une autre fenêtre est ouverte, ne pas tenter de cliquer au travers.
      if (visibleModals().length) throw new Error('Une autre fenêtre Facebook est ouverte. Ferme-la, puis reprends.');
      const posts = collectPosts();
      // Amorçage : le fil peut être très loin sous la couverture, les photos
      // et les encarts. Ne pas échouer après un ou deux défilements.
      if (!posts.length && state.opens === 0 && state.skipped === 0 && state.inaccessible === 0) {
        if (bootstrapThisRun >= 15) {
          throw new Error('Aucune publication reconnue après 15 défilements sur la Page, sans rechargement. '+diagnostics()+
            ' Facebook ne présente pas de fil exploitable sur cette vue. Reprendre continue à la position actuelle.');
        }
        update('running',`Recherche des publications sous les encarts : défilement ${bootstrapThisRun+1}/15…`);
        const moved = await scrollFeed(id);
        if (!(await checkPause(id))) return;
        state.bootstrapScrolls++; bootstrapThisRun++;
        if (!moved && state.bootstrapScrolls >= 3) {
          throw new Error('Fin de page sans publication reconnue. '+diagnostics()+
            ' Reprendre ne renverra pas en haut.');
        }
        continue;
      }
      let chosen = null;
      for (const post of posts) {
        const key = postHandle(post);
        if (seenPosts.has(key)) continue;
        chosen = {post,key,stable:extractPostKey(post)};
        break;
      }
      if (chosen) {
        idle = 0;
        const {post,key,stable} = chosen;
        seenPosts.add(key);
        // Une publication terminée précédemment n'est PAS définitive : de
        // nouvelles personnes peuvent réagir depuis le dernier passage.
        // La mémoire seenPosts empêche les doublons DANS cette session ;
        // l'historique persistent sert uniquement à compter les recontrôles.
        state.current = `Publication ${state.posts+state.inaccessible+state.pollsSkipped+state.failures+1}`;
        if (stable && historyPosts.has(stable)) {
          state.skipped++;
          scrollsSinceOpen=0;
          update('running',`${state.current} : déjà visitée dans le passé, mais réexaminée intégralement (${state.skipped} recontrôle(s)).`);
        }
        if (isPollPost(post)) {
          state.pollsSkipped++; state.securitySkipped++;
          logDiagnosis('security_skip',key,'sondage_detecte','aucun_clic');
          update('running',`${state.current} : publication ignorée par sécurité (sondage, ${state.securitySkipped}). Aucun clic.`);
          continue;
        }
        // Ne pas qualifier de « sans compteur » une publication dont le bas
        // et la rangée de réactions ne sont pas encore passés à l'écran.
        // Repositionnement SANS aucun clic puis nouvelle détection sur la
        // même carte (ou sa remplaçante avec la même clé stable).
        let actualPost = post;
        if (!findReactionOpener(actualPost)) {
          const repositioned=await seekReactionRow(actualPost,stable,id);
          if (!(await checkPause(id))) return;
          if (repositioned) actualPost=repositioned;
        }
        if (!findReactionOpener(actualPost)) {
          state.inaccessible++;
          const evidence=readOnlyReactionEvidence(actualPost);
          if (evidence.visible) state.visibleUnrecognized++;
          else state.noReactionEvidence++;
          logDiagnosis(evidence.visible?'visual_unrecognized':'no_evidence',key,
            'ouvre_reactions_introuvable_apres_repositionnement',evidence.signal,snapshotPost(actualPost));
          missesSinceOpen++;
          update('running',evidence.visible ?
            `${state.current} : indices visibles de réactions, mais ouverture non reconnue. Aucun clic tenté (${state.visibleUnrecognized}).` :
            `${state.current} : aucun indice de réactions identifié après repositionnement. Cela ne prouve pas leur absence (${state.noReactionEvidence}).`);
          if (missesSinceOpen >= 12 && state.opens === 0) {
            throw new Error('12 publications reconnues, mais aucun raccourci de réactions identifié avec certitude. '+diagnostics()+' Arrêt sans clic.');
          }
          if (missesSinceOpen >= 18) {
            throw new Error('18 publications successives sans ouvreur de réactions reconnu. Consulte les indicateurs et le diagnostic. Parcours interrompu pour éviter des clics erronés.');
          }
          continue;
        }
        clickedElements = new WeakSet();
        // On ne retire cet élément qu'APRES fermeture et traitement. Ainsi,
        // « Reprendre » ne le saute pas si la détection de la fenêtre échoue.
        pendingPost={post:actualPost,key,stable,phase:'opening'};
        missesSinceOpen=0;scrollsSinceOpen=0;
        continue;
      }
      update('running',`Recherche de publications plus anciennes… ${state.posts} terminée(s), ${state.skipped} recontrôlée(s).`);
      logFeedScan(posts);
      const moved = await scrollFeed(id);
      if (!(await checkPause(id))) return;
      scrollsSinceOpen++;
      if (moved) idle = 0;
      else idle++;
      // En l'absence de réactions reconnues malgré des publications, conserver
      // un plafond de défilements, sans rejeter les zones d'en-tête de la Page.
      if (state.opens === 0 && state.posts === 0 && state.skipped === 0 && scrollsSinceOpen >= 8) {
        throw new Error('Publications présentes, mais aucune réaction ouverte après 8 défilements. '+diagnostics());
      }
      if (scrollsSinceOpen >= 12) {
        throw new Error('Douze défilements consécutifs sans ouverture de réactions : parcours arrêté.');
      }
      // Arrêt après plusieurs tentatives au bas du chargement progressif.
      if (idle >= 6) {
        if (state.posts+state.skipped+state.inaccessible+state.pollsSkipped === 0) {
          throw new Error('Aucune publication détectée. Ouvre la section Publications de ta Page, puis reprends.');
        }
        update('done',`Parcours terminé : ${state.posts} publication(s) achevée(s), ${state.skipped} recontrôlée(s), ${state.visibleUnrecognized} avec indices non reconnus, ${state.noReactionEvidence} sans indices fiables, ${state.securitySkipped} ignorée(s) par sécurité, ${state.failures} non ouverte(s) à vérifier.${shortfallPosts ? ` ${shortfallPosts} liste(s) de réactions incomplète(s) côté Facebook (total annoncé non atteint).` : ''}`);
        return;
      }
    }
  }
  async function runManual(id) {
    const outcome = await processList(id);
    if (outcome === 'cancelled' || !(await checkPause(id))) return;
    if (outcome === 'limit') update('done',`Maximum de ${state.limit} clic(s) atteint.`);
    else update('done', lastListNote ? `Liste parcourue, mais incomplète : ${lastListNote}` : 'Liste entièrement parcourue.');
  }
  // Affichage seulement : explication claire + action suivante.
  // state.pauseReason conserve le message technique d'origine (certains tests de texte en dépendent).
  const PAUSE_HELP = [
    [/Zone de défilement des réactions perdue/i, 'La liste des réactions n’est plus détectée (Facebook a probablement rechargé la fenêtre).', 'Vérifie qu’elle est toujours ouverte, puis clique sur Reprendre.'],
    [/Fenêtre de réactions introuvable/i, 'La fenêtre des réactions n’est pas ouverte.', 'Ouvre-la en cliquant sur un emoji de réaction, puis clique sur Reprendre.'],
    [/impossible de confirmer que toutes les réactions/i, 'La fenêtre est ouverte, mais l’onglet « Toutes » n’est pas confirmé.', 'Sélectionne « Toutes » toi-même, puis clique sur Reprendre.'],
    [/Fenêtre non reconnue après sélection/i, 'La fenêtre a changé après la sélection de « Toutes ».', 'Vérifie son contenu, puis clique sur Reprendre.'],
    [/trop d’itérations/i, 'Arrêt de sécurité : trop d’étapes sur une même liste.', 'Clique sur Arrêter, puis relance un parcours.'],
    [/Fenêtre de réactions non visible pendant le traitement/i, 'La fenêtre des réactions a disparu pendant le traitement.', 'Rouvre-la, puis clique sur Reprendre.'],
    [/(?:semble limiter les invitations|Restriction Facebook)/i, 'Facebook semble limiter les invitations.', 'Vérifie l’écran Facebook et patiente avant de reprendre : insister peut prolonger la restriction.'],
    [/Trois clics sans confirmation visuelle/i, 'Trois invitations de suite n’ont pas été confirmées visuellement.', 'Vérifie la liste (connexion lente ? limite Facebook ?), puis clique sur Reprendre ou Arrêter.'],
    [/fenêtre de badges/i, 'Une fenêtre de badges s’est ouverte à la place des réactions.', 'Ferme-la, vérifie l’emoji calibré, puis clique sur Reprendre.'],
    [/Aucune fenêtre de réactions après/i, 'Aucune fenêtre ne s’est ouverte après le clic sur l’emoji.', 'Vérifie le calibrage, puis clique sur Reprendre.'],
    [/contenu n’a pas été reconnu après 30 s/i, 'La fenêtre s’est ouverte, mais son contenu n’est pas reconnu.', 'Ferme-la si besoin, puis clique sur Reprendre.'],
    [/(?:fenêtre Facebook étrangère|Ferme d’abord la fenêtre|Une autre fenêtre Facebook est ouverte)/i, 'Une autre fenêtre Facebook est ouverte.', 'Ferme-la avec sa croix, puis clique sur Reprendre.'],
    [/La Page Facebook a changé/i, 'Tu as quitté la Page de départ.', 'Reviens sur cette Page, puis clique sur Reprendre.'],
    [/Calibrage nécessaire/i, 'Ancien message de calibrage.', 'Clique sur « Lancer les invitations sur la Page » : aucun calibrage n’est plus nécessaire.'],
    [/Trois publications successives dont les réactions/i, 'Plusieurs publications de suite n’ont pas pu ouvrir leurs réactions.', 'Vérifie le calibrage, puis clique sur Reprendre ou Arrêter.'],
    [/(?:12 publications reconnues|18 publications successives|aucune réaction ouverte après|Douze défilements|Aucune publication détectée|Aucune publication reconnue|Fin de page sans publication)/i, 'Aucune liste de réactions n’a pu être ouverte.', 'Vérifie le calibrage et la section Publications de ta Page, puis relance.'],
    [/(?:toujours visible après deux tentatives|bouton Fermer introuvable|encore visible, mais son contenu|Fermeture refusée|a disparu, mais une autre)/i, 'La fenêtre des réactions ne se ferme pas correctement.', 'Ferme-la avec sa croix, puis clique sur Reprendre.']
  ];
  function explainPause(message) {
    const text = String(message || '');
    for (const [pattern, what, next] of PAUSE_HELP) if (pattern.test(text)) return `${what} ${next}`;
    return `${text} Vérifie l’écran Facebook, puis clique sur Reprendre ou Arrêter.`;
  }
  function launchWorker(id) {
    if (state.workerActive) { pendingRunId = id; return; }
    pendingRunId = 0;
    state.workerActive = true;
    (state.mode === 'page' ? runPage(id) : runManual(id)).catch(error => {
      if (id === state.runId && !state.cancel) {
        state.paused = true; state.pauseReason = error.message || String(error);
        update('paused',`Pause de sécurité : ${explainPause(state.pauseReason)}`);
      }
    }).finally(() => {
      state.workerActive = false;
      if (pendingRunId === state.runId && state.phase === 'running') launchWorker(pendingRunId);
    });
  }
  async function start(mode,options) {
    if (['running','paused','calibrating'].includes(state.phase)) return own();
    if (!['manual','page'].includes(mode) || !options || !Number.isInteger(options.delay) || options.delay < 1000 || options.delay > 30000) {
      update('error','Délai ou mode invalide.'); return own();
    }
    const limit = mode === 'page' ? options.pageLimit : options.limit;
    if (!Number.isInteger(limit) || limit < 0 || limit > 100000) {
      update('error','Plafond invalide.'); return own();
    }
    const pageKey = mode === 'page' ? pageKeyFromLocation() : '';
    if (mode === 'page' && !pageKey) {
      update('error','Ouvre la chronologie d’une Page Facebook, pas le fil d’actualité ni Business Suite.'); return own();
    }
    // Le calibrage est un PREALABLE, jamais une exception qui bloque
    // le traitement dans un état « paused » impossible à débloquer.
    if (mode==='page') {
      const ready=await loadCalibration(pageKey);
      if (options.forceCalibration === true) {
        state.mode='page'; state.pageKey=pageKey; state.limit=limit;
        return startCalibration({autoStartOptions:{...options,forceCalibration:false}});
      }
      // 2.24.9 : plus de calibrage obligatoire. Détection automatique du bouton de réactions.
      if (!ready) scanCalibration={rightGap:0,tag:null,auto:true};
    }
    state.mode = mode; state.attempts=0; state.confirmed=0; state.verifying=false; state.scrolls=0;
    state.posts=0; state.skipped=0; state.pollsSkipped=0; state.securitySkipped=0; state.inaccessible=0; state.visibleUnrecognized=0; state.noReactionEvidence=0; state.failures=0; state.opens=0; state.feedScrolls=0; state.current='';
    diagnosisLog=[]; snapshotsTaken=0; lastClickInfo=null; feedScansLogged=0;
    state.historyCount=0; state.delay=options.delay; state.limit=limit;
    state.batchLimit=mode === 'page' ? limit : 0; state.limitReached=false;
    state.pageKey=pageKey; state.pageInitialized=false; state.bootstrapScrolls=0;
    state.cancel=false; state.paused=false; state.pauseReason='';
    clickedElements=new WeakSet(); seenPosts=new Set(); historyPosts=new Set();
    initialPageAnchor=mode==='page' ? (options.startAnchor || null) : null;
    temporaryHandles=new WeakMap(); nextTemporaryHandle=0;
    lastReactionDialog=null; pendingPost=null; failedPosts=new Set(); lastFailedReason='';
    const id=++state.runId;
    installOverlay();
    update('running',mode === 'page' ? 'Repérage des publications de la Page…' : 'Recherche de la fenêtre des réactions…');
    launchWorker(id);
    return own();
  }
  async function resetHistory() {
    if (state.phase === 'running' || state.phase === 'paused') throw new Error('Arrête le traitement avant de réinitialiser l’historique.');
    const pageKey = pageKeyFromLocation();
    if (!pageKey) throw new Error('Ouvre la Page Facebook concernée.');
    await chrome.storage.local.remove(historyStoreKey(pageKey));
    if (pageKey === state.pageKey) { historyPosts.clear(); state.historyCount=0; }
    return {cleared:true};
  }
  chrome.runtime.onMessage.addListener((message,_sender,sendResponse) => {
    switch(message?.type) {
      case 'PING': case 'GET_STATUS': sendResponse(own()); break;
      case 'GET_DIAGNOSTICS': sendResponse(safeDiagnosisReport()); break;
      case 'START': start(message.mode || 'manual',message.options).then(sendResponse).catch(e=>sendResponse({error:e.message})); return true;
      case 'PAUSE': sendResponse(pause()); break;
      case 'RESUME': sendResponse(resume()); break;
      case 'CONTINUE_LIMIT': sendResponse(continueAfterLimit()); break;
      case 'STOP': sendResponse(stop()); break;
      case 'CALIBRATE': sendResponse(startCalibration()); break;
      case 'RESET_HISTORY': resetHistory().then(sendResponse).catch(e=>sendResponse({error:e.message})); return true;
      default: sendResponse(own());
    }
    return false;
  });
})();
