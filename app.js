const KEY='taskflow_ai_v3_tasks',SET='taskflow_ai_v3_settings';let tasks=JSON.parse(localStorage.getItem(KEY)||'[]'),settings=JSON.parse(localStorage.getItem(SET)||'{}'),deferredPrompt=null,aiDraft=null;
const $=id=>document.getElementById(id),today=()=>new Date().toISOString().slice(0,10),uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let syncTimer=null;
let syncInProgress=false;

function queueAutoSync(){
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>autoSync(),1200);
}
async function autoSync(){
  if(!settings.apiUrl || !navigator.onLine || syncInProgress) return;
  syncInProgress=true;
  try{
    const r=await fetch(settings.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'sync',tasks})});
    const d=await r.json();
    if(d.ok && Array.isArray(d.tasks)){
      tasks=d.tasks;
      localStorage.setItem(KEY,JSON.stringify(tasks));
      if($('syncStatus')) $('syncStatus').textContent='✓ Auto-synced '+new Date().toLocaleTimeString();
      render();
    } else if($('syncStatus')) $('syncStatus').textContent='Sync error: '+(d.error||'Unknown error');
  }catch(e){
    if($('syncStatus')) $('syncStatus').textContent='Offline — changes saved on device';
  }finally{ syncInProgress=false; }
}
function save(){
  const now = new Date().toISOString();

  tasks.forEach(t => {
    if (!t.updatedAt) {
      t.updatedAt = now;
    }
  });

  localStorage.setItem(KEY, JSON.stringify(tasks));
  render();

  // Android APK: keep reminders in sync with task state.
  if (window.TaskFlowReminder) {
    try {
      if (typeof window.TaskFlowReminder.scheduleAll === 'function') {
        window.TaskFlowReminder.scheduleAll(JSON.stringify(tasks));
      } else if (typeof window.TaskFlowReminder.scheduleTask === 'function') {
        const changed = tasks[tasks.length - 1];
        if (changed) window.TaskFlowReminder.scheduleTask(JSON.stringify(changed));
      }
    } catch (e) {}
  }

  queueAutoSync();
}
window.addEventListener('online',()=>{if($('syncStatus')&&settings.apiUrl)$('syncStatus').textContent='Internet restored — syncing…';autoSync()});
window.addEventListener('offline',()=>{if($('syncStatus')&&settings.apiUrl)$('syncStatus').textContent='Offline — changes saved on device'});
setInterval(()=>{if(navigator.onLine)autoSync()},5*60*1000);

