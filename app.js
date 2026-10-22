const STORAGE_KEY = 'island-finance-v3';
const SOURCES = {
  note: {title:'赵裕 · 读书：《小岛经济学》',url:'https://vimerzhao.top/articles/how-an-economy-grows-and-why-it-crashes/',role:'阅读笔记：提供资本、储蓄与利率的讨论线索；题目独立编写，不照搬笔记结论。'},
  review: {title:'捕鲸手 ·《小岛经济学》读书笔记',url:'https://book.douban.com/review/13031831/',role:'读者讨论：启发对价格下降、危机调整成本的进一步提问，读者观点不作为标准答案依据。'},
  critique: {title:'rica7350 · 此书不适合作为入门读物',url:'https://book.douban.com/review/8523377/',role:'批评性书评：提醒区分作者立场、简化模型与现实证据，不代表本站全盘认同该书评。'},
  money: {title:'英格兰银行 · Money creation in the modern economy',url:'https://www.bankofengland.co.uk/quarterly-bulletin/2014/q1/money-creation-in-the-modern-economy',role:'机制补充：现代商业银行的贷款与存款创造，帮助辨认实物借贷模型的适用范围。'},
  qe: {title:'英格兰银行 · Quantitative easing',url:'https://www.bankofengland.co.uk/monetary-policy/quantitative-easing',role:'机制补充：资产购买、债券收益率与货币政策传导。其政策评价与本书立场不同。'},
  inflation: {title:'IMF · 意外通胀与公共财政',url:'https://www.imf.org/en/Blogs/Articles/2023/04/03/fiscal-policy-can-help-tame-inflation-and-protect-the-most-vulnerable',role:'机制补充：未预期通胀如何影响固定名义债权债务及不同家庭。'},
  deflation: {title:'IMF · Deflation: Determinants, Risks, and Policy Options',url:'https://www.imf.org/external/pubs/nft/op/221/index.htm',role:'延伸参考：通缩的原因、债务负担与风险，帮助比较效率降价与债务通缩。'}
};
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
function start(c) {
  reviewing=false; current=c; index=0; runResults=[];
  queue=bank[c].questions.map((q,i) => [c,i]); render();
}
function render() {
  stats();
  if (index >= queue.length) {
    $('#practice').innerHTML=`<div class="complete"><div class="seal">✓</div><div class="eyebrow">UNDERSTAND THE MECHANISM</div><h3>${reviewing?'本轮错题练习完成':'这一章，已完成。'}</h3><p>本轮 ${queue.length} 题，答对 ${runResults.filter(Boolean).length} 题。<br>试着不用选项，自己复述一次因果链。</p><button class="primary" id="again">再练一遍</button> <button class="primary" id="nextChapter">${reviewing?'返回章节练习':current<bank.length-1?'下一章 →':'回到第一章'}</button></div>`;
    $('#again').onclick=() => {index=0;runResults=[];render();};
    $('#nextChapter').onclick=() => start(reviewing?0:(current+1)%bank.length);
    return;
  }
  const [c,i]=queue[index], chapter=bank[c], q=chapter.questions[i]; current=c;
  options=shuffled(q);
  $('#practice').innerHTML=`<div class="question-meta"><span>${reviewing?'错题重练 · ':''}第 ${String(c+1).padStart(2,'0')} 章 · ${chapter.title}</span><span class="tag">${q.kind}</span></div><div class="concept">考察概念 · ${q.concept}</div><h3 id="questionTitle" tabindex="-1">${q.q}</h3><div id="options">${options.map((o,n)=>`<button class="option" data-option="${n}"><b>${'ABCD'[n]}</b><span>${o.text}</span></button>`).join('')}</div><div id="feedback"></div><div class="question-bottom"><span>${String(index+1).padStart(2,'0')} / ${String(queue.length).padStart(2,'0')} · 选择最准确的一项</span><span id="nextSlot">选择后展开推理解析</span></div>`;
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
  const links=(q.refs||[]).filter(id=>SOURCES[id]).map(id=>`<a href="${SOURCES[id].url}" target="_blank" rel="noopener noreferrer">${SOURCES[id].title} ↗</a>`).join('');
  $('#feedback').innerHTML=`<div class="feedback"><strong>${correct?'✓ 回答正确':'所选答案不够准确'} · 正确答案 ${'ABCD'[options.findIndex(o=>o.n===q.answer)]}</strong><div class="analysis-block"><b>推理过程</b><p>${q.explanation}</p></div><div class="analysis-block"><b>常见误区</b><p>${q.trap}</p></div><div class="analysis-block boundary"><b>成立条件与边界</b><p>${q.boundary}</p></div><div class="source-line">原书：第 ${c+1} 章《${bank[c].title}》${links?'<div>延伸阅读（读者观点或机制补充）：'+links+'</div>':''}</div></div>`;
  $('#nextSlot').innerHTML=`<button class="primary" id="next">${index+1===queue.length?'查看本轮结果':'下一题 →'}</button>`;
  $('#next').onclick=()=>{index++;render();$('#practice').scrollIntoView({behavior:'smooth',block:'start'});$('#questionTitle')?.focus({preventScroll:true});};
  stats();
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
$('#reset').onclick=()=>{if(confirm('清除这个浏览器保存的进阶题库练习记录？')){records={};persist();start(0);}};
$('#readingSources').innerHTML=Object.values(SOURCES).map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} ↗</a><p>${s.role}</p></li>`).join('');
start(0);
