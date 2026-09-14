// @ts-nocheck
"use strict";
/* Momentum Lab — a local-first personal experimentation and reflection app. */

const FOUNDATIONS = [
  {id:"body",  name:"Body",          color:"#ef6a4a"},
  {id:"mind",  name:"Mind",          color:"#4aa3ef"},
  {id:"habits",name:"Habits",        color:"#d4a72c"},
  {id:"think", name:"Thinking",      color:"#9b6bef"},
  {id:"values",name:"Values",        color:"#36cf80"},
  {id:"comm",  name:"Communication", color:"#ef4a9b"},
  {id:"spirit",name:"Spirit",        color:"#4ad6d6"},
];
const F = id => FOUNDATIONS.find(f=>f.id===id) || {name:id,color:"#888"};
const NOTE_TYPES=[["book","Book"],["principle","Principle"],["reminder","Reminder"],["insight","Insight"]];
const AAR_PROMPTS = [
  ["worked","What worked"],["failed","What failed or surprised me"],["lesson","One-line lesson"],
];
const HELP={
  today:"<p>Your daily screen. Check off routine items, log experiment numbers, done. The app never notifies you — open it, act, leave.</p>",
  experiments:"<p><b>Experiments</b> are measured tests: a hypothesis plus numbers, ending in an After Action Report. Use them when you want to know <b>if</b> something works.</p><p><b>Compare</b> shows an experiment's before vs after — photos and metric deltas side by side.</p>",
  routines:"<p><b>Routines</b> are checklists you run on a calendar — e.g. testing 50 stretches. Tick items each day; the <b>Which ones work</b> table lets you Keep or Drop each item. Dropped items leave the daily list, so it shrinks to only what works.</p>",
  ledgers:"<p><b>Predictions</b>: write what you think will happen and how sure you are, then resolve Win/Loss later. Your accuracy % keeps your thinking honest and AI-independent.</p><p><b>Promises</b>: promises to yourself, marked Kept or Broken. Your trust score is the real foundation of discipline.</p>",
  base:"<p>Which of the seven stones you're actually reinforcing. Strength fills from closed experiments you rated and kept; routines and ledgers count as activity.</p>",
  weekly:"<p>End-of-week sweep of every running experiment. If nothing moved, log <b>No change — needs more testing</b> rather than skipping.</p>",
  knowledge:"<p><b>Lessons</b> come automatically from closed experiments. <b>Notes</b> are things you learned but didn't test — book lessons, principles, insights. Search the box to find anything fast.</p>",
  ideas:"<p>A holding pen for sparks. Promote one into an experiment when you're ready to test it.</p>",
};

/* storage */
const KEY="momentumLab_v1";
let S=load();
function load(){ try{ const r=localStorage.getItem(KEY); if(r) return migrate(JSON.parse(r)); }catch(e){} return seed(); }
function migrate(s){ s.experiments=s.experiments||[]; s.routines=s.routines||[]; s.notes=s.notes||[]; s.ideas=s.ideas||[]; s.predictions=s.predictions||[]; s.promises=s.promises||[]; return s; }
function save(){ const d=JSON.stringify(S); localStorage.setItem(KEY,d); try{ if(window.momentumDesk&&window.momentumDesk.save)window.momentumDesk.save(d); }catch(e){} }
function uid(){ return Math.random().toString(36).slice(2,9); }
function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function todayISO(){ return ymd(new Date()); }
function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return ymd(d); }
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function nl(s){ return esc(s).replace(/\n/g,"<br>"); }
function fmt(v){ if(v==null||v==="")return"—"; const n=Number(v); return Number.isInteger(n)?n:(+n.toFixed(2)); }
function numOrNull(v){ return v===""||v==null?null:Number(v); }
function niceDate(){ return new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); }
function fchip(fid){ const f=F(fid); return `<span class="fchip" style="border-color:${f.color};color:${f.color}">${esc(f.name)}</span>`; }
function kpi(v,l){ return `<div class="card" style="text-align:center;padding:11px"><div class="kpi">${v}</div><div class="kpi-l">${l}</div></div>`; }

/* metric math */
function latestValue(exp,mid){ const ls=(exp.logs||[]).filter(l=>l.values&&l.values[mid]!=null&&l.values[mid]!==""); if(!ls.length)return null; ls.sort((a,b)=>(a.date<b.date?1:-1)); return Number(ls[0].values[mid]); }
function changeInfo(m,cur){ if(cur==null||m.baseline==null||m.baseline==="")return{cls:"grey",text:"—",arrow:""}; const base=Number(m.baseline),d=cur-base; if(d===0)return{cls:"grey",text:"0%",arrow:"→"}; const imp=m.dir==="up"?d>0:d<0; const ar=d>0?"▲":"▼"; let mag=base!==0?Math.abs(d/base*100).toFixed(1)+"%":(d>0?"+":"")+(+d.toFixed(2)); return{cls:imp?"green":"red",text:mag,arrow:ar,improved:imp}; }
function expScore(e){ let g=0,r=0,n=0; (e.metrics||[]).forEach(m=>{const c=changeInfo(m,latestValue(e,m.id)); if(c.cls==="green")g++;else if(c.cls==="red")r++;else n++;}); return{g,r,n,total:(e.metrics||[]).length}; }
function scoreBadges(sc){ if(!sc.total)return`<span class="pill">no metrics</span>`; return `<span class="chgbox green">▲${sc.g}</span> <span class="chgbox red">▼${sc.r}</span> <span class="chgbox grey">→${sc.n}</span>`; }

/* nav + router */
const VIEWS=[["today","Today","◎"],["experiments","Experiments","⚗"],["routines","Routines","☑"],["base","Base","⛰"],["weekly","Review","✓"],["knowledge","Knowledge","✦"],["ideas","Ideas","◇"]];
const App={ view:"today", arg:null, go(v,a){ this.view=v; this.arg=a; closeModal(); render(); window.scrollTo(0,0); } };
function renderNav(){
  const c={ experiments:S.experiments.length, routines:S.routines.length, weekly:S.experiments.filter(e=>e.status==="Running").length,
    knowledge:S.notes.length+S.experiments.filter(e=>e.status==="Closed"&&e.aar&&e.aar.lesson).length,
    ideas:S.ideas.filter(i=>i.status!=="dropped"&&i.status!=="proven").length };
  document.getElementById("nav").innerHTML=VIEWS.map(([v,l,i])=>`<button class="${App.view===v?"active":""}" onclick="App.go('${v}')"><span class="ico">${i}</span> ${l}${c[v]>0?`<span class="badge">${c[v]}</span>`:""}</button>`).join("");
}
function render(){
  renderNav();
  const map={ today:viewToday, experiments:viewExperiments, experiment:()=>viewExperiment(App.arg), routines:viewRoutines, routine:()=>viewRoutine(App.arg),
    base:viewBase, weekly:viewWeekly, knowledge:viewKnowledge, ideas:viewIdeas, settings:viewSettings };
  document.getElementById("main").innerHTML=(map[App.view]||viewToday)();
}
function head(title,helpKey,right){ return `<div class="head"><h1>${title}</h1>${helpKey?`<button class="help" onclick="helpModal('${helpKey}')">?</button>`:""}<div class="spacer"></div>${right||""}</div>`; }
function helpModal(k){ showModal(`<h2>${k.charAt(0).toUpperCase()+k.slice(1)}</h2><div class="helpbody">${HELP[k]||""}</div><div class="modal-foot"><button class="btn primary" onclick="closeModal()">Got it</button></div>`); }

/* ================= TODAY ================= */
function viewToday(){
  const running=S.experiments.filter(e=>e.status==="Running");
  const due=running.filter(e=>e.end&&e.end<=todayISO());
  const kept=S.experiments.filter(e=>e.status==="Closed"&&e.verdict==="Keep").length;
  let h=head("Today","today",`<span class="muted" style="font-size:12.5px">${niceDate()}</span>`);
  h+=`<div class="grid c4">${kpi(running.length,"Running")}${kpi(S.routines.length,"Routines")}${kpi(kept,"Kept")}${kpi(S.notes.length,"Notes")}</div>`;
  if(due.length) h+=`<div class="card" style="border-color:rgba(212,167,44,.4);margin-top:12px"><b>${due.length} experiment(s) hit the end date</b> — write the AAR. ${due.map(e=>`<a onclick="App.go('experiment','${e.id}')">${esc(e.title)}</a>`).join(" · ")}</div>`;

  if(S.routines.length){ h+=`<h2>Checklists</h2>`;
    S.routines.forEach(r=>{ const it=activeItems(r),done=(r.done&&r.done[todayISO()])||[],n=it.filter(i=>done.includes(i.id)).length;
      h+=`<div class="card" style="padding:11px 14px"><div class="row" style="align-items:center"><b style="cursor:pointer" onclick="App.go('routine','${r.id}')">${esc(r.title)}</b><div class="spacer"></div><span class="muted" style="font-size:12.5px">${n}/${it.length}</span></div><div class="barmini"><div style="width:${it.length?Math.round(n/it.length*100):0}%"></div></div>
      <details><summary>check off →</summary><div class="list" style="margin-top:8px;border:0">${it.map(i=>checkRow(r.id,i,done.includes(i.id))).join("")||"<span class='muted'>no items</span>"}</div></details></div>`; });
  }
  h+=`<h2>Experiments</h2>`;
  if(!running.length) h+=`<div class="empty">No running experiments. <a onclick="openNewExperiment()">Start one →</a></div>`;
  else h+=`<div class="list">${running.map(e=>`<div class="lrow"><span class="t" onclick="App.go('experiment','${e.id}')">${esc(e.title)}</span><div class="spacer"></div>${scoreBadges(expScore(e))}<button class="btn sm primary" onclick="event.stopPropagation();openLog('${e.id}')">+ Log</button></div>`).join("")}</div>`;
  h+=`<div style="margin-top:14px"><button class="btn primary" onclick="openNewExperiment()">+ Experiment</button> <button class="btn" onclick="openNewRoutine()">+ Routine</button></div>`;
  return h;
}