function overdue(t){return t.status!=='completed'&&t.dueDate&&t.dueDate<today()}
function card(t){return `<article class="task ${t.priority} ${t.status==='completed'?'done':''}"><div class="task-row"><button class="check" onclick="toggleTask('${t.id}')"></button><div style="flex:1"><div class="task-title">${esc(t.title)}</div>${t.description?`<div class="meta">${esc(t.description)}</div>`:''}<div class="meta">${t.dueDate||'No due date'}${t.dueTime?' • '+t.dueTime:''}${t.recurring?' • ↻ '+t.recurring:''}${t.reminder?' • 🔔':''}${overdue(t)?' • ⚠️ Overdue':''}${t.category?' • '+esc(t.category):''}</div></div><div class="task-actions"><button onclick="editTask('${t.id}')">✏️</button><button onclick="deleteTask('${t.id}')">🗑️</button></div></div></article>`}
function sort(a,b){return(a.status==='completed')-(b.status==='completed')||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||({high:0,medium:1,low:2}[a.priority]-({high:0,medium:1,low:2}[b.priority]))}
function render(){let p=tasks.filter(t=>t.status!=='completed'),td=p.filter(t=>t.dueDate===today()),od=p.filter(overdue);$('todayCountSmall').textContent=td.length;$('overdueSmall').textContent=od.length;$('todayList').innerHTML=td.sort(sort).map(card).join('')||'<div class="card muted">No tasks for today 🎉</div>';$('overdueList').innerHTML=od.sort(sort).map(card).join('')||'<div class="card muted">Nothing overdue.</div>';let q=$('search').value.toLowerCase(),sf=$('statusFilter').value,pf=$('priorityFilter').value;let f=tasks.filter(t=>(!q||(t.title+' '+t.description+' '+t.category).toLowerCase().includes(q))&&(sf==='all'||t.status===sf)&&(pf==='all'||t.priority===pf)).sort(sort);$('taskList').innerHTML=f.map(card).join('')||'<div class="card muted">No matching tasks.</div>'}
function nav(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.bottom button').forEach(b=>b.classList.toggle('active',b.dataset.nav===id));scrollTo(0,0)}
function openAdd(pref={}){$('taskForm').reset();$('taskId').value='';$('dialogTitle').textContent='Add Task';$('priority').value=pref.priority||'medium';$('dueDate').value=pref.dueDate||today();$('dueTime').value=pref.dueTime||'';$('category').value=pref.category||'';$('recurring').value=pref.recurring||'';$('reminder').value=pref.reminder||'';document.querySelectorAll('.reminderExtra').forEach(c=>c.checked=Array.isArray(pref.reminders)&&pref.reminders.includes(c.value));$('taskTitle').value=pref.title||'';$('description').value=pref.description||'';$('taskDialog').showModal()}
function editTask(id){let t=tasks.find(x=>x.id===id);if(!t)return;openAdd(t);$('taskId').value=t.id;$('dialogTitle').textContent='Edit Task'}
function deleteTask(id){if(confirm('Delete this task?')){if(window.TaskFlowReminder&&window.TaskFlowReminder.cancelTask)try{window.TaskFlowReminder.cancelTask(id)}catch(e){};tasks=tasks.filter(t=>t.id!==id);save()}}
function toggleTask(id){
  let t = tasks.find(x => x.id === id);
  if(!t) return;

  const now = new Date().toISOString();

  t.status = t.status === 'completed'
    ? 'pending'
    : 'completed';

  t.completedAt =
    t.status === 'completed'
      ? now
      : '';

  t.updatedAt = now;

  save();
}
$('taskForm').onsubmit=e=>{
  e.preventDefault();

  let id = $('taskId').value;
  let t = tasks.find(x => x.id === id);

  const now = new Date().toISOString();

  if(!t){
    t = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      completedAt: ''
    };

    tasks.push(t);
  }

  Object.assign(t,{
    title: $('taskTitle').value.trim(),
    description: $('description').value.trim(),
    priority: $('priority').value,
    category: $('category').value.trim(),
    dueDate: $('dueDate').value,
    dueTime: $('dueTime').value,
    recurring: $('recurring').value,
    reminder: $('reminder').value,
    reminders: Array.from(document.querySelectorAll('.reminderExtra:checked')).map(c=>c.value),
    updatedAt: now
  });

  save();

  $('taskDialog').close();
};
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>nav(b.dataset.nav));$('quickAdd').onclick=$('addTaskBtn').onclick=$('fab').onclick=()=>openAdd();['search','statusFilter','priorityFilter'].forEach(id=>$(id).oninput=render);
function parseAI(text){let s=text.trim(),d=new Date(),out={title:s,description:'',priority:/\b(high|urgent|important)\b/i.test(s)?'high':/\b(low)\b/i.test(s)?'low':'medium',category:/\b(work|office|project|personal|home|shopping)\b/i.exec(s)?.[1]||'',dueDate:'',dueTime:'',recurring:'',reminder:''};
let tm=s.match(/\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);if(tm){let h=+tm[1],m=+(tm[2]||0);if((tm[3]||'').toLowerCase()==='pm'&&h<12)h+=12;if((tm[3]||'').toLowerCase()==='am'&&h===12)h=0;out.dueTime=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')}
if(/\btomorrow\b/i.test(s)){d.setDate(d.getDate()+1);out.dueDate=d.toISOString().slice(0,10)}else if(/\btoday\b/i.test(s)){out.dueDate=today()}else{let day=s.match(/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i);if(day){let names=['sun','mon','tue','wed','thu','fri','sat'],target=names.findIndex(x=>day[1].toLowerCase().startsWith(x)),delta=(target-d.getDay()+7)%7;if(delta===0)delta=7;d.setDate(d.getDate()+delta);out.dueDate=d.toISOString().slice(0,10)}}
if(/\bevery\s+day\b|\bdaily\b/i.test(s))out.recurring='daily';else if(/\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\bweekly\b/i.test(s))out.recurring='weekly';else if(/\bmonthly\b/i.test(s))out.recurring='monthly';
if(/\b(10|ten)\s*(min|minutes)\b/i.test(s))out.reminder='10m';else if(/\b30\s*(min|minutes)\b/i.test(s))out.reminder='30m';else if(/\b1\s*(hour|hr)\b/i.test(s))out.reminder='1h';
out.title=s.replace(/\b(high|urgent|important|low)\b/ig,'').replace(/\b(today|tomorrow|daily|weekly|monthly|at\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/ig,'').replace(/\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/ig,'').replace(/\s+/g,' ').replace(/[,. ]+$/,'').trim()||s;return out}
function showDraft(t){aiDraft=t;$('previewContent').innerHTML='<table>'+[['Task',t.title],['Priority',t.priority],['Due date',t.dueDate||'Not set'],['Due time',t.dueTime||'Not set'],['Category',t.category||'Not set'],['Recurring',t.recurring||'None'],['Reminder',t.reminder||'None']].map(r=>`<tr><td>${r[0]}</td><td><b>${esc(r[1])}</b></td></tr>`).join('')+'</table>';$('aiPreview').classList.remove('hidden')}
$('aiCreate').onclick=()=>{let text=$('aiInput').value;if(!text.trim()){alert('Type a task first.');return}showDraft(parseAI(text))};$('cancelPreview').onclick=()=>{$('aiPreview').classList.add('hidden');aiDraft=null};$('confirmAI').onclick=()=>{if(aiDraft){openAdd(aiDraft);$('aiPreview').classList.add('hidden');$('aiInput').value='';aiDraft=null}};
$('askBtn').onclick=askAI;$('aiAsk').onkeydown=e=>{if(e.key==='Enter')askAI()};function askAI(){let q=$('aiAsk').value.trim();if(!q)return;let c=$('aiChat');c.innerHTML+=`<div class="bubble user">${esc(q)}</div>`;let p=tasks.filter(t=>t.status!=='completed'),reply;if(/overdue/i.test(q))reply=p.filter(overdue).length?`You have ${p.filter(overdue).length} overdue task(s): ${p.filter(overdue).map(t=>t.title).join(', ')}.`:'You have no overdue tasks.';else if(/today/i.test(q))reply=p.filter(t=>t.dueDate===today()).length?`Today: ${p.filter(t=>t.dueDate===today()).map(t=>t.title).join(', ')}.`:'You have no tasks due today.';else if(/priority|priorities/i.test(q)){let h=p.filter(t=>t.priority==='high');reply=h.length?`Your high-priority tasks are: ${h.map(t=>t.title).join(', ')}.`:'No high-priority pending tasks.'}else reply=`You have ${p.length} pending task(s) and ${tasks.length-p.length} completed. For richer AI conversations, add a secure AI endpoint in Settings.`;c.innerHTML+=`<div class="bubble bot">${esc(reply)}</div>`;$('aiAsk').value='';c.scrollTop=c.scrollHeight}

// Voice input: top AI microphone + bottom microphone FAB.
// Chrome uses Web Speech API. Android APK can use the native
// TaskFlowVoice bridge when Web Speech API is unavailable.
let recognition = null;
let listening = false;
let activeVoiceButton = null;
let nativeListening = false;

function setVoiceButtonState(button, recording) {
  if (!button) return;
  button.textContent = recording ? '⏹️' : '🎤';
  button.title = recording ? 'Listening… tap to stop' : 'Voice input';
}

function resetVoiceUI() {
  listening = false;
  nativeListening = false;
  activeVoiceButton = null;
  setVoiceButtonState($('voiceBtn'), false);
  setVoiceButtonState($('micFab'), false);
}

function putVoiceText(text) {
  if (!text) return;
  const box = $('aiInput');
  if (!box) return;
  box.value = box.value ? `${box.value} ${text}` : text;
  box.focus();
  box.dispatchEvent(new Event('input', { bubbles: true }));
}

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const topBtn = $('voiceBtn');
  const bottomBtn = $('micFab');
  if (!topBtn && !bottomBtn) return;

  // Android native fallback.
  if (!SpeechRecognition && window.TaskFlowVoice) {
    window.taskFlowNativeVoiceEvent = function(type) {
      if (type === 'start') {
        listening = true;
        nativeListening = true;
        setVoiceButtonState(activeVoiceButton, true);
      } else if (type === 'end') {
        resetVoiceUI();
      }
    };

    window.taskFlowNativeVoiceResult = function(text) {
      putVoiceText(text);
    };

    window.taskFlowNativeVoiceError = function(error) {
      resetVoiceUI();
      if (error === 'not-allowed') {
        alert('Microphone permission was denied. Please allow Microphone for TaskFlow in Android settings.');
      } else if (error === 'not-supported') {
        alert('Voice recognition is not available on this Android device.');
      } else if (String(error) === '7') {
        alert('I did not hear anything. Tap the microphone and speak clearly.');
      } else {
        alert('Voice input error: ' + error);
      }
    };

    function toggleNative(button) {
      if (nativeListening) {
        if (activeVoiceButton === button && window.TaskFlowVoice.stop) {
          window.TaskFlowVoice.stop();
        }
        return;
      }
      activeVoiceButton = button;
      try {
        window.TaskFlowVoice.start();
      } catch (e) {
        resetVoiceUI();
        alert('Unable to start microphone: ' + (e.message || e));
      }
    }

    if (topBtn) topBtn.onclick = () => toggleNative(topBtn);
    if (bottomBtn) bottomBtn.onclick = () => toggleNative(bottomBtn);
    return;
  }

  // Browser SpeechRecognition.
  if (!SpeechRecognition) {
    if (topBtn) topBtn.title = 'Voice input is not supported by this browser';
    if (bottomBtn) bottomBtn.title = 'Voice input is not supported by this browser';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = navigator.language || 'en-IN';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    setVoiceButtonState(activeVoiceButton, true);
  };

  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || '';
    putVoiceText(text);
  };

  recognition.onerror = (event) => {
    resetVoiceUI();
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      alert('Microphone permission was blocked. Please allow Microphone for TaskFlow and try again.');
    } else if (event.error === 'no-speech') {
      alert('I did not hear anything. Tap the microphone and speak clearly.');
    } else {
      alert('Voice input error: ' + event.error);
    }
  };

  recognition.onend = () => resetVoiceUI();

  function toggleBrowser(button) {
    if (listening) {
      if (activeVoiceButton === button) {
        try { recognition.stop(); } catch (e) { resetVoiceUI(); }
      }
      return;
    }
    activeVoiceButton = button;
    try { recognition.start(); } catch (e) {}
  }

  if (topBtn) topBtn.onclick = () => toggleBrowser(topBtn);
  if (bottomBtn) bottomBtn.onclick = () => toggleBrowser(bottomBtn);
}

