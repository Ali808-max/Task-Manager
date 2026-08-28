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
  localStorage.setItem(KEY,JSON.stringify(tasks));
  render();
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
function openAdd(pref={}){$('taskForm').reset();$('taskId').value='';$('dialogTitle').textContent='Add Task';$('priority').value=pref.priority||'medium';$('dueDate').value=pref.dueDate||today();$('dueTime').value=pref.dueTime||'';$('category').value=pref.category||'';$('recurring').value=pref.recurring||'';$('reminder').value=pref.reminder||'';$('taskTitle').value=pref.title||'';$('description').value=pref.description||'';$('taskDialog').showModal()}
function editTask(id){let t=tasks.find(x=>x.id===id);if(!t)return;openAdd(t);$('taskId').value=t.id;$('dialogTitle').textContent='Edit Task'}
function deleteTask(id){if(confirm('Delete this task?')){tasks=tasks.filter(t=>t.id!==id);save()}}
function toggleTask(id){let t=tasks.find(x=>x.id===id);if(!t)return;t.status=t.status==='completed'?'pending':'completed';t.completedAt=t.status==='completed'?new Date().toISOString():'';save()}
$('taskForm').onsubmit=e=>{e.preventDefault();let id=$('taskId').value,t=tasks.find(x=>x.id===id);if(!t){t={id:uid(),createdAt:new Date().toISOString(),status:'pending'};tasks.push(t)}Object.assign(t,{title:$('taskTitle').value.trim(),description:$('description').value.trim(),priority:$('priority').value,category:$('category').value.trim(),dueDate:$('dueDate').value,dueTime:$('dueTime').value,recurring:$('recurring').value,reminder:$('reminder').value});save();$('taskDialog').close()};$('closeDialog').onclick=()=>$('taskDialog').close();
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

// Real microphone/voice input using the browser Speech Recognition API.
let recognition = null;
let listening = false;

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('voiceBtn');
  if (!btn) return;

  if (!SpeechRecognition) {
    btn.title = 'Voice input is not supported by this browser';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = navigator.language || 'en-IN';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    btn.textContent = '⏹️';
    btn.title = 'Listening… tap to stop';
  };

  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || '';
    if (text) {
      const box = $('aiInput');
      box.value = box.value ? `${box.value} ${text}` : text;
      box.focus();
    }
  };

  recognition.onerror = (event) => {
    listening = false;
    btn.textContent = '🎤';
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      alert('Microphone permission was blocked. In Chrome, open Site settings for this website and allow Microphone, then try again.');
    } else if (event.error === 'no-speech') {
      alert('I did not hear anything. Tap the microphone and speak clearly.');
    } else {
      alert('Voice input error: ' + event.error);
    }
  };

  recognition.onend = () => {
    listening = false;
    btn.textContent = '🎤';
    btn.title = 'Voice input';
  };

  btn.onclick = () => {
    if (listening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (e) {
      // Ignore the harmless "already started" case.
    }
  };
}

setupVoice();

$('apiUrl').value=settings.apiUrl||'';$('aiUrl').value=settings.aiUrl||'';$('saveSettings').onclick=()=>{settings.apiUrl=$('apiUrl').value.trim();localStorage.setItem(SET,JSON.stringify(settings));$('syncStatus').textContent=settings.apiUrl?'API configured':'Not configured'};$('saveAI').onclick=()=>{settings.aiUrl=$('aiUrl').value.trim();localStorage.setItem(SET,JSON.stringify(settings));alert('AI endpoint saved.')};
$('syncBtn').onclick=async()=>{if(!settings.apiUrl){alert('Add the working Google Apps Script /exec URL first.');return}$('syncStatus').textContent='Syncing…';try{let r=await fetch(settings.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'sync',tasks})}),d=await r.json();if(d.tasks){tasks=d.tasks;localStorage.setItem(KEY,JSON.stringify(tasks));render()}$('syncStatus').textContent='Synced '+new Date().toLocaleString()}catch(e){$('syncStatus').textContent='Sync failed: '+e.message}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden')}};window.addEventListener('appinstalled',()=>$('installBtn').classList.add('hidden'));
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'/Task-Manager/'}).catch(console.error);$('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});$('syncStatus').textContent=settings.apiUrl?'API configured':'Not configured';render();