/* ================= EXPERIMENTS + COMPARE ================= */
let expTab="list", cmpA="", cmpB="";
function viewExperiments(){
  let h=head("Experiments","experiments",`<button class="btn primary" onclick="openNewExperiment()">+ New</button>`);
  h+=`<div class="seg" style="margin-bottom:12px"><button class="${expTab==="list"?"on":""}" onclick="setExpTab('list')">List</button><button class="${expTab==="cmp"?"on":""}" onclick="setExpTab('cmp')">Compare</button></div>`;
  if(expTab==="cmp") return h+compareUI();
  const order={Running:0,Review:1,Planned:2,Closed:3};
  const list=[...S.experiments].sort((a,b)=>(order[a.status]-order[b.status])||(a.title<b.title?-1:1));
  if(!list.length) return h+`<div class="empty">Nothing yet. Test something you already do — steps, reading.</div>`;
  h+=`<div class="list">${list.map(e=>{const sc=expScore(e);return `<div class="lrow" onclick="App.go('experiment','${e.id}')"><span class="status st-${e.status}" style="width:60px;text-align:center;flex:0 0 auto">${e.status}</span><span class="t">${esc(e.title)}</span>${e.foundations.map(fchip).join("")}<div class="spacer"></div><span class="meta">${(e.logs||[]).length} logs</span>${scoreBadges(sc)}</div>`;}).join("")}</div>`;
  return h;
}
function compareUI(){
  const opts=e=>S.experiments.map(x=>`<option value="${x.id}" ${e===x.id?"selected":""}>${esc(x.title)}</option>`).join("");
  let h=`<div class="inline" style="margin-bottom:12px"><div class="field"><label>Experiment A</label><select onchange="setCmpA(this.value)"><option value="">—</option>${opts(cmpA)}</select></div><div class="field"><label>Experiment B (optional)</label><select onchange="setCmpB(this.value)"><option value="">—</option>${opts(cmpB)}</select></div></div>`;
  const cols=[cmpA,cmpB].filter(Boolean).map(id=>S.experiments.find(x=>x.id===id)).filter(Boolean);
  if(!cols.length) return h+`<div class="empty">Pick an experiment to see its before vs after.</div>`;
  h+=`<div class="grid ${cols.length>1?"c2":""}">`;
  cols.forEach(e=>{
    h+=`<div class="card"><h3>${esc(e.title)}</h3>`;
    h+=`<table><thead><tr><th>Metric</th><th class="num">Before</th><th class="num">Now</th><th>Δ</th></tr></thead><tbody>`;
    (e.metrics||[]).forEach(m=>{const cur=latestValue(e,m.id),ci=changeInfo(m,cur);h+=`<tr><td>${esc(m.name)}</td><td class="num">${fmt(m.baseline)}</td><td class="num">${cur==null?"—":fmt(cur)}</td><td><span class="chg ${ci.cls}">${ci.arrow}${ci.text}</span></td></tr>`;});
    h+=`</tbody></table>`;
    const bf=(e.media||[]).filter(x=>x.type==="before"),af=(e.media||[]).filter(x=>x.type==="after");
    if(bf.length||af.length){ h+=`<div class="row" style="margin-top:10px">
      <div class="col"><div class="mtag before">before</div>${bf.map(x=>`<img src="${x.dataUrl}" style="width:100%;border-radius:8px;border:1px solid var(--line)">`).join("")||"<span class='muted' style='font-size:12px'>none</span>"}</div>
      <div class="col"><div class="mtag after">after</div>${af.map(x=>`<img src="${x.dataUrl}" style="width:100%;border-radius:8px;border:1px solid var(--line)">`).join("")||"<span class='muted' style='font-size:12px'>none</span>"}</div></div>`; }
    h+=`</div>`;
  });
  return h+`</div>`;
}
function viewExperiment(id){
  const e=S.experiments.find(x=>x.id===id); if(!e) return `<a class="back" onclick="App.go('experiments')">← back</a><p>Not found.</p>`;
  let h=`<a class="back" onclick="App.go('experiments')">← Experiments</a>`;
  h+=`<div class="head"><h1>${esc(e.title)}</h1> <span class="status st-${e.status}">${e.status}</span><div class="spacer"></div>${e.status!=="Closed"?`<button class="btn sm" onclick="openLog('${e.id}')">+ Log</button> `:""}<button class="btn sm ghost" onclick="openNewExperiment('${e.id}')">edit</button> <button class="btn sm ghost danger" onclick="delExperiment('${e.id}')">delete</button></div>`;
  h+=`<div style="margin:0 0 12px">${e.foundations.map(fchip).join(" ")} <span class="muted" style="font-size:12px">${e.start||"?"} → ${e.end||"open"}</span></div>`;
  h+=`<div class="grid c2"><div class="card"><h3>Hypothesis</h3><div>${nl(e.hypothesis)||"<span class='muted'>—</span>"}</div></div><div class="card"><h3>Success criteria</h3><div class="muted">${nl(e.successCriteria)||"—"}</div></div></div>`;
  h+=`<h2>Metrics</h2>`;
  if(!(e.metrics||[]).length) h+=`<div class="empty">No metrics. Edit to add numbers.</div>`;
  else{ h+=`<div class="list"><table><thead><tr><th>Metric</th><th class="num">Base</th><th class="num">Now</th><th class="num">Target</th><th>Change</th></tr></thead><tbody>`;
    e.metrics.forEach(m=>{const cur=latestValue(e,m.id),ci=changeInfo(m,cur);h+=`<tr><td><b>${esc(m.name)}</b> <span class="muted" style="font-size:11px">${esc(m.unit||"")} ${m.dir==="up"?"↑":"↓"}</span></td><td class="num">${fmt(m.baseline)}</td><td class="num">${cur==null?"—":fmt(cur)}</td><td class="num muted">${m.target!=null&&m.target!==""?fmt(m.target):"—"}</td><td><span class="chgbox ${ci.cls}"><span class="chg ${ci.cls}">${ci.arrow}${ci.text}</span></span></td></tr>`;});
    h+=`</tbody></table></div>`; }
  h+=`<h2>Before / After <div class="spacer"></div><button class="btn sm" onclick="openMedia('${e.id}')">+ Photo</button></h2>`;
  const media=e.media||[];
  if(!media.length) h+=`<div class="empty">No photos.</div>`;
  else{ const bf=media.filter(x=>x.type==="before"),af=media.filter(x=>x.type==="after"); h+=`<div class="media">${[...bf,...af].map(x=>`<div class="mcard"><img src="${x.dataUrl}"><div class="mtag ${x.type}">${x.type}</div><div class="muted" style="font-size:11px">${esc(x.caption||"")} ${x.date||""} <a onclick="delMedia('${e.id}','${x.id}')" style="color:var(--red)">×</a></div></div>`).join("")}</div>`; }
  h+=`<h2>Check-ins</h2>`;
  const logs=[...(e.logs||[])].sort((a,b)=>a.date<b.date?1:-1);
  if(!logs.length) h+=`<div class="empty">None yet.</div>`;
  else{ h+=`<div class="list"><table><thead><tr><th>Date</th>${(e.metrics||[]).map(m=>`<th class="num">${esc(m.name)}</th>`).join("")}<th>Note</th></tr></thead><tbody>`;
    logs.forEach(l=>{h+=`<tr><td>${l.date}</td>${(e.metrics||[]).map(m=>`<td class="num">${l.values&&l.values[m.id]!=null&&l.values[m.id]!==""?fmt(l.values[m.id]):"·"}</td>`).join("")}<td class="muted" style="font-size:12.5px">${esc(l.note||"")}</td></tr>`;});
    h+=`</tbody></table></div>`; }
  if((e.weeklyNotes||[]).length){ h+=`<h2>Weekly notes</h2><div class="card">${[...e.weeklyNotes].reverse().map(w=>`<div style="border-bottom:1px solid var(--line);padding:6px 0"><span class="muted" style="font-size:11.5px">${w.date}</span> ${nl(w.text)}</div>`).join("")}</div>`; }
  h+=`<h2>After Action Report</h2>`;
  if(e.status==="Closed"){ h+=`<div class="card"><div class="row" style="align-items:center"><span class="status st-Closed">Closed · ${esc(e.verdict)}</span><div class="spacer"></div><button class="btn sm ghost" onclick="openAAR('${e.id}')">edit</button></div>`;
    AAR_PROMPTS.forEach(([k,l])=>{if(e.aar&&e.aar[k])h+=`<div style="margin-top:9px"><div class="kpi-l">${l}</div><div>${nl(e.aar[k])}</div></div>`;}); h+=`</div>`; }
  else h+=`<div class="card"><button class="btn primary" onclick="openAAR('${e.id}')">Write AAR &amp; close</button></div>`;
  return h;
}

