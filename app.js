const STORAGE_KEY = 'island-book-understanding-v4';
const $ = s => document.querySelector(s);
const validIds = new Set(bank.flatMap(c => c.questions.map(q => q.id)));
let records = {};
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const [id, value] of Object.entries(saved)) {
      if (validIds.has(id) && value && typeof value.correct === 'boolean') records[id] = {correct:value.correct};
    }
  }
} catch {}
let current = 0, index = 0, queue = [], reviewing = false, options = [], runResults = [];
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {} }
function shuffled(q) {
  const a = q.options.map((text,n) => ({text,n}));
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function stats() {
  const entries = Object.values(records);
  $('#done').textContent = entries.length;
  $('#total').textContent = TOTAL_QUESTIONS;
  $('#progress').style.width = entries.length / TOTAL_QUESTIONS * 100 + '%';
  $('#wrongCount').textContent = entries.filter(v => !v.correct).length;
  $('#chapters').innerHTML = bank.map(c => {
    const done=c.questions.filter(q => records[q.id]).length;
    return `<button class="chapter ${c.id===current&&!reviewing?'active':''}" data-id="${c.id}" ${c.id===current&&!reviewing?'aria-current="true"':''}><b>${String(c.id+1).padStart(2,'0')}</b><span>${c.title}</span><em>${done}/${c.questions.length}</em></button>`;
  }).join('');
  document.querySelectorAll('.chapter').forEach(el => el.onclick=() => {
    start(+el.dataset.id);
    if (matchMedia('(max-width:800px)').matches) $('#practice').scrollIntoView({behavior:'smooth',block:'start'});
  });
}
function start(c, singleIndex = null) {
  reviewing=false; current=c; index=0; runResults=[];
  queue=singleIndex===null?bank[c].questions.map((q,i) => [c,i]):[[c,singleIndex]]; render();
}
function render() {
  if (index < queue.length) current=queue[index][0];
  stats();
  renderPoints();
  if (index >= queue.length) {
    $('#practice').innerHTML=`<div class="complete"><div class="seal">✓</div><div class="eyebrow">UNDERSTAND THE MECHANISM</div><h3>${reviewing?'本轮错题练习完成':'这一章，已完成。'}</h3><p>本轮 ${queue.length} 题，答对 ${runResults.filter(Boolean).length} 题。<br>试着不用选项，自己复述一次因果链。</p><button class="primary" id="again">再练一遍</button> <button class="primary" id="nextChapter">${reviewing?'返回章节练习':current<bank.length-1?'下一章 →':'回到第一章'}</button></div>`;
    $('#again').onclick=() => {index=0;runResults=[];render();};
    $('#nextChapter').onclick=() => start(reviewing?0:(current+1)%bank.length);
    return;
  }
  const [c,i]=queue[index], chapter=bank[c], q=chapter.questions[i]; current=c;
  options=shuffled(q);
  $('#practice').innerHTML=`<div class="question-meta"><span>${reviewing?'错题重练 · ':''}第 ${String(c+1).padStart(2,'0')} 章 · ${chapter.title}</span><span class="tag">${q.kind}</span></div><div class="concept">本章主题 · ${chapter.topic}</div><h3 id="questionTitle" tabindex="-1">${q.q}</h3><div id="options">${options.map((o,n)=>`<button class="option" data-option="${n}"><b>${'ABCD'[n]}</b><span>${o.text}</span></button>`).join('')}</div><div id="feedback"></div><div class="question-bottom"><span>${String(index+1).padStart(2,'0')} / ${String(queue.length).padStart(2,'0')} · 选择最准确的一项</span><span id="nextSlot">选择后查看观点与出处</span></div>`;
  document.querySelectorAll('.option').forEach(el=>el.onclick=()=>answer(+el.dataset.option,c,i,q));
}
function answer(n,c,i,q) {
  const correct=options[n].n===q.answer;
  records[q.id]={correct};runResults[index]=correct;persist();
  document.querySelectorAll('.option').forEach((el,j)=>{
    el.disabled=true;
    if(options[j].n===q.answer)el.classList.add('correct');
    else if(j===n)el.classList.add('wrong');
  });
  const selectedNote=correct?'':`<div class="analysis-block chosen-view"><b>所选观点与本章论证的区别</b><p>${q.optionRationales[options[n].n]}</p></div>`;
  const comparison=`<details class="option-comparison"><summary>查看四个选项的观点差异</summary><p class="comparison-note">按题意辨认作者的论证。这些不同解释不代表任何特定学派的正式立场，也不意味着在所有情境下都不成立。</p><ol>${options.map((o,j)=>`<li><b>${'ABCD'[j]} · ${o.n===q.answer?'本题应选':'另一种解释'}</b><p class="comparison-option">${o.text}</p><p>${q.optionRationales[o.n]}</p></li>`).join('')}</ol></details>`;
  $('#feedback').innerHTML=`<div class="feedback"><strong>${correct?'✓ 回答正确':'所选答案不够准确'} · 正确答案 ${'ABCD'[options.findIndex(o=>o.n===q.answer)]}</strong>${selectedNote}<div class="analysis-block"><b>作者为什么这样认为</b><p>${q.explanation}</p></div>${comparison}<div class="analysis-block boundary"><b>对应作者观点 · ${q.pointId}</b><p>${q.claim}</p></div><div class="source-line">原书：第 ${c+1} 章《${bank[c].title}》 · PDF 第 ${q.source.pdfPage} 页<br>定位词：${q.source.locator}</div></div>`;
  $('#nextSlot').innerHTML=`<button class="primary" id="next">${index+1===queue.length?'查看本轮结果':'下一题 →'}</button>`;
  $('#next').onclick=()=>{index++;render();$('#practice').scrollIntoView({behavior:'smooth',block:'start'});$('#questionTitle')?.focus({preventScroll:true});};
  stats();
  renderPoints();
}
$('#continue').onclick=()=>{
  const c=bank.findIndex(ch=>ch.questions.some(q=>!records[q.id]));start(c<0?0:c);
  $('#practice').scrollIntoView({behavior:'smooth',block:'start'});
};
$('#review').onclick=()=>{
  queue=[];bank.forEach(c=>c.questions.forEach((q,i)=>{if(records[q.id]?.correct===false)queue.push([c.id,i]);}));
  if(!queue.length){
    $('#practice').innerHTML='<div class="complete"><div class="seal">☀</div><h3>目前没有错题</h3><p>先开始章节练习，答错的题会出现在这里。</p><button class="primary" id="begin">开始练习</button></div>';
    $('#begin').onclick=()=>start(0);
  }else{reviewing=true;index=0;runResults=[];render();}
  $('#practice').scrollIntoView({behavior:'smooth',block:'start'});
};
$('#reset').onclick=()=>{if(confirm('清除这个浏览器保存的章节理解练习记录？')){records={};persist();start(0);}};
function renderPoints() {
  const c=bank[current];
  $('#pointPanelTitle').textContent=`第 ${current+1} 章观点清单 · ${c.questions.length} 条 / ${c.questions.length} 题`;
  $('#chapterPoints').innerHTML=c.questions.map((q,i)=>`<li><div class="point-label"><span>${q.pointId}</span><em class="${records[q.id]?.correct?'understood':''}">${records[q.id]?records[q.id].correct?'已答对':'待巩固':'未练习'}</em></div><p>${q.claim}</p><div class="point-actions"><small>PDF 第 ${q.source.pdfPage} 页 · 定位词：${q.source.locator}</small><button class="quiet point-practice" data-question="${i}">练这一题 →</button></div></li>`).join('');
  document.querySelectorAll('.point-practice').forEach(el=>el.onclick=()=>{start(current,+el.dataset.question);$('#practice').scrollIntoView({behavior:'smooth',block:'start'});});
}
$('#coverageSummary').innerHTML=`<table><thead><tr><th>章节</th><th>归纳观点</th><th>对应单选题</th></tr></thead><tbody>${bank.map(c=>`<tr><td><button class="quiet coverage-chapter" data-chapter="${c.id}">第 ${c.id+1} 章 · ${c.title}</button></td><td>${c.questions.length}</td><td>${c.questions.length}</td></tr>`).join('')}</tbody><tfoot><tr><td>合计（按章归纳）</td><td>${TOTAL_QUESTIONS}</td><td>${TOTAL_QUESTIONS}</td></tr></tfoot></table>`;
document.querySelectorAll('.coverage-chapter').forEach(el=>el.onclick=()=>{start(+el.dataset.chapter);$('#pointPanel').open=true;$('#pointPanel').scrollIntoView({behavior:'smooth',block:'start'});});
start(0);