setupVoice();

// ============================================================
// TASKFLOW V4 PRODUCTIVITY FEATURES
// ============================================================
const UISET='taskflow_ai_v4_ui';
let uiSettings=JSON.parse(localStorage.getItem(UISET)||'{}');
let calendarCursor=new Date();

function applyTheme(){
  document.body.classList.toggle('dark-mode',uiSettings.dark===true);
  const b=$('darkModeBtn'); if(b) b.textContent=uiSettings.dark?'☀️ Light mode':'🌙 Dark mode';
}
function initNotificationSettings(){
  if($('quietStart')) $('quietStart').value=uiSettings.quietStart||'22:00';
  if($('quietEnd')) $('quietEnd').value=uiSettings.quietEnd||'07:00';
  applyTheme();
}
function renderDashboard(){
  const pending=tasks.filter(t=>t.status!=='completed'), completed=tasks.filter(t=>t.status==='completed'), od=pending.filter(overdue);
  if($('statPending')) $('statPending').textContent=pending.length;
  if($('statCompleted')) $('statCompleted').textContent=completed.length;
  if($('statOverdue')) $('statOverdue').textContent=od.length;
  if($('statRate')) $('statRate').textContent=(tasks.length?Math.round(completed.length/tasks.length*100):0)+'%';
  if($('focusSuggestions')){
    const focus=pending.slice().sort(sort).slice(0,5);
    $('focusSuggestions').innerHTML=focus.map(t=>card(t)).join('')||'<div class="muted">No pending tasks. Great job! 🎉</div>';
  }
}
function calendarKey(d){return d.toISOString().slice(0,10)}
function renderCalendar(){
  if(!$('calendarGrid')) return;
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
  $('calMonth').textContent=calendarCursor.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const first=new Date(y,m,1), start=new Date(y,m,1-first.getDay());
  const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html=names.map(n=>`<div class="cal-name">${n}</div>`).join('');
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i); const key=calendarKey(d); const count=tasks.filter(t=>t.dueDate===key).length;
    html+=`<button class="cal-day ${d.getMonth()!==m?'muted-day':''} ${key===today()?'today-day':''}" data-date="${key}"><b>${d.getDate()}</b>${count?`<span>${count}</span>`:''}</button>`;
  }
  $('calendarGrid').innerHTML=html;
  $('calendarGrid').querySelectorAll('.cal-day').forEach(b=>b.onclick=()=>showCalendarTasks(b.dataset.date));
  showCalendarTasks(today());
}
function showCalendarTasks(date){
  if(!$('calendarTasks')) return;
  const list=tasks.filter(t=>t.dueDate===date).sort(sort);
  $('calendarTasks').innerHTML=`<div class="section-head"><h3>${new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</h3><span>${list.length} task(s)</span></div>`+(list.map(card).join('')||'<div class="card muted">No tasks on this date.</div>');
}
function downloadBackup(){
  const blob=new Blob([JSON.stringify({version:4,exportedAt:new Date().toISOString(),tasks,settings},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='taskflow-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importBackup(file){
  const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!Array.isArray(data.tasks))throw new Error('Invalid backup');tasks=data.tasks;localStorage.setItem(KEY,JSON.stringify(tasks));save();alert('Backup imported successfully.');}catch(e){alert('Could not import backup: '+e.message)}};r.readAsText(file);
}
function breakDownTask(){
  const text=$('aiInput').value.trim(); if(!text){alert('Type a task first.');return;}
  const title=text.replace(/^(plan|organize|prepare|finish|complete)\s+/i,'').trim();
  const parts=['Define the goal','Break the work into small steps','Gather what you need','Do the first step','Review and complete'];
  $('aiChat').innerHTML+=`<div class="bubble bot"><b>🧠 Suggested plan for ${esc(title)}</b><ol>${parts.map(x=>`<li>${x}</li>`).join('')}</ol></div>`;
  nav('ai');
}