/* ================= ROUTINES ================= */
let calY,calM,selDate;
function routine(id){ return S.routines.find(r=>r.id===id); }
function activeItems(r){ return (r.items||[]).filter(i=>i.status!=="drop"); }
function itemCount(r,id){ let n=0; for(const d in (r.done||{})) if(r.done[d].includes(id))n++; return n; }
function itemLast(r,id){ let last=null; for(const d in (r.done||{})) if(r.done[d].includes(id)&&(!last||d>last))last=d; return last; }
function dayCount(r,d){ return (r.done&&r.done[d]||[]).length; }
function checkRow(rid,it,on){ return `<div class="check ${on?"on":""}"><div class="box" onclick="toggleItem('${rid}','${it.id}')">✓</div><div class="nm" onclick="toggleItem('${rid}','${it.id}')">${esc(it.name)}</div>${it.tag?`<span class="tg">${esc(it.tag)}</span>`:""}</div>`; }
function viewRoutines(){
  let h=head("Routines","routines",`<button class="btn primary" onclick="openNewRoutine()">+ New</button>`);
  if(!S.routines.length) return h+`<div class="empty">No routines. Make one and paste your list of items.</div>`;
  h+=`<div class="list">${S.routines.map(r=>{const it=r.items||[],keep=it.filter(i=>i.status==="keep").length,drop=it.filter(i=>i.status==="drop").length,days=Object.keys(r.done||{}).length;
    return `<div class="lrow" onclick="App.go('routine','${r.id}')"><span class="t">${esc(r.title)}</span>${r.foundations.map(fchip).join("")}<div class="spacer"></div><span class="meta">${it.length} items · ${days}d</span> <span class="statustag ss-keep">${keep}</span> <span class="statustag ss-drop">${drop}</span></div>`;}).join("")}</div>`;
  return h;
}
function viewRoutine(id){
  const r=routine(id); if(!r) return `<a class="back" onclick="App.go('routines')">← back</a><p>Not found.</p>`;
  if(selDate==null){ selDate=todayISO(); const d=new Date(); calY=d.getFullYear(); calM=d.getMonth(); }
  const items=r.items||[],act=activeItems(r),doneSel=(r.done&&r.done[selDate])||[];
  let h=`<a class="back" onclick="App.go('routines')">← Routines</a>`;
  h+=`<div class="head"><h1>${esc(r.title)}</h1><button class="help" onclick="helpModal('routines')">?</button><div class="spacer"></div><button class="btn sm" onclick="openBulkItems('${r.id}')">+ Items</button> <button class="btn sm ghost" onclick="openNewRoutine('${r.id}')">edit</button> <button class="btn sm ghost danger" onclick="delRoutine('${r.id}')">delete</button></div>`;
  h+=`<div style="margin-bottom:12px">${r.foundations.map(fchip).join(" ")}</div>`;
  h+=`<div class="row"><div class="col" style="min-width:280px"><h2>Checklist — ${selDate===todayISO()?"today":esc(selDate)}</h2><div class="list">${act.length?act.map(i=>checkRow(r.id,i,doneSel.includes(i.id))).join(""):`<div class="empty" style="border:0">No active items.</div>`}</div></div>
  <div class="col" style="flex:0 0 auto"><h2>Calendar</h2>${calendarHTML(r)}</div></div>`;
  h+=`<h2>Which ones work?</h2><div class="list"><table><thead><tr><th>Item</th><th>Tag</th><th class="num">Done</th><th>Last</th><th>Verdict</th><th>Note</th><th></th></tr></thead><tbody>
  ${items.map(i=>`<tr><td><b>${esc(i.name)}</b></td><td class="muted">${esc(i.tag||"")}</td><td class="num">${itemCount(r,i.id)}</td><td class="muted" style="font-size:11.5px">${itemLast(r,i.id)||"—"}</td>
  <td><select onchange="setItemStatus('${r.id}','${i.id}',this.value)" style="padding:3px 5px;font-size:12px;width:auto" class="ss-${i.status}">${["testing","keep","drop"].map(s=>`<option value="${s}" ${i.status===s?"selected":""}>${s}</option>`).join("")}</select></td>
  <td><input value="${esc(i.note||"")}" onchange="setItemNote('${r.id}','${i.id}',this.value)" style="padding:3px 6px;font-size:12.5px" placeholder="why"></td>
  <td><a onclick="rmItem('${r.id}','${i.id}')" style="color:var(--red)">×</a></td></tr>`).join("")}
  </tbody></table>${!items.length?`<div class="empty" style="border:0"><a onclick="openBulkItems('${r.id}')">Add a list →</a></div>`:""}</div>`;
  return h;
}
function calendarHTML(r){
  const first=new Date(calY,calM,1),sd=first.getDay(),days=new Date(calY,calM+1,0).getDate();
  let h=`<div class="row" style="max-width:410px;align-items:center;margin-bottom:7px"><button class="btn sm ghost" onclick="calNav(-1)">‹</button><b style="font-size:13px">${first.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</b><div class="spacer"></div><button class="btn sm ghost" onclick="calNav(1)">›</button></div><div class="cal">`+["S","M","T","W","T","F","S"].map(d=>`<div class="hd">${d}</div>`).join("");
  for(let i=0;i<sd;i++)h+=`<div class="cell empty"></div>`;
  for(let d=1;d<=days;d++){const iso=calY+"-"+String(calM+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"),cnt=dayCount(r,iso),cls=(iso===selDate?"sel ":"")+(iso===todayISO()?"today":"");h+=`<div class="cell ${cls}" onclick="selectDay('${iso}')">${d}${cnt?`<span class="cnt">${cnt}</span>`:""}</div>`;}
  return h+`</div>`;
}
function calNav(x){ calM+=x; if(calM<0){calM=11;calY--;} if(calM>11){calM=0;calY++;} render(); }
function selectDay(iso){ selDate=iso; render(); }
function toggleItem(rid,id){ const r=routine(rid); r.done=r.done||{}; const a=r.done[selDate]=r.done[selDate]||[]; const i=a.indexOf(id); if(i>=0)a.splice(i,1);else a.push(id); if(!a.length)delete r.done[selDate]; save(); render(); }
function setItemStatus(rid,id,v){ routine(rid).items.find(x=>x.id===id).status=v; save(); render(); }
function setItemNote(rid,id,v){ routine(rid).items.find(x=>x.id===id).note=v; save(); }
function rmItem(rid,id){ const r=routine(rid); r.items=r.items.filter(x=>x.id!==id); for(const d in r.done)r.done[d]=r.done[d].filter(x=>x!==id); save(); render(); }

/* ================= LEDGERS (predictions + promises) ================= */
let ledTab="pred";
function viewLedgers(){
  let h=head("Ledgers","ledgers");
  h+=`<div class="seg" style="margin-bottom:12px"><button class="${ledTab==="pred"?"on":""}" onclick="ledTab='pred';render()">Predictions</button><button class="${ledTab==="prom"?"on":""}" onclick="ledTab='prom';render()">Promises</button></div>`;
  return h+(ledTab==="pred"?predLedger():promLedger());
}
function predLedger(){
  const ps=S.predictions, resolved=ps.filter(p=>p.resolved), wins=resolved.filter(p=>p.resolved==="win").length;
  const acc=resolved.length?Math.round(wins/resolved.length*100):0;
  let h=`<div class="grid c3" style="margin-bottom:12px">${kpi(ps.filter(p=>!p.resolved).length,"Open")}${kpi(resolved.length,"Resolved")}${kpi(acc+"%","Accuracy")}</div>`;
  h+=`<div class="card"><div class="inline"><div class="field" style="flex:2"><label>Prediction</label><input id="pd_t" placeholder="What you think will happen"></div><div class="field" style="max-width:90px"><label>Sure %</label><input id="pd_c" type="number" min="1" max="99" value="70"></div><div class="field" style="max-width:150px"><label>Resolve by</label><input id="pd_d" type="date"></div><button class="btn primary" onclick="addPred()">Add</button></div></div>`;
  const open=ps.filter(p=>!p.resolved).sort((a,b)=>(a.due||"")<(b.due||"")?-1:1);
  const done=ps.filter(p=>p.resolved).sort((a,b)=>(b.created||"")<(a.created||"")?-1:1);
  if(open.length){ h+=`<h2>Open</h2><div class="list">${open.map(p=>`<div class="lrow"><span class="t" style="white-space:normal">${esc(p.text)}</span><div class="spacer"></div><span class="meta">${p.confidence}% · ${p.due||"no date"}</span><button class="btn sm" style="border-color:rgba(54,207,128,.4);color:var(--green)" onclick="resolvePred('${p.id}','win')">Win</button><button class="btn sm danger" onclick="resolvePred('${p.id}','loss')">Loss</button></div>`).join("")}</div>`; }
  if(done.length){ h+=`<h2>Resolved</h2><div class="list">${done.map(p=>`<div class="lrow"><span class="chg ${p.resolved==="win"?"green":"red"}">${p.resolved==="win"?"✓":"✕"}</span><span class="t" style="white-space:normal">${esc(p.text)}</span><div class="spacer"></div><span class="meta">${p.confidence}%</span><a onclick="delPred('${p.id}')" style="color:var(--red)">×</a></div>`).join("")}</div>`; }
  if(!ps.length) h+=`<div class="empty">No predictions yet. Predict before AI tells you — score yourself later.</div>`;
  return h;
}
function addPred(){ const t=document.getElementById("pd_t").value.trim(); if(!t)return; S.predictions.push({id:uid(),text:t,confidence:numOrNull(document.getElementById("pd_c").value)||70,due:document.getElementById("pd_d").value,resolved:null,created:todayISO()}); save(); render(); }
function resolvePred(id,r){ S.predictions.find(p=>p.id===id).resolved=r; save(); render(); }
function delPred(id){ S.predictions=S.predictions.filter(p=>p.id!==id); save(); render(); }
function promLedger(){
  const ps=S.promises, kept=ps.filter(p=>p.status==="kept").length, broken=ps.filter(p=>p.status==="broken").length;
  const trust=(kept+broken)?Math.round(kept/(kept+broken)*100):0;
  let h=`<div class="grid c3" style="margin-bottom:12px">${kpi(ps.filter(p=>p.status==="open").length,"Open")}${kpi(kept,"Kept")}${kpi(trust+"%","Trust score")}</div>`;
  h+=`<div class="card"><div class="inline"><div class="field" style="flex:2"><label>Promise to yourself</label><input id="pm_t" placeholder="What you committed to"></div><button class="btn primary" onclick="addProm()">Add</button></div></div>`;
  const open=ps.filter(p=>p.status==="open"),done=ps.filter(p=>p.status!=="open").sort((a,b)=>(b.date||"")<(a.date||"")?-1:1);
  if(open.length){ h+=`<h2>Open</h2><div class="list">${open.map(p=>`<div class="lrow"><span class="t" style="white-space:normal">${esc(p.text)}</span><div class="spacer"></div><button class="btn sm" style="border-color:rgba(54,207,128,.4);color:var(--green)" onclick="resolveProm('${p.id}','kept')">Kept</button><button class="btn sm danger" onclick="resolveProm('${p.id}','broken')">Broke</button></div>`).join("")}</div>`; }
  if(done.length){ h+=`<h2>History</h2><div class="list">${done.map(p=>`<div class="lrow"><span class="chg ${p.status==="kept"?"green":"red"}">${p.status==="kept"?"✓":"✕"}</span><span class="t" style="white-space:normal">${esc(p.text)}</span><div class="spacer"></div><span class="meta">${p.date||""}</span><a onclick="delProm('${p.id}')" style="color:var(--red)">×</a></div>`).join("")}</div>`; }
  if(!ps.length) h+=`<div class="empty">No promises yet. Every kept promise is evidence you can trust yourself.</div>`;
  return h;
}
function addProm(){ const t=document.getElementById("pm_t").value.trim(); if(!t)return; S.promises.push({id:uid(),text:t,status:"open",date:todayISO()}); save(); render(); }
function resolveProm(id,s){ const p=S.promises.find(x=>x.id===id); p.status=s; p.date=todayISO(); save(); render(); }
function delProm(id){ S.promises=S.promises.filter(p=>p.id!==id); save(); render(); }

/* ================= BASE ================= */
function foundationScore(fid){
  const exps=S.experiments.filter(e=>e.foundations.includes(fid));
  const rts=S.routines.filter(r=>r.foundations.includes(fid));
  let wsum=0,psum=0;
  exps.forEach(e=>{ const w=e.weight||1; let p;
    if(e.status==="Closed") p=e.verdict==="Keep"?100:e.verdict==="Iterate"?60:e.verdict==="Inconclusive"?40:25;
    else { const sc=expScore(e); p=sc.total?Math.round(sc.g/sc.total*100):0; }
    wsum+=w; psum+=p*w; });
  rts.forEach(r=>{ const items=r.items||[]; const kept=items.filter(i=>i.status==="keep").length; const p=items.length?Math.round(kept/items.length*100):0; wsum+=1; psum+=p; });
  return { score: wsum?Math.round(psum/wsum):0, exps:exps.length, rts:rts.length, closed:exps.filter(e=>e.status==="Closed").length, kept:exps.filter(e=>e.verdict==="Keep").length, active:exps.length+rts.length };
}
function radarSVG(scores){
  const N=scores.length,cx=190,cy=170,R=115;
  const pt=(i,rad)=>{const a=(-90+i*360/N)*Math.PI/180;return [(cx+Math.cos(a)*rad).toFixed(1),(cy+Math.sin(a)*rad).toFixed(1)];};
  let g="";
  [0.25,0.5,0.75,1].forEach(fr=>{ g+=`<polygon points="${scores.map((s,i)=>pt(i,R*fr).join(",")).join(" ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`; });
  scores.forEach((s,i)=>{ const [x,y]=pt(i,R); g+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`; const [lx,ly]=pt(i,R+22); const an=lx>cx+6?"start":lx<cx-6?"end":"middle"; g+=`<text x="${lx}" y="${ly}" fill="${s.f.color}" font-size="11.5" font-weight="700" text-anchor="${an}" dominant-baseline="middle">${s.f.name}</text>`; });
  g+=`<polygon points="${scores.map((s,i)=>pt(i,R*s.score/100).join(",")).join(" ")}" fill="rgba(212,167,44,.28)" stroke="var(--accent)" stroke-width="2"/>`;
  scores.forEach((s,i)=>{const [x,y]=pt(i,R*s.score/100);g+=`<circle cx="${x}" cy="${y}" r="3.6" fill="${s.f.color}"/>`;});
  return `<svg viewBox="0 0 380 330" style="max-width:430px;width:100%">${g}</svg>`;
}
function viewBase(){
  const scores=FOUNDATIONS.map(f=>Object.assign({f},foundationScore(f.id)));
  const closed=S.experiments.filter(e=>e.status==="Closed").length,running=S.experiments.filter(e=>e.status==="Running").length,kept=S.experiments.filter(e=>e.verdict==="Keep").length;
  const overall=Math.round(scores.reduce((n,s)=>n+s.score,0)/scores.length);
  let h=head("The Base","base");
  h+=`<div class="grid c4">${kpi(overall+"%","Overall base")}${kpi(running,"Running")}${kpi(closed,"Closed")}${kpi(kept,"Kept")}</div>`;
  h+=`<div class="card"><h3>Strengths &amp; gaps</h3><div style="text-align:center">${radarSVG(scores)}</div></div>`;
  h+=`<div class="card"><h3>By foundation</h3><table><thead><tr><th>Stone</th><th class="num">Score</th><th class="num">Exp</th><th class="num">Closed</th><th class="num">Kept</th><th>Progress</th></tr></thead><tbody>`;
  scores.slice().sort((a,b)=>b.score-a.score).forEach(s=>{ h+=`<tr><td>${fchip(s.f.id)}</td><td class="num"><b>${s.score}%</b></td><td class="num">${s.exps}</td><td class="num">${s.closed}</td><td class="num">${s.kept}</td><td><div class="barmini" style="width:100px"><div style="width:${s.score}%;background:${s.f.color}"></div></div></td></tr>`; });
  h+=`</tbody></table></div>`;
  const neg=scores.filter(s=>s.active===0);
  if(neg.length) h+=`<div class="card"><div class="kpi-l" style="margin-bottom:8px">Untouched stones — your biggest gaps</div>${neg.map(s=>`<button class="btn sm" onclick="openNewExperiment(null,'${s.f.id}')">+ ${s.f.name}</button> `).join("")}</div>`;
  return h;
}

/* ================= WEEKLY ================= */
function viewWeekly(){
  const running=S.experiments.filter(e=>e.status==="Running");
  let h=head("Weekly Review","weekly",`<span class="muted" style="font-size:12.5px">${niceDate()}</span>`);
  if(!running.length) return h+`<div class="empty">No running experiments.</div>`;
  running.forEach(e=>{ h+=`<div class="card"><div class="row" style="align-items:center"><b style="cursor:pointer" onclick="App.go('experiment','${e.id}')">${esc(e.title)}</b><div class="spacer"></div>${scoreBadges(expScore(e))}</div>`;
    if((e.metrics||[]).length){ h+=`<table style="margin:8px 0"><tbody>`; e.metrics.forEach(m=>{const cur=latestValue(e,m.id),ci=changeInfo(m,cur);h+=`<tr><td><b>${esc(m.name)}</b></td><td class="num">${fmt(m.baseline)} → ${cur==null?"—":fmt(cur)}</td><td><span class="chg ${ci.cls}">${ci.arrow}${ci.text}</span></td></tr>`;}); h+=`</tbody></table>`; }
    h+=`<div class="field"><label>This week</label><textarea id="wk_${e.id}" placeholder="What moved, what didn't"></textarea></div><div class="row"><button class="btn sm primary" onclick="saveWeek('${e.id}')">Save</button><button class="btn sm" onclick="noChangeWeek('${e.id}')">No change — needs more testing</button><button class="btn sm ghost" onclick="openLog('${e.id}')">+ Log values</button></div></div>`; });
  return h;
}
function saveWeek(id){ const e=S.experiments.find(x=>x.id===id),t=document.getElementById("wk_"+id).value.trim(); if(!t){toast("Write a note or use No change.");return;} e.weeklyNotes=e.weeklyNotes||[]; e.weeklyNotes.push({date:todayISO(),text:t}); save(); render(); }
function noChangeWeek(id){ const e=S.experiments.find(x=>x.id===id),ex=document.getElementById("wk_"+id).value.trim(); e.weeklyNotes=e.weeklyNotes||[]; e.weeklyNotes.push({date:todayISO(),text:"No change this week — needs more testing."+(ex?" "+ex:"")}); save(); render(); }

/* ================= KNOWLEDGE (lessons + notes) ================= */
let kTab="lessons", noteQuery="", noteType="all", noteOpen={}, acc={};
function viewKnowledge(){
  let h=head("Knowledge","knowledge",kTab==="notes"?`<button class="btn primary" onclick="openNewNote()">+ Note</button>`:"");
  h+=`<div class="seg" style="margin-bottom:12px"><button class="${kTab==="lessons"?"on":""}" onclick="setKTab('lessons')">Lessons</button><button class="${kTab==="notes"?"on":""}" onclick="setKTab('notes')">Notes</button></div>`;
  return h+(kTab==="lessons"?lessonsList():notesList());
}
function lessonsList(){
  const cl=S.experiments.filter(e=>e.status==="Closed"&&e.aar&&e.aar.lesson).sort((a,b)=>(b.closedAt||"")<(a.closedAt||"")?-1:1);
  if(!cl.length) return `<div class="empty">No lessons yet — they appear when you close an experiment's AAR.</div>`;
  return `<div class="list">${cl.map(e=>`<div class="lrow" onclick="App.go('experiment','${e.id}')"><span class="chg ${e.verdict==="Keep"?"green":e.verdict==="Kill"?"red":"grey"}">●</span><span class="t" style="white-space:normal">${esc(e.aar.lesson)}</span><div class="spacer"></div><span class="meta">${esc(e.verdict)}</span></div>`).join("")}</div>`;
}
function notesList(){
  let h=`<div class="card" style="padding:11px 13px;margin-bottom:12px"><div class="inline"><div class="field" style="flex:2;margin:0"><input id="qa_title" placeholder="Note title — press Enter to add the next" onkeydown="if(event.key===\'Enter\'){event.preventDefault();quickAddNote();}"></div><div class="field" style="max-width:130px;margin:0"><select id="qa_type">${NOTE_TYPES.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></div><button class="btn primary" onclick="quickAddNote()">Add</button></div><textarea id="qa_body" placeholder="Details (optional) — for fast end-of-day entry from your handwriting" style="margin-top:8px;min-height:42px" onkeydown="if(event.key===\'Enter\'&&(event.ctrlKey||event.metaKey)){event.preventDefault();quickAddNote();}"></textarea></div>`;
  h+=`<div style="margin-bottom:4px"><input class="search" placeholder="Search notes…" value="${esc(noteQuery)}" oninput="setNoteQuery(this.value)"></div><div id="notesBox">${notesRows()}</div>`;
  return h;
}
function quickAddNote(){ const t=document.getElementById("qa_title"); if(!t)return; const title=t.value.trim(); if(!title){ t.focus(); return; } S.notes.push({id:uid(),date:todayISO(),type:document.getElementById("qa_type").value,title:title,body:document.getElementById("qa_body").value.trim(),source:""}); save(); t.value=""; document.getElementById("qa_body").value=""; renderNotesOnly(); t.focus(); toast("Note added"); }
function notesRows(){
  const q=noteQuery.trim().toLowerCase();
  let list=[...S.notes];
  if(q) list=list.filter(n=>(n.title+" "+(n.body||"")+" "+(n.source||"")).toLowerCase().includes(q));
  if(!list.length) return `<div class="empty">No matching notes.</div>`;
  let h="";
  NOTE_TYPES.forEach(([v,l])=>{
    const items=list.filter(n=>n.type===v).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1);
    if(!items.length) return;
    const open=!acc["n:"+v];
    h+=`<div class="acc" onclick="noteAccToggle('${v}')"><span class="caret">${open?"▾":"▸"}</span> ${l} <span class="cnt">${items.length}</span></div>`;
    if(open) h+=`<div class="list">${items.map(n=>`<div class="lrow" style="padding:11px 13px" onclick="openNoteRead('${n.id}')"><span class="t" style="font-size:14.5px">${esc(n.title)}</span><div class="spacer"></div><span class="meta">${esc(n.source||"")}</span><a onclick="event.stopPropagation();openNewNote('${n.id}')">edit</a> <a onclick="event.stopPropagation();delNote('${n.id}')" style="color:var(--red)">×</a></div>`).join("")}</div>`;
  });
  return h||`<div class="empty">No matching notes.</div>`;
}
function noteAccToggle(t){ acc["n:"+t]=!acc["n:"+t]; renderNotesOnly(); }
function renderNotesOnly(){ const b=document.getElementById("notesBox"); if(b)b.innerHTML=notesRows(); }
function openNoteRead(id){ const n=S.notes.find(x=>x.id===id); if(!n)return; const tl=NOTE_TYPES.find(t=>t[0]===n.type); showModal(`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span class="ntype nt-${n.type}">${tl?tl[1]:n.type}</span>${n.source?`<span class="muted" style="font-size:12.5px">${esc(n.source)}</span>`:""}<div class="spacer"></div><span class="muted" style="font-size:12px">${n.date||""}</span></div><h2 style="margin:0 0 14px">${esc(n.title)}</h2><div style="font-size:16px;line-height:1.75;white-space:pre-wrap">${n.body?nl(n.body):"<span class='muted'>No details written.</span>"}</div><div class="modal-foot"><button class="btn" onclick="openNewNote('${n.id}')">Edit</button><button class="btn primary" onclick="closeModal()">Close</button></div>`); }
function delNote(id){ confirmBox("Delete this note?",()=>{ S.notes=S.notes.filter(n=>n.id!==id); save(); render(); }); }

/* ================= IDEAS ================= */
function viewIdeas(){
  let h=head("Ideas","ideas",`<button class="btn sm" onclick="copyIdeas()">Copy all</button>`);
  h+=`<div class="card"><div class="inline"><div class="field" style="flex:2"><label>Idea to test someday</label><input id="ideaText" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addIdea();}"></div><div class="field" style="max-width:150px"><label>Category</label><select id="ideaFound">${FOUNDATIONS.map(f=>`<option value="${f.id}">${f.name}</option>`).join("")}</select></div><button class="btn primary" onclick="addIdea()">Capture</button></div></div>`;
  const a=S.ideas.filter(i=>i.status!=="dropped"&&i.status!=="proven");
  if(!a.length) return h+`<div class="empty">No open ideas.</div>`;
  FOUNDATIONS.forEach(f=>{ const items=a.filter(i=>i.foundation===f.id); if(!items.length)return; const open=!acc["i:"+f.id];
    h+=`<div class="acc" style="color:${f.color}" onclick="ideaAccToggle('${f.id}')"><span class="caret">${open?"▾":"▸"}</span> ${f.name} <span class="cnt">${items.length}</span></div>`;
    if(open) h+=`<div class="list">${items.map(ideaRow).join("")}</div>`; });
  const none=a.filter(i=>!FOUNDATIONS.some(f=>f.id===i.foundation));
  if(none.length){ const open=!acc["i:none"]; h+=`<div class="acc" onclick="ideaAccToggle('none')"><span class="caret">${open?"▾":"▸"}</span> Uncategorized <span class="cnt">${none.length}</span></div>${open?`<div class="list">${none.map(ideaRow).join("")}</div>`:""}`; }
  return h;
}
function ideaAccToggle(f){ acc["i:"+f]=!acc["i:"+f]; render(); }
function copyIdeas(){ const a=S.ideas.filter(i=>i.status!=="dropped"&&i.status!=="proven"); if(!a.length){ toast("No ideas to copy"); return; } let lines=[]; FOUNDATIONS.forEach(f=>{ const items=a.filter(i=>i.foundation===f.id); if(!items.length)return; lines.push(f.name+":"); items.forEach(i=>lines.push("\u2022 "+i.text)); lines.push(""); }); const none=a.filter(i=>!FOUNDATIONS.some(f=>f.id===i.foundation)); if(none.length){ lines.push("Uncategorized:"); none.forEach(i=>lines.push("\u2022 "+i.text)); } copyText(lines.join(String.fromCharCode(10)).trim()); }
function copyText(t){ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(function(){toast("Copied");},function(){fallbackCopy(t);}); } else fallbackCopy(t); }
function fallbackCopy(t){ const ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.left="-9999px"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");toast("Copied");}catch(e){toast("Copy failed");} document.body.removeChild(ta); }
function ideaRow(i){ return `<div class="lrow"><span class="t" style="white-space:normal">${esc(i.text)}</span><div class="spacer"></div><select onchange="changeIdeaCat('${i.id}',this.value)" style="width:auto;padding:3px 6px;font-size:12px" title="Category">${FOUNDATIONS.map(f=>`<option value="${f.id}" ${i.foundation===f.id?"selected":""}>${f.name}</option>`).join("")}</select><button class="btn sm primary" onclick="promoteIdea('${i.id}')">→ Experiment</button><a onclick="dropIdea('${i.id}')" style="color:var(--red)">×</a></div>`; }
function changeIdeaCat(id,v){ const i=S.ideas.find(x=>x.id===id); i.foundation=v; save(); render(); }
function addIdea(){ const t=document.getElementById("ideaText").value.trim(); if(!t)return; S.ideas.push({id:uid(),text:t,foundation:document.getElementById("ideaFound").value,status:"raw"}); save(); render(); }
function dropIdea(id){ S.ideas.find(x=>x.id===id).status="dropped"; save(); render(); }
function promoteIdea(id){ const i=S.ideas.find(x=>x.id===id); i.status="testing"; save(); openNewExperiment(null,i.foundation,i.text); }

/* ================= SETTINGS ================= */
function viewSettings(){
  const size=(JSON.stringify(S).length/1024).toFixed(1);
  const desk=!!(window.momentumDesk);
  const sync=desk
    ? `<div class="card" style="border-color:rgba(54,207,128,.45)"><h3>Auto-save is ON ✓</h3><p class="muted" style="margin:0">Desktop app: every change saves itself to a real file on this PC automatically. Nothing to export, nothing to lose.</p></div>`
    : `<div class="card"><h3>Saving</h3><p class="muted" style="margin:0">In the browser, changes save automatically in this browser's storage. Install the desktop build to keep the same experience in a dedicated app with file-backed storage.</p></div>`;
  return head("Data &amp; backup")+sync+`<div class="card"><h3>Backup</h3><p class="muted" style="margin:0 0 9px">${S.experiments.length} experiments · ${S.routines.length} routines · ${S.notes.length} notes · ${S.predictions.length} predictions · ${S.promises.length} promises · ${size} KB.</p>
  <div class="row"><button class="btn" onclick="exportData()">⬇ Export copy</button><label class="btn" style="display:inline-flex;align-items:center">⬆ Import<input type="file" accept="application/json" style="display:none" onchange="importData(this)"></label><button class="btn danger" onclick="wipe()">Reset</button></div></div>`;
}
function exportData(){ const b=new Blob([JSON.stringify(S,null,2)],{type:"application/json"}),a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="momentum-lab-backup-"+todayISO()+".json"; a.click(); }
function importData(input){ const f=input.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{try{S=migrate(JSON.parse(r.result));save();App.go("today");toast("Imported.");}catch(e){toast("Invalid file.");}}; r.readAsText(f); }
function wipe(){ confirmBox("Erase ALL data on this machine? Export first if unsure.",()=>{ localStorage.removeItem(KEY); S=seed(); save(); App.go("today"); }); }

/* ================= MODALS ================= */
let mMetrics=[];
function openNewExperiment(editId,presetFound,presetTitle){
  const e=editId?S.experiments.find(x=>x.id===editId):null;
  mMetrics=e?JSON.parse(JSON.stringify(e.metrics||[])):[];
  const founds=e?e.foundations:(presetFound?[presetFound]:[]);
  showModal(`<h2>${e?"Edit experiment":"New experiment"}</h2>
    <div class="field"><label>Title</label><input id="f_title" value="${esc(e?e.title:(presetTitle||""))}" placeholder="e.g. 30 days of morning mobility"></div>
    <div class="field"><label>Foundations</label><div id="f_founds">${FOUNDATIONS.map(f=>`<label style="display:inline-flex;text-transform:none;gap:5px;margin:0 11px 5px 0;color:${f.color};font-weight:700"><input type="checkbox" style="width:auto" value="${f.id}" ${founds.includes(f.id)?"checked":""}> ${f.name}</label>`).join("")}</div></div>
    <div class="field"><label>Hypothesis — what you'll do and what you expect</label><textarea id="f_hyp" placeholder="I believe [doing X daily] will [result] because ...">${esc(e?e.hypothesis:"")}</textarea></div>
    <div class="field"><label>Success criteria — what counts as a win</label><textarea id="f_succ" placeholder="Defined up front so you can't move the goalposts">${esc(e?e.successCriteria:"")}</textarea></div>
    <div class="inline"><div class="field"><label>Start</label><input type="date" id="f_start" value="${e&&e.start?e.start:todayISO()}"></div><div class="field"><label>End</label><input type="date" id="f_end" value="${e&&e.end?e.end:""}"></div><div class="field"><label>Status</label><select id="f_status">${["Planned","Running"].map(s=>`<option ${((e?e.status:"Running")===s)?"selected":""}>${s}</option>`).join("")}${e&&e.status==="Closed"?`<option selected>Closed</option>`:""}</select></div></div>
    <div class="kpi-l" style="margin:12px 0 6px">Metrics — number, unit, direction</div><div id="metricList"></div>
    <div class="inline" style="margin-top:7px"><div class="field"><label>Name</label><input id="nm_name" placeholder="Bodyweight"></div><div class="field" style="max-width:70px"><label>Unit</label><input id="nm_unit" placeholder="kg"></div><div class="field" style="max-width:130px"><label>Better</label><select id="nm_dir"><option value="down">↓ lower</option><option value="up">↑ higher</option></select></div><div class="field" style="max-width:90px"><label>Base</label><input id="nm_base" type="number" step="any"></div><div class="field" style="max-width:90px"><label>Target</label><input id="nm_target" type="number" step="any"></div><button class="btn sm" onclick="addMetricRow()">Add</button></div>
    <div class="modal-foot"><button class="btn ghost" onclick="attemptClose()">Cancel</button><button class="btn primary" onclick="saveExperiment('${editId||""}')">${e?"Save":"Create"}</button></div>`);
  renderMetricList();
}
function renderMetricList(){ const b=document.getElementById("metricList"); if(!b)return; if(!mMetrics.length){b.innerHTML=`<span class="muted" style="font-size:12.5px">No metrics yet.</span>`;return;}
  b.innerHTML=`<div class="list"><table><tbody>${mMetrics.map((m,i)=>`<tr><td><b>${esc(m.name)}</b> <span class="muted">${esc(m.unit||"")}</span></td><td>${m.dir==="up"?"↑":"↓"}</td><td class="num">${fmt(m.baseline)}→${m.target!=null&&m.target!==""?fmt(m.target):"—"}</td><td><a onclick="rmMetric(${i})" style="color:var(--red)">×</a></td></tr>`).join("")}</tbody></table></div>`; }
function addMetricRow(){ const n=document.getElementById("nm_name").value.trim(); if(!n){toast("Name?");return;} mMetrics.push({id:uid(),name:n,unit:document.getElementById("nm_unit").value.trim(),dir:document.getElementById("nm_dir").value,baseline:numOrNull(document.getElementById("nm_base").value),target:numOrNull(document.getElementById("nm_target").value)}); ["nm_name","nm_unit","nm_base","nm_target"].forEach(id=>document.getElementById(id).value=""); renderMetricList(); }
function rmMetric(i){ mMetrics.splice(i,1); renderMetricList(); }
function saveExperiment(editId){ const t=document.getElementById("f_title").value.trim(); if(!t){toast("Title?");return;} const founds=[...document.querySelectorAll("#f_founds input:checked")].map(c=>c.value); if(!founds.length){toast("Pick a foundation");return;}
  const data={title:t,foundations:founds,hypothesis:document.getElementById("f_hyp").value.trim(),successCriteria:document.getElementById("f_succ").value.trim(),start:document.getElementById("f_start").value,end:document.getElementById("f_end").value,status:document.getElementById("f_status").value,metrics:mMetrics};
  if(editId)Object.assign(S.experiments.find(x=>x.id===editId),data); else S.experiments.push(Object.assign({id:uid(),logs:[],media:[],weeklyNotes:[],aar:{},verdict:"",rating:0},data));
  save(); closeModal(); App.go(editId?"experiment":"experiments",editId||null); }
function delExperiment(id){ confirmBox("Delete this experiment and its logs?",()=>{ S.experiments=S.experiments.filter(x=>x.id!==id); save(); App.go("experiments"); }); }
function openLog(id){ const e=S.experiments.find(x=>x.id===id);
  showModal(`<h2>Check-in · ${esc(e.title)}</h2><div class="field" style="max-width:200px"><label>Date</label><input type="date" id="l_date" value="${todayISO()}"></div>
  ${(e.metrics||[]).length?`<div class="row">${e.metrics.map(m=>`<div class="col field" style="min-width:110px"><label>${esc(m.name)} ${m.unit?`(${esc(m.unit)})`:""}</label><input type="number" step="any" id="lm_${m.id}"></div>`).join("")}</div>`:""}
  <div class="field"><label>Note</label><textarea id="l_note"></textarea></div>
  <div class="modal-foot"><button class="btn ghost" onclick="attemptClose()">Cancel</button><button class="btn primary" onclick="saveLog('${id}')">Save</button></div>`); }
function saveLog(id){ const e=S.experiments.find(x=>x.id===id),values={}; (e.metrics||[]).forEach(m=>{const v=document.getElementById("lm_"+m.id).value; if(v!=="")values[m.id]=Number(v);});
  e.logs=e.logs||[]; e.logs.push({id:uid(),date:document.getElementById("l_date").value,note:document.getElementById("l_note").value.trim(),values}); if(e.status==="Planned")e.status="Running"; save(); closeModal(); render(); }
function openMedia(id){ showModal(`<h2>Add photo</h2><div class="inline"><div class="field"><label>Type</label><select id="md_type"><option value="before">Before</option><option value="after">After</option></select></div><div class="field"><label>Date</label><input type="date" id="md_date" value="${todayISO()}"></div></div><div class="field"><label>Caption</label><input id="md_cap"></div><div class="field"><label>Image</label><input type="file" accept="image/*" id="md_file"></div><div class="modal-foot"><button class="btn ghost" onclick="attemptClose()">Cancel</button><button class="btn primary" onclick="saveMedia('${id}')">Add</button></div>`); }
function saveMedia(id){ const f=document.getElementById("md_file").files[0]; if(!f){toast("Pick an image");return;} const r=new FileReader(); r.onload=()=>{const e=S.experiments.find(x=>x.id===id); e.media=e.media||[]; e.media.push({id:uid(),type:document.getElementById("md_type").value,date:document.getElementById("md_date").value,caption:document.getElementById("md_cap").value.trim(),dataUrl:r.result}); save(); closeModal(); render();}; r.readAsDataURL(f); }
function delMedia(eid,mid){ const e=S.experiments.find(x=>x.id===eid); e.media=e.media.filter(m=>m.id!==mid); save(); render(); }
function openAAR(id){ const e=S.experiments.find(x=>x.id===id),a=e.aar||{};
  let sum=`<div class="card" style="padding:11px"><div class="kpi-l">Auto results</div><table style="margin-top:6px"><tbody>`;
  (e.metrics||[]).forEach(m=>{const cur=latestValue(e,m.id),ci=changeInfo(m,cur);sum+=`<tr><td>${esc(m.name)}</td><td class="num">${fmt(m.baseline)} → ${cur==null?"—":fmt(cur)}</td><td><span class="chg ${ci.cls}">${ci.arrow}${ci.text}</span></td></tr>`;});
  const logged=new Set((e.logs||[]).map(l=>l.date)).size;
  const endRef=(e.end&&e.end<todayISO())?e.end:todayISO();
  const expected=e.start?Math.max(1,Math.round((new Date(endRef)-new Date(e.start))/86400000)+1):logged;
  const adh=expected?Math.min(100,Math.round(logged/expected*100)):0;
  sum+=`<tr><td>Adherence</td><td class="num" colspan="2">${adh}% · ${logged} of ~${expected} days</td></tr></tbody></table></div>`;
  showModal(`<h2>After Action Report</h2>${sum}${AAR_PROMPTS.map(([k,l])=>`<div class="field"><label>${l}</label><textarea id="a_${k}">${esc(a[k]||"")}</textarea></div>`).join("")}
  <div class="field" style="max-width:220px"><label>Verdict</label><select id="a_verdict">${["Keep","Iterate","Kill","Inconclusive"].map(v=>`<option ${e.verdict===v?"selected":""}>${v}</option>`).join("")}</select></div>
  <div class="modal-foot"><button class="btn ghost" onclick="attemptClose()">Cancel</button><button class="btn" onclick="saveAAR('${id}',false)">Draft</button><button class="btn primary" onclick="saveAAR('${id}',true)">Save &amp; close</button></div>`); }
function saveAAR(id,close){ const e=S.experiments.find(x=>x.id===id),a={}; AAR_PROMPTS.forEach(([k])=>a[k]=document.getElementById("a_"+k).value.trim());
  if(close){const m=["worked","failed","lesson"].filter(k=>!a[k]); if(m.length){toast("To close, fill: what worked, what failed, and the one-line lesson.");return;}}
  e.aar=a; e.verdict=document.getElementById("a_verdict").value; if(close){e.status="Closed";e.closedAt=todayISO();} save(); closeModal(); App.go("experiment",id); }
function openNewRoutine(editId){ const r=editId?routine(editId):null;
  showModal(`<h2>${r?"Edit routine":"New routine"}</h2><div class="field"><label>Title</label><input id="r_title" value="${esc(r?r.title:"")}" placeholder="Stretching library"></div>
  <div class="field"><label>Foundations</label><div id="r_founds">${FOUNDATIONS.map(f=>`<label style="display:inline-flex;text-transform:none;gap:5px;margin:0 11px 5px 0;color:${f.color};font-weight:700"><input type="checkbox" style="width:auto" value="${f.id}" ${r&&r.foundations.includes(f.id)?"checked":""}> ${f.name}</label>`).join("")}</div></div>
  ${!r?`<div class="field"><label>Items — one per line (optional tag after comma)</label><textarea id="r_items" style="min-height:110px" placeholder="Neck side stretch, neck&#10;Hamstring reach, legs"></textarea></div>`:""}
  <div class="modal-foot"><button class="btn ghost" onclick="attemptClose()">Cancel</button><button class="btn primary" onclick="saveRoutine('${editId||""}')">${r?"Save":"Create"}</button></div>`); }
function saveRoutine(editId){ const t=document.getElementById("r_title").value.trim(); if(!t){toast("Title?");return;} const founds=[...document.querySelectorAll("#r_founds input:checked")].map(c=>c.value); if(!founds.length){toast("Pick a foundation");return;}
  if(editId){const r=routine(editId);r.title=t;r.foundations=founds;} else{const raw=document.getElementById("r_items").value.split("\n").map(s=>s.trim()).filter(Boolean),items=raw.map(line=>{const p=line.split(",");return{id:uid(),name:p[0].trim(),tag:(p[1]||"").trim(),status:"testing",note:""};}); S.routines.push({id:uid(),title:t,foundations:founds,items,done:{},created:todayISO()});}
  save(); closeModal(); App.go(editId?"routine":"routines",editId||null); }
function delRoutine(id){ confirmBox("Delete this routine and its history?",()=>{ S.routines=S.routines.filter(r=>r.id!==id); save(); App.go("routines"); }); }
function openBulkItems(rid){ showModal(`<h2>Add items</h2><div class="field"><label>One per line (optional tag after comma)</label><textarea id="bi" style="min-height:130px" placeholder="Calf stretch, legs"></textarea></div><div class="modal-foot"><button class="btn ghost" onclick="attemptClose()">Cancel</button><button class="btn primary" onclick="addBulk('${rid}')">Add</button></div>`); }
function addBulk(rid){ const r=routine(rid),raw=document.getElementById("bi").value.split("\n").map(s=>s.trim()).filter(Boolean); raw.forEach(line=>{const p=line.split(",");r.items.push({id:uid(),name:p[0].trim(),tag:(p[1]||"").trim(),status:"testing",note:""});}); save(); closeModal(); render(); }
function openNewNote(editId){ const n=editId?S.notes.find(x=>x.id===editId):null;
  showModal(`<h2>${n?"Edit note":"New note"}</h2><div class="inline"><div class="field" style="flex:2"><label>Title / lesson</label><input id="n_title" value="${esc(n?n.title:"")}" placeholder="The lesson in one line"></div><div class="field"><label>Type</label><select id="n_type">${NOTE_TYPES.map(([v,l])=>`<option value="${v}" ${n&&n.type===v?"selected":""}>${l}</option>`).join("")}</select></div></div>
  <div class="field"><label>Detail</label><textarea id="n_body">${esc(n?n.body:"")}</textarea></div>
  <div class="field"><label>Source</label><input id="n_source" value="${esc(n?n.source:"")}" placeholder="Book + author, person, video"></div>
  <div class="modal-foot"><button class="btn ghost" onclick="attemptClose()">Cancel</button><button class="btn primary" onclick="saveNote('${editId||""}')">${n?"Save":"Add"}</button></div>`); }
function saveNote(editId){ const t=document.getElementById("n_title").value.trim(); if(!t){toast("Title?");return;} const data={title:t,type:document.getElementById("n_type").value,body:document.getElementById("n_body").value.trim(),source:document.getElementById("n_source").value.trim()};
  if(editId)Object.assign(S.notes.find(x=>x.id===editId),data); else S.notes.push(Object.assign({id:uid(),date:todayISO()},data)); save(); closeModal(); render(); }

/* ================= modal helpers ================= */
let modalDirty=false;
function markDirty(){ modalDirty=true; }
function showModal(h){ const m=document.getElementById("modal"); m.innerHTML=h; modalDirty=false; m.oninput=markDirty; m.onchange=markDirty; document.getElementById("overlay").classList.add("show"); }
function closeModal(){ modalDirty=false; document.getElementById("overlay").classList.remove("show"); }
function attemptClose(){ if(modalDirty){ confirmBox("Discard what you typed? It won't be saved.",()=>{ modalDirty=false; closeModal(); }); } else closeModal(); }
document.getElementById("overlay").addEventListener("click",e=>{ if(e.target.id==="overlay")attemptClose(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&document.getElementById("overlay").classList.contains("show"))attemptClose(); });
function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); requestAnimationFrame(()=>t.classList.add("show")); setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=>t.remove(),220); },2400); }
function confirmBox(msg,onYes){ const o=document.createElement("div"); o.className="overlay show"; o.style.zIndex="60"; o.innerHTML=`<div class="modal" style="max-width:420px"><div style="margin-bottom:14px">${esc(msg)}</div><div class="modal-foot"><button class="btn ghost" data-x="n">Cancel</button><button class="btn primary" data-x="y">Yes</button></div></div>`; document.body.appendChild(o); o.addEventListener("click",e=>{ const x=e.target.getAttribute&&e.target.getAttribute("data-x"); if(e.target===o||x==="n"){ o.remove(); } else if(x==="y"){ o.remove(); if(onYes)onYes(); } }); }

