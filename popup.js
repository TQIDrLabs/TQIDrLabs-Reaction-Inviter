'use strict';
const $ = id => document.getElementById(id);
const TQ = window.TQ_I18N;
// Traduction FR/EN : affichage uniquement. L'observateur retraduit tout texte écrit dynamiquement.
let tqBusy = false;
const tqObserver = new MutationObserver(() => {
  if (tqBusy) return; tqBusy = true;
  try { TQ.translateTree(document); } finally { tqBusy = false; tqObserver.takeRecords(); }
});
function applyLang() {
  tqBusy = true;
  try { TQ.translateTree(document); } finally { tqBusy = false; tqObserver.takeRecords(); }
  $('langFr').setAttribute('aria-pressed', String(TQ.lang === 'fr'));
  $('langEn').setAttribute('aria-pressed', String(TQ.lang === 'en'));
  $('langEs').setAttribute('aria-pressed', String(TQ.lang === 'es'));
}
async function chooseLang(l) { await TQ.save(l); showStatus(lastStatus); applyLang(); }
$('langFr').addEventListener('click', () => chooseLang('fr'));
$('langEn').addEventListener('click', () => chooseLang('en'));
$('langEs').addEventListener('click', () => chooseLang('es'));
tqObserver.observe(document.documentElement, {childList: true, subtree: true, characterData: true});
TQ.load().then(applyLang);
// Le numéro affiché provient du manifeste : aucune version écrite en dur.
$('appVersion').textContent = chrome.runtime.getManifest().version;
let activeTabId = null;
let lastStatus = {phase:'idle', attempts:0, confirmed:0, posts:0, skipped:0, inaccessible:0, historyCount:0, detail:''};
const phases = {idle:'Prêt', calibrating:'Calibrage', running:'En cours', paused:'En pause', done:'Terminé', stopped:'Arrêté', error:'Erreur'};
const isFacebook = url => /^https:\/\/(www\.|web\.|business\.|m\.)?facebook\.com\//i.test(url || '');
const SLIDER_UNLIMITED = 5001;
const CAUTION_THRESHOLD = 100;
const DAILY_WARNING = 'Conseil de prudence : nous recommandons de limiter les invitations à 100 par jour pour réduire le risque de restriction temporaire par Facebook. Ce seuil est indicatif et non officiellement garanti.';
function showUnlimitedWarning() {
  $('unlimitedAdvice').hidden = $('pageLimitNumber').value !== '0';
}
function sliderValueFor(number) {
  return number === 0 ? SLIDER_UNLIMITED : Math.max(10, Math.min(5000,number));
}
function readOptions() {
  const delay = Number($('delay').value), limit=Number($('manualLimit').value), pageLimit=Number($('pageLimitNumber').value);
  if (!Number.isInteger(delay) || delay < 1000 || delay > 30000) throw new Error('Délai : entre 1 000 et 30 000 ms.');
  if (!Number.isInteger(limit) || limit < 0 || limit > 100000) throw new Error('Maximum manuel : entre 0 et 100 000.');
  if (!$('pageLimitNumber').value.trim() || !Number.isSafeInteger(pageLimit) || pageLimit < 0 || pageLimit > 100000) throw new Error('Maximum Page entière : entre 0 et 100 000, 0 sans plafond.');
  localStorage.setItem('fbInvite.delay',String(delay));
  localStorage.setItem('fbInvite.limit',String(limit));
  localStorage.setItem('fbInvite.pageLimit',String(pageLimit));
  return {delay,limit,pageLimit};
}
function showStatus(status) {
  lastStatus = status || lastStatus;
  $('state').textContent = phases[lastStatus.phase] || 'Prêt';
  $('state').dataset.phase = lastStatus.phase || 'idle'; // Affichage uniquement.
  // Le compteur principal représente les confirmations visuelles, pas les tentatives.
  const confirmed = lastStatus.confirmed || 0;
  $('counter').textContent = `${confirmed} invitation${confirmed === 1 ? '' : 's'} confirmée${confirmed === 1 ? '' : 's'} visuellement`;
  // Ne signaler un écart qu'après la vérification, pas pendant un clic en cours.
  const unconfirmed = Math.max(0, (lastStatus.attempts || 0) - confirmed);
  const alert = $('unconfirmedAlert');
  alert.hidden = Boolean(lastStatus.verifying) || unconfirmed === 0;
  alert.textContent = alert.hidden ? '' : `${unconfirmed} clic${unconfirmed === 1 ? '' : 's'} sans confirmation visuelle. Vérifie les invitations si le nombre augmente.`;
  $('posts').textContent = lastStatus.posts || 0;
  $('securitySkipped').textContent = lastStatus.securitySkipped || 0;
  $('visibleUnrecognized').textContent = lastStatus.visibleUnrecognized || 0;
  $('noReactionEvidence').textContent = lastStatus.noReactionEvidence || 0;
  $('copyDiagnostics').disabled = !activeTabId;   // 2.24.10.2 : toujours disponible, même sans échec (le rapport contient alors un résumé)
  $('opens').textContent = lastStatus.opens || 0;
  $('failures').textContent = lastStatus.failures || 0;
  $('detail').textContent = lastStatus.detail || 'Prêt à lancer le traitement.';
  $('calibState').textContent = lastStatus.calibrationArmed ? 'Calibrage actif : clique une fois sur un emoji à droite. Le clic est intercepté.' : 'Détection automatique : aucun calibrage à faire.';
  const active = ['running','paused'].includes(lastStatus.phase);
  const calibrating = lastStatus.phase==='calibrating';
  $('startManual').disabled = (active || calibrating) || !activeTabId;
  $('startPage').disabled = (active || calibrating) || !activeTabId;
  const canContinue=Boolean(lastStatus.canContinue);
  $('dailyAdvice').hidden = !(canContinue && Number(lastStatus.limit) + Number(lastStatus.batchLimit) > CAUTION_THRESHOLD);
  $('pause').disabled = !active && !canContinue;
  $('pause').textContent = canContinue ? `Reprendre (+${Number(lastStatus.batchLimit).toLocaleString('fr-FR')})` : lastStatus.phase === 'paused' ? 'Reprendre' : 'Pause';
  $('stop').disabled = !(active || calibrating);
  $('delay').disabled = active;
  $('manualLimit').disabled = active;
  $('pageLimitRange').disabled = active;
  $('pageLimitNumber').disabled = active;
}
async function send(type,payload={}) {
  if (!activeTabId) throw new Error('Onglet Facebook indisponible.');
  try { return await chrome.tabs.sendMessage(activeTabId,{type,...payload}); }
  catch(error) {
    if (!['PING','GET_STATUS','START'].includes(type)) throw error;
    await chrome.scripting.executeScript({target:{tabId:activeTabId},files:['i18n.js','content.js']});
    return await chrome.tabs.sendMessage(activeTabId,{type,...payload});
  }
}
function showError(error) { showStatus({...lastStatus,phase:'error',detail:String(error?.message || error)}); }
async function init() {
  $('delay').value = localStorage.getItem('fbInvite.delay') || '2500';
  $('manualLimit').value = localStorage.getItem('fbInvite.limit') ?? '0';
  const savedPageLimit=Number(localStorage.getItem('fbInvite.pageLimit') ?? '100');
  const initialPageLimit=Number.isSafeInteger(savedPageLimit) && savedPageLimit >= 0 && savedPageLimit <= 100000 ? savedPageLimit : 100;
  $('pageLimitNumber').value = String(initialPageLimit);
  $('pageLimitRange').value = String(sliderValueFor(initialPageLimit));
  showUnlimitedWarning();
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (!tab || !isFacebook(tab.url)) {
    showStatus({phase:'error', detail:'Ouvre ta Page sur facebook.com. Le mode Page entière n’est pas destiné à Business Suite.', attempts:0});
    return;
  }
  activeTabId=tab.id;
  try { showStatus(await send('GET_STATUS')); } catch(error) { showError(error); }
  setInterval(async()=>{
    try { if (activeTabId) showStatus(await chrome.tabs.sendMessage(activeTabId,{type:'GET_STATUS'})); }
    catch { /* un changement de page peut décharger le script */ }
  },900);
}
async function start(mode) {
  try {
    const options=readOptions();
    if (mode === 'page') {
      if (options.pageLimit === 0 && !window.confirm(TQ.tr(`${DAILY_WARNING}\n\n« Aucune limite » retire uniquement le plafond de l'extension, pas les restrictions de Facebook. Souhaites-tu lancer ce parcours sans plafond ?`))) return;
    }
    const res=await send('START',{mode,options});
    if(res?.error) throw new Error(res.error);
    showStatus(res);
    // La popup se ferme dès que l'action commence (calibrage ou parcours) : elle ne gêne plus la page,
    // et un Échap ou un clic ailleurs ne peut plus être pris pour une interruption. Le suivi est dans le panneau Facebook.
    if (['running','calibrating'].includes(res?.phase)) window.close();
  } catch(error) { showError(error); }
}
// Le cran tout à droite correspond à « Aucune limite » (valeur moteur 0).
// Le champ permet toujours une saisie jusqu'à 100 000, sans limiter le moteur à 5 000.
$('pageLimitRange').addEventListener('input', () => {
  const limit = Number($('pageLimitRange').value) === SLIDER_UNLIMITED ? 0 : Number($('pageLimitRange').value);
  $('pageLimitNumber').value = String(limit);
  localStorage.setItem('fbInvite.pageLimit',String(limit));
  showUnlimitedWarning();
});
$('pageLimitNumber').addEventListener('input', () => {
  const raw=$('pageLimitNumber').value;
  if (raw === '') { $('unlimitedAdvice').hidden=true; return; }
  const val=Number(raw);
  if (Number.isSafeInteger(val) && val>=0 && val<=100000) {
    $('pageLimitRange').value=String(sliderValueFor(val));
    localStorage.setItem('fbInvite.pageLimit',String(val));
    showUnlimitedWarning();
  } else $('unlimitedAdvice').hidden=true;
});
$('startManual').addEventListener('click',()=>start('manual'));
$('startPage').addEventListener('click',()=>start('page'));
$('pause').addEventListener('click',async()=>{
  try {
    if (lastStatus.canContinue && Number(lastStatus.limit) + Number(lastStatus.batchLimit) > CAUTION_THRESHOLD && !window.confirm(TQ.tr(`${DAILY_WARNING}\n\nCette reprise porterait le plafond cumulé à ${(Number(lastStatus.limit) + Number(lastStatus.batchLimit)).toLocaleString('fr-FR')} invitations. Tu peux poursuivre à ta discrétion. Souhaites-tu continuer sans reprendre depuis le début ?`))) return;
    const answer=await send(lastStatus.canContinue?'CONTINUE_LIMIT':lastStatus.phase==='paused'?'RESUME':'PAUSE');
    showStatus(answer);
    if (answer?.phase==='running') window.close(); // reprise : on laisse la page libre
  } catch(error) { showError(error); }
});
$('stop').addEventListener('click',async()=>{
  try { showStatus(await send('STOP')); } catch(error) { showError(error); }
});
$('copyDiagnostics').addEventListener('click',async()=>{
  const notice=$('diagnosticsCopied');
  let report;
  try {
    report=await send('GET_DIAGNOSTICS');
    if (report?.error) throw new Error(report.error);
  } catch(error) {
    // 2.25.0 : le rapport reste copiable même si la page Facebook ne répond pas (onglet rechargé, script absent…).
    report={schema:'reaction-inviter-diagnostics-v1',version:chrome.runtime.getManifest().version,
      erreur_page:String(error?.message||error).slice(0,200),
      dernier_etat_connu:{phase:lastStatus.phase,mode:lastStatus.mode,detail:String(lastStatus.detail||'').slice(0,200),
        publications_finies:lastStatus.posts,fenetres_ouvertes:lastStatus.opens,clics_envoyes:lastStatus.attempts,invitations_confirmees:lastStatus.confirmed},
      navigateur:navigator.userAgent.match(/(?:Chrome|Edg|OPR)\/[\d.]+/)?.[0]||null,langue:navigator.language,events:[]};
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(report,null,2));
    notice.textContent=report.erreur_page
      ? 'Rapport minimal copié (la page Facebook ne répond pas : recharge-la ou relance un parcours pour un rapport complet).'
      : `Diagnostic copié : résumé de session et ${report.events?.length||0} événement(s), sans noms ni profils. Colle-le dans un fichier texte.`;
  } catch(error) { notice.textContent=`Impossible de copier le diagnostic : ${error.message}`; }
  notice.hidden=false;
});
init().catch(showError);