// Wire V4 controls without replacing existing handlers.
if($('calPrev')) $('calPrev').onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar()};
if($('calNext')) $('calNext').onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar()};
if($('calToday')) $('calToday').onclick=()=>{calendarCursor=new Date();renderCalendar()};
if($('exportBtn')) $('exportBtn').onclick=downloadBackup;
if($('importBtn')) $('importBtn').onclick=()=>$('importFile').click();
if($('importFile')) $('importFile').onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value=''};
if($('darkModeBtn')) $('darkModeBtn').onclick=()=>{uiSettings.dark=!uiSettings.dark;localStorage.setItem(UISET,JSON.stringify(uiSettings));applyTheme()};
if($('saveNotificationSettings')) $('saveNotificationSettings').onclick=()=>{uiSettings.quietStart=$('quietStart').value;uiSettings.quietEnd=$('quietEnd').value;localStorage.setItem(UISET,JSON.stringify(uiSettings));if(window.TaskFlowReminder&&window.TaskFlowReminder.saveNotificationSettings)try{window.TaskFlowReminder.saveNotificationSettings(uiSettings.quietStart,uiSettings.quietEnd)}catch(e){}alert('Notification settings saved.')};
if($('aiBreakdown')) $('aiBreakdown').onclick=breakDownTask;