/* ================= seed ================= */
function seed(){
  const items=[["Standing hamstring reach","legs"],["Seated forward fold","legs"],["Calf wall stretch","legs"],["Hip flexor lunge","hips"],["Pigeon pose","hips"],["Figure-4 glute","hips"],["Cat-cow","spine"],["Child's pose","spine"],["Cobra","spine"],["Thoracic rotation","spine"],["Neck side stretch","neck"],["Chin tuck","neck"],["Shoulder cross-body","shoulders"],["Doorway chest","shoulders"],["Wrist flexor","arms"],["Triceps overhead","arms"]].map(([n,t])=>({id:uid(),name:n,tag:t,status:"testing",note:""}));
  items[1].status="drop"; items[1].note="No effect"; items[3].status="keep"; items[3].note="Big relief for lower back";
  const done={}; done[addDays(-2)]=[items[0].id,items[3].id,items[6].id,items[10].id]; done[addDays(-1)]=[items[0].id,items[3].id,items[7].id]; done[todayISO()]=[items[3].id];
  return {
    meta:{name:"Momentum Lab",created:todayISO()},
    experiments:[
      {id:uid(),title:"Cut bodyweight with high-protein breakfast",foundations:["body","habits"],hypothesis:"A high-protein breakfast will cut cravings and slowly lower my weight without feeling starved.",why:"The body is the first stone — discipline I can see in numbers builds trust for everything else.",protocol:"40g+ protein breakfast daily. Weigh each morning, waist weekly. No food after 8pm.",successCriteria:"Lose 3kg over 6 weeks, energy 6+/10, waist down 2cm.",start:addDays(-10),end:addDays(32),status:"Running",metrics:[{id:"m1",name:"Bodyweight",unit:"kg",dir:"down",baseline:84,target:81},{id:"m2",name:"Waist",unit:"cm",dir:"down",baseline:92,target:90},{id:"m3",name:"Energy",unit:"/10",dir:"up",baseline:5,target:7}],logs:[{id:uid(),date:addDays(-10),done:"yes",note:"Day 1.",values:{m1:84,m2:92,m3:5}},{id:uid(),date:addDays(-6),done:"yes",note:"Cravings lower.",values:{m1:83.4,m3:6}},{id:uid(),date:addDays(-1),done:"yes",note:"Lighter.",values:{m1:82.8,m2:91,m3:7}}],media:[],weeklyNotes:[{date:addDays(-3),text:"Week 1: down ~1.2kg, energy up."}],aar:{},verdict:"",rating:0},
      {id:uid(),title:"Speed reading — 14 day test",foundations:["mind","think"],hypothesis:"A 15-min daily drill will raise reading speed — but comprehension likely matters more.",why:"The mind is the second stone. The goal isn't more books, it's converting reading into thinking.",protocol:"15 min daily drill. Weekly timed test: WPM then 5-question recall.",successCriteria:"Raise WPM 30% AND keep recall 70%+. If recall drops, speed isn't a win.",start:addDays(-5),end:addDays(9),status:"Running",metrics:[{id:"r1",name:"Reading speed",unit:"wpm",dir:"up",baseline:240,target:312},{id:"r2",name:"Recall",unit:"%",dir:"up",baseline:70,target:75}],logs:[{id:uid(),date:addDays(-5),done:"yes",note:"Baseline.",values:{r1:240,r2:70}},{id:uid(),date:addDays(-1),done:"yes",note:"Faster but recall slipped.",values:{r1:300,r2:60}}],media:[],weeklyNotes:[],aar:{},verdict:"",rating:0},
    ],
    routines:[{id:uid(),title:"Stretching library — find what works",foundations:["body"],items,done,created:addDays(-2)}],
    notes:[
      {id:uid(),date:addDays(-7),type:"principle",title:"Discipline is keeping promises to yourself",body:"Every kept promise is evidence you can trust yourself. That trust is the real foundation, not motivation.",source:"Core belief"},
      {id:uid(),date:addDays(-4),type:"book",title:"Make it obvious, make it easy",body:"Design the environment so the right action is the path of least resistance. Don't rely on willpower.",source:"Atomic Habits — James Clear"},
      {id:uid(),date:addDays(-1),type:"reminder",title:"Answer first, then ask AI",body:"Form your own view before reaching for AI, or you outsource the thinking that builds the base.",source:"Thinking pillar"},
    ],
    predictions:[{id:uid(),text:"I'll hold 5am wake for 7 straight days",confidence:60,due:addDays(7),resolved:null,created:todayISO()},{id:uid(),text:"Protein breakfast cuts my afternoon snacking",confidence:80,due:addDays(-1),resolved:"win",created:addDays(-8)}],
    promises:[{id:uid(),text:"Stretch before bed tonight",status:"open",date:todayISO()},{id:uid(),text:"No phone first 30 min after waking",status:"kept",date:addDays(-1)},{id:uid(),text:"Read 10 pages yesterday",status:"broken",date:addDays(-1)}],
    ideas:[{id:uid(),text:"Nightly 10-min mobility before bed",foundation:"body",status:"raw"},{id:uid(),text:"One difficult conversation per week, logged",foundation:"comm",status:"raw"}],
  };
}