// Refresh extra screens whenever the main renderer runs.
const _render=render;
render=function(){_render();renderDashboard();renderCalendar()};

// Android widget refresh hook.
function refreshAndroidWidget(){
  if(window.TaskFlowReminder && typeof window.TaskFlowReminder.refreshWidget==='function'){
    try{window.TaskFlowReminder.refreshWidget(JSON.stringify(tasks));}catch(e){}
  }
}
const _saveOriginal=save;
save=function(){_saveOriginal();refreshAndroidWidget();};

initNotificationSettings();
renderDashboard();
renderCalendar();


$('apiUrl').value=settings.apiUrl||'';$('aiUrl').value=settings.aiUrl||'';$('saveSettings').onclick=()=>{settings.apiUrl=$('apiUrl').value.trim();localStorage.setItem(SET,JSON.stringify(settings));$('syncStatus').textContent=settings.apiUrl?'API configured':'Not configured'};$('saveAI').onclick=()=>{settings.aiUrl=$('aiUrl').value.trim();localStorage.setItem(SET,JSON.stringify(settings));alert('AI endpoint saved.')};
$('syncBtn').onclick=async()=>{if(!settings.apiUrl){alert('Add the working Google Apps Script /exec URL first.');return}$('syncStatus').textContent='Syncing…';try{let r=await fetch(settings.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'sync',tasks})}),d=await r.json();if(d.tasks){tasks=d.tasks;localStorage.setItem(KEY,JSON.stringify(tasks));render()}$('syncStatus').textContent='Synced '+new Date().toLocaleString()}catch(e){$('syncStatus').textContent='Sync failed: '+e.message}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden')}};window.addEventListener('appinstalled',()=>$('installBtn').classList.add('hidden'));
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'/Task-Manager/'}).catch(console.error);$('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});$('syncStatus').textContent=settings.apiUrl?'API configured':'Not configured';render();if(window.TaskFlowReminder&&window.TaskFlowReminder.scheduleAll){try{window.TaskFlowReminder.scheduleAll(JSON.stringify(tasks))}catch(e){}}