/* ===== boot — desktop app loads from its real data file, browser falls back to local storage ===== */

function setKTab(v){ kTab=v; render(); }
function setNoteType(v){ noteType=v; render(); }
function setExpTab(v){ expTab=v; render(); }
function setCmpA(v){ cmpA=v; render(); }
function setCmpB(v){ cmpB=v; render(); }
function setNoteQuery(v){ noteQuery=v; renderNotesOnly(); }

;try{Object.assign(window,{ App, copyIdeas, noteAccToggle, ideaAccToggle, setKTab, setNoteType, setExpTab, setCmpA, setCmpB, setNoteQuery, activeItems, addBulk, addDays, addIdea, addMetricRow, addPred, addProm, attemptClose, calNav, calendarHTML, changeIdeaCat, changeInfo, checkRow, closeModal, compareUI, confirmBox, dayCount, delExperiment, delMedia, delNote, delPred, delProm, delRoutine, dropIdea, esc, expScore, exportData, fchip, fmt, foundationScore, head, helpModal, ideaRow, importData, itemCount, itemLast, kpi, latestValue, lessonsList, load, markDirty, migrate, niceDate, nl, noChangeWeek, notesList, notesRows, numOrNull, openAAR, openBulkItems, openLog, openMedia, openNewExperiment, openNewNote, openNewRoutine, openNoteRead, predLedger, promLedger, promoteIdea, quickAddNote, radarSVG, render, renderMetricList, renderNav, renderNotesOnly, resolvePred, resolveProm, rmItem, rmMetric, routine, save, saveAAR, saveExperiment, saveLog, saveMedia, saveNote, saveRoutine, saveWeek, scoreBadges, seed, selectDay, setItemNote, setItemStatus, showModal, toast, todayISO, toggleItem, uid, viewBase, viewExperiment, viewExperiments, viewIdeas, viewKnowledge, viewLedgers, viewRoutine, viewRoutines, viewSettings, viewToday, viewWeekly, wipe, ymd });}catch(e){}
(async function(){
  try{ if(window.momentumDesk&&window.momentumDesk.load){ const fd=await window.momentumDesk.load(); if(fd&&fd.trim()){ try{ S=migrate(JSON.parse(fd)); localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} } } }catch(e){}
  save(); render();
})();
