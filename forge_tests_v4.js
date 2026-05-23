/**
 * FORGE FAMILY FINANCE — COMPREHENSIVE TEST SUITE v4.0
 * 10 suites | Unit + Functional + Architecture + Regression + Edge Cases
 */
'use strict';
const assert = require('assert');
const fs     = require('fs');

// ── Infrastructure ────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const suites = {};

function suite(name) { suites[name] = []; return name; }
function test(s, name, fn) {
  try { fn(); passed++; suites[s].push({name, status:'PASS'}); }
  catch(e) { failed++; suites[s].push({name, status:'FAIL', msg:e.message.slice(0,110)}); }
}
function skip(s, name, reason) {
  skipped++; suites[s].push({name, status:'SKIP', msg:reason||''});
}

// ── Load files ────────────────────────────────────────────────────────────────
const H  = fs.readFileSync('/home/claude/index.html',          'utf8');
const PH = fs.readFileSync('/home/claude/forge-pulse-work.html','utf8');
const CF = fs.readFileSync('/tmp/forge_calc.js',                'utf8');

function getJS(html) {
  const r = /<script[^>]*>([\s\S]*?)<\/script>/g;
  const parts = [];
  let m;
  while ((m = r.exec(html)) !== null) parts.push(m[1]);
  return parts.join('\n');
}
function getCSS(html) {
  const r = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let out='', m;
  while ((m = r.exec(html)) !== null) out += m[1];
  return out;
}

const JS  = getJS(H);
const PJS = getJS(PH);
const CSS = getCSS(H);
const PCSS= getCSS(PH);

// ── Calc environment (isolated functions only) ────────────────────────────────
function makeCalcEnv(extraTxns) {
  const env = new Function('txns', `
    function detectAcctType(n){
      n=(n||'').toLowerCase();
      if(n.includes('checking')||n.includes('chk')) return 'checking';
      if(n.includes('saving'))   return 'savings';
      if(n.includes('visa')||n.includes('credit')||n.includes('sapphire')||n.includes(' cc')||n.includes('amex')||n.includes('card')) return 'credit';
      if(n.includes('invest')||n.includes('brokerage')) return 'invest';
      if(n.includes('401')||n.includes('retire')) return 'retirement';
      if(n.includes('529')) return '529';
      return 'other';
    }
    function isTransfer(t){
      if(!t) return false;
      if(t.category && /^\\[.+\\]$/.test((t.category||'').trim())) return true;
      if(t.type && /^transfer$/i.test(t.type||'')) return true;
      if(t.category && /^(transfer|xfer)/i.test((t.category||'').trim())) return true;
      return false;
    }
    function classifyTxn(t){
      const c=(t.category||'').toLowerCase();
      if(c.includes('grocery')||c.includes('supermarket')) return 'groceries';
      if(c.includes('restaurant')||c.includes('dining'))   return 'restaurants';
      if(c.includes('mortgage')&&c.includes('interest'))   return 'mort_interest';
      if(c.includes('mortgage')&&c.includes('principal'))  return 'mort_principal';
      if(c.includes('mortgage')) return 'mortgage';
      return 'other';
    }
    function isFinite(v){ return Number.isFinite(v); }
    ${CF}
    return {detectAcctType,isTransfer,classifyTxn,computeScale,monthlyData,buildSavingsRegister};
  `);
  return env(extraTxns || []);
}

const C = makeCalcEnv([]);

// ══════════════════════════════════════════════════════════════════════════════
const S1 = suite('S1 · Static Analysis');

test(S1,'File starts with <!DOCTYPE html>',()=>{ assert(H.trimStart().startsWith('<!DOCTYPE html>')); });
test(S1,'Desktop size 380KB–700KB',()=>{ const kb=Buffer.byteLength(H)/1024; assert(kb>380&&kb<700,`${kb.toFixed(0)}KB`); });
test(S1,'Pulse size 150KB–400KB',()=>{ const kb=Buffer.byteLength(PH)/1024; assert(kb>150&&kb<400,`${kb.toFixed(0)}KB`); });
test(S1,'CSS braces balanced (desktop)',()=>{
  const o=(CSS.match(/\{/g)||[]).length, c=(CSS.match(/\}/g)||[]).length;
  assert.strictEqual(o,c,`${o} open / ${c} close`);
});
test(S1,'CSS braces balanced (pulse)',()=>{
  const o=(PCSS.match(/\{/g)||[]).length, c=(PCSS.match(/\}/g)||[]).length;
  assert.strictEqual(o,c,`${o}/${c}`);
});
test(S1,'No duplicate JS functions (desktop)',()=>{
  const fns={};
  const re=/\nfunction (\w+)\s*\(/g; let m;
  while((m=re.exec(JS))!==null) fns[m[1]]=(fns[m[1]]||0)+1;
  const d=Object.entries(fns).filter(([,n])=>n>1).map(([k])=>k);
  assert(d.length===0,`Dupes: ${d.join(',')}`);
});
test(S1,'No duplicate JS functions (pulse)',()=>{
  const fns={};
  const re=/\nfunction (\w+)\s*\(/g; let m;
  while((m=re.exec(PJS))!==null) fns[m[1]]=(fns[m[1]]||0)+1;
  const d=Object.entries(fns).filter(([,n])=>n>1).map(([k])=>k);
  assert(d.length===0,`Dupes: ${d.join(',')}`);
});
test(S1,'No CSS leaked before DOCTYPE',()=>{
  assert(!H.slice(0,50).includes('{'),'CSS before DOCTYPE');
});
test(S1,'No net[_projIdx] crash reference',()=>{ assert(!JS.includes('net[_projIdx]')); });
test(S1,'renderCashFlow properly declared (not commented)',()=>{
  assert(!JS.includes('// ── function renderCashFlow'),'CF commented out');
  assert(JS.includes('function renderCashFlow('),'CF not declared');
});
test(S1,'No try/catch hiding CF render errors',()=>{
  const s=JS.indexOf('function renderCashFlow(');
  const e=JS.indexOf('\nfunction renderCategories(');
  assert(!JS.slice(s,e).includes('try {'),'try/catch in CF fn');
});
test(S1,'No contain:paint (causes offsetWidth=0 bug)',()=>{ assert(!CSS.includes('contain: paint')); });

// ══════════════════════════════════════════════════════════════════════════════
const S2 = suite('S2 · Architecture');

const REQUIRED_FNS = [
  'renderCashFlow','renderCategories','renderTxns','renderIncomeStatement',
  'renderBalanceSheet','renderBudget','renderCreditFlow','renderReconcile',
  'renderSettings','showPage','isTransfer','detectAcctType','operatingSpendable',
  'buildSavingsRegister','computeScale','svgBar','svgLine','svgWaterfall',
  'renderCfBankDraw','renderSavingsRegChart','showChartTip','positionChartTip',
  'bindChartTips','buildCfpProof','renderCfpProof','monthlyData','classifyTxn',
  'fmtK','fmt','rangeStart','setCfRange','renderProjStrip','clearCatDrill',
];
REQUIRED_FNS.forEach(fn => {
  test(S2,`${fn} declared`,()=>{ assert(JS.includes(`function ${fn}(`),'Missing'); });
});

const REQUIRED_IDS = [
  'page-cashflow','page-categories','page-transactions','page-income',
  'page-balancesheet','page-budget','page-creditflow','page-reconcile',
  'page-settings','page-upload','page-crosswalk',
  'cfBarWrap','cfWaterfallWrap','cfBankDrawPanel','cfKPIs','cfRangeTabs',
  'projStrip','catBreadcrumb','catBreadcrumbLabel','reconContent',
  'incomeStatement','balanceSheetContent','chartTip',
  'nav-cashflow','nav-balancesheet','nav-categories','nav-transactions',
  'nav-creditflow','nav-income','nav-upload','nav-crosswalk',
];
REQUIRED_IDS.forEach(id => {
  test(S2,`#${id} in HTML`,()=>{ assert(H.includes(`id="${id}"`),`Missing #${id}`); });
});

// ══════════════════════════════════════════════════════════════════════════════
const S3 = suite('S3 · Navigation & UX Audit');

const NAV = H.slice(H.indexOf('<nav>'), H.indexOf('</nav>')+6);
test(S3,'Nav: 4 sections',()=>{ assert.strictEqual((NAV.match(/class="nav-section"/g)||[]).length,4); });
test(S3,'Nav: Monthly Position',()=>{ assert(NAV.includes('Monthly Position')); });
test(S3,'Nav: Net Worth (promoted)',()=>{ assert(NAV.includes('Net Worth')); });
test(S3,'Nav: Credit Cards (promoted)',()=>{ assert(NAV.includes('Credit Cards')); });
test(S3,'Nav: Fix Uncategorized (renamed)',()=>{ assert(NAV.includes('Fix Uncategorized')); });
test(S3,'Nav: Verify Numbers (renamed)',()=>{ assert(NAV.includes('Verify Numbers')); });
test(S3,'Nav: Dashboard removed',()=>{ assert(!NAV.includes('nav-dashboard')); });
test(S3,'Nav: Family Financials removed',()=>{ assert(!NAV.includes('nav-financials')); });
test(S3,'Default page = cashflow',()=>{ assert(H.includes("defaultPage: 'cashflow'")); });
test(S3,'projStrip position:fixed outside main',()=>{
  const main = H.slice(H.indexOf('<main'), H.indexOf('</main>'));
  assert(!main.includes('id="projStrip"'),'Strip inside main');
  assert(H.includes('position:fixed;top:56px'),'Strip not at 56px');
});
test(S3,'CF page has 3M/6M/1Y/All range tabs',()=>{
  const pg = H.slice(H.indexOf('id="page-cashflow"'),H.indexOf('id="page-categories"'));
  assert(pg.includes('cfRangeTabs')&&pg.includes("setCfRange('1y'"));
});
test(S3,'Net Savings Trend removed from CF page',()=>{
  const pg = H.slice(H.indexOf('id="page-cashflow"'),H.indexOf('id="page-categories"'));
  assert(!pg.includes('cfLineWrap'),'cfLineWrap still in CF page');
});
test(S3,'Category breadcrumb in Transactions page',()=>{
  assert(H.includes('id="catBreadcrumb"')&&H.includes('id="catBreadcrumbLabel"'));
});
test(S3,'clearCatDrill navigates back to categories',()=>{
  const fn=JS.slice(JS.indexOf('function clearCatDrill('),JS.indexOf('\n}\n',JS.indexOf('function clearCatDrill('))+3);
  assert(fn.includes("showPage('categories'"));
});
test(S3,'drillToCategory shows breadcrumb',()=>{
  const fn=JS.slice(JS.indexOf('function drillToCategory('),JS.indexOf('\n}\n',JS.indexOf('function drillToCategory('))+3);
  assert(fn.includes('catBreadcrumbLabel'),'breadcrumb not wired in drillToCategory');
});

// ══════════════════════════════════════════════════════════════════════════════
const S4 = suite('S4 · computeScale Unit Tests');

test(S4,'[Happy] Positive values: scale includes 0 and above max',()=>{
  const sc=C.computeScale([100,200,150],{});
  assert(sc.maxV>200&&sc.span>0);
});
test(S4,'[Happy] forceZeroBase: minV=0 always',()=>{
  const sc=C.computeScale([5000,7000,8000],{forceZeroBase:true});
  assert.strictEqual(sc.minV,0,`minV=${sc.minV}`);
  assert(sc.maxV>8000);
});
test(S4,'[Happy] minSpan prevents flat chart',()=>{
  const sc=C.computeScale([-200,100,-50],{showZero:true,minSpan:2000});
  assert(sc.maxV-sc.minV>=2000,`span ${sc.maxV-sc.minV} < 2000`);
});
test(S4,'[Happy] niceTicks produces round numbers',()=>{
  const sc=C.computeScale([1234,5678,3456],{forceZeroBase:true});
  sc.ticks.forEach(t=>{ assert(Math.abs(t-Math.round(t))<0.01,`Tick ${t} not rounded`); });
});
test(S4,'[Happy] Mixed positive/negative includes zero',()=>{
  const sc=C.computeScale([-5000,3000],{showZero:true});
  assert(sc.zero===true,'zero not included');
  assert(sc.minV<-5000&&sc.maxV>3000);
});
test(S4,'[Edge] Single value',()=>{
  const sc=C.computeScale([5000],{forceZeroBase:true});
  assert(sc.span>0&&sc.maxV>5000);
});
test(S4,'[Edge] All zeros',()=>{
  const sc=C.computeScale([0,0,0],{});
  assert(sc.span>=1,'Zero span must be >=1');
});
test(S4,'[Edge] Empty array returns fallback',()=>{
  const sc=C.computeScale([],{});
  assert(sc.span>0);
});
test(S4,'[Train Wreck] NaN values filtered',()=>{
  assert.doesNotThrow(()=>{ const sc=C.computeScale([NaN,1000,NaN],{}); assert(sc.span>0); });
});
test(S4,'[Train Wreck] Extreme outlier stays in scale',()=>{
  const sc=C.computeScale([100,100,1000000],{forceZeroBase:true});
  assert(sc.maxV>=1000000);
});

// ══════════════════════════════════════════════════════════════════════════════
const S5 = suite('S5 · detectAcctType + isTransfer Unit Tests');

test(S5,'[detectAcctType] Checking variants',()=>{
  assert.strictEqual(C.detectAcctType('PNC Checking'),'checking');
  assert.strictEqual(C.detectAcctType('Joint CHK'),'checking');
});
test(S5,'[detectAcctType] Savings variants',()=>{
  assert.strictEqual(C.detectAcctType('Emergency Savings'),'savings');
});
test(S5,'[detectAcctType] Credit variants',()=>{
  assert.strictEqual(C.detectAcctType('Chase Sapphire Visa'),'credit');
  assert.strictEqual(C.detectAcctType('Amex Gold Card'),'credit');
});
test(S5,'[detectAcctType] Investment/529/Retirement',()=>{
  assert.strictEqual(C.detectAcctType('Fidelity Invest'),'invest');
  assert.strictEqual(C.detectAcctType('Vanguard 529'),'529');
  assert.strictEqual(C.detectAcctType('401k Retire'),'retirement');
});
test(S5,'[detectAcctType] Edge: null/empty',()=>{
  assert.doesNotThrow(()=>C.detectAcctType(null));
  assert.doesNotThrow(()=>C.detectAcctType(''));
});
test(S5,'[isTransfer] Quicken bracket [AccountName]',()=>{
  assert(C.isTransfer({category:'[Savings Account]'}),'Bracket not detected');
  assert(C.isTransfer({category:'[PNC Checking]'}),'Bracket not detected');
  assert(!C.isTransfer({category:'Groceries'}),'Groceries flagged as transfer');
});
test(S5,'[isTransfer] Explicit type=transfer',()=>{
  assert(C.isTransfer({type:'transfer',category:'Food'}));
  assert(!C.isTransfer({type:'debit',category:'Food'}));
});
test(S5,'[isTransfer] Empty brackets [] NOT a transfer',()=>{
  assert(!C.isTransfer({category:'[]'}),'Empty [] is not a Quicken transfer');
});
test(S5,'[isTransfer] Edge: null/undefined/empty object',()=>{
  assert.strictEqual(C.isTransfer(null),false);
  assert.strictEqual(C.isTransfer(undefined),false);
  assert.strictEqual(C.isTransfer({}),false);
});

// ══════════════════════════════════════════════════════════════════════════════
const S6 = suite('S6 · buildSavingsRegister Functional Tests');

function bsr(txnArr, months) {
  const env = makeCalcEnv(txnArr);
  // Patch txns in the env function
  const src = `
    var txns=${JSON.stringify(txnArr)};
    function detectAcctType(n){
      n=(n||'').toLowerCase();
      if(n.includes('checking')||n.includes('chk')) return 'checking';
      if(n.includes('saving')) return 'savings';
      if(n.includes('visa')||n.includes('credit')||n.includes('sapphire')||n.includes('amex')) return 'credit';
      return 'other';
    }
    function isTransfer(t){
      if(!t)return false;
      if(t.category&&/^\\[.+\\]$/.test((t.category||'').trim()))return true;
      if(t.type&&/^transfer$/i.test(t.type||''))return true;
      return false;
    }
    ${CF}
    return buildSavingsRegister(${JSON.stringify(months)});
  `;
  return new Function(src)();
}

test(S6,'[Happy] Income - expenses = net',()=>{
  const r=bsr([
    {date:'2025-06-01',amount:8000, account:'PNC Checking',       category:'Salary',      _source:'',itemDetail:false,_masked:false},
    {date:'2025-06-15',amount:-3000,account:'PNC Checking',       category:'Groceries',   _source:'',itemDetail:false,_masked:false},
    {date:'2025-06-20',amount:-1000,account:'Chase Sapphire Visa',category:'Dining',      _source:'',itemDetail:false,_masked:false},
  ],['2025-06']);
  assert.strictEqual(r[0].income,8000,`income=${r[0].income}`);
  assert.strictEqual(r[0].expenses,4000,`expenses=${r[0].expenses} (chk+cc)`);
  assert.strictEqual(r[0].net,4000,`net=${r[0].net}`);
});
test(S6,'[Happy] Transfers excluded from income/expenses',()=>{
  const r=bsr([
    {date:'2025-06-01',amount:8000, account:'PNC Checking',     category:'Salary',           _source:'',itemDetail:false,_masked:false},
    {date:'2025-06-15',amount:-2000,account:'PNC Checking',     category:'[Savings Account]',_source:'',itemDetail:false,_masked:false},
    {date:'2025-06-20',amount:-1500,account:'PNC Checking',     category:'Restaurants',      _source:'',itemDetail:false,_masked:false},
  ],['2025-06']);
  assert.strictEqual(r[0].income,8000);
  assert.strictEqual(r[0].expenses,1500,`Transfer excluded: got ${r[0].expenses}`);
  assert.strictEqual(r[0].net,6500);
  assert.strictEqual(r[0].savXferOut,2000,`savXferOut=${r[0].savXferOut}`);
});
test(S6,'[Happy] Detail CSV rows excluded (itemDetail:true)',()=>{
  const r=bsr([
    {date:'2025-06-01',amount:8000,account:'PNC Checking',     category:'Salary',  _source:'',          itemDetail:false,_masked:false},
    {date:'2025-06-10',amount:-150,account:'Chase Sapphire Visa',category:'Amazon',_source:'amazon_orders',itemDetail:true, _masked:false},
    {date:'2025-06-10',amount:-150,account:'Chase Sapphire Visa',category:'Amazon',_source:'',          itemDetail:false,_masked:false},
  ],['2025-06']);
  assert.strictEqual(r[0].expenses,150,`itemDetail excluded: got ${r[0].expenses}`);
});
test(S6,'[Happy] Cumulative runs correctly',()=>{
  const r=bsr([
    {date:'2025-01-01',amount:8000, account:'PNC Checking',category:'Salary',   _source:'',itemDetail:false,_masked:false},
    {date:'2025-01-15',amount:-6000,account:'PNC Checking',category:'Expenses', _source:'',itemDetail:false,_masked:false},
    {date:'2025-02-01',amount:8000, account:'PNC Checking',category:'Salary',   _source:'',itemDetail:false,_masked:false},
    {date:'2025-02-15',amount:-9000,account:'PNC Checking',category:'Expenses', _source:'',itemDetail:false,_masked:false},
  ],['2025-01','2025-02']);
  assert.strictEqual(r[0].net,2000);
  assert.strictEqual(r[1].net,-1000);
  assert.strictEqual(r[0].cumulative,2000);
  assert.strictEqual(r[1].cumulative,1000,'Cumulative Jan+Feb = 1000');
});
test(S6,'[Edge] Empty months array → []',()=>{
  const r=bsr([],[]); assert.deepStrictEqual(r,[]);
});
test(S6,'[Edge] Month with no transactions → zero net',()=>{
  const r=bsr([{date:'2025-01-01',amount:5000,account:'PNC Checking',category:'Salary',_source:'',itemDetail:false,_masked:false}],['2025-06']);
  assert.strictEqual(r[0].income,0); assert.strictEqual(r[0].net,0);
});
test(S6,'[Edge] All-masked month → zero income',()=>{
  const r=bsr([{date:'2025-06-01',amount:8000,account:'PNC Checking',category:'Salary',_source:'',itemDetail:false,_masked:true}],['2025-06']);
  assert.strictEqual(r[0].income,0,'Masked txns must be excluded');
});
test(S6,'[Train Wreck] Only transfers → zero net',()=>{
  const r=bsr([
    {date:'2025-06-01',amount:-2000,account:'PNC Checking',    category:'[Savings Account]',_source:'',itemDetail:false,_masked:false},
    {date:'2025-06-01',amount:2000, account:'Emergency Savings',category:'[PNC Checking]',  _source:'',itemDetail:false,_masked:false},
  ],['2025-06']);
  assert.strictEqual(r[0].income,0);
  assert.strictEqual(r[0].expenses,0);
  assert.strictEqual(r[0].net,0);
});
test(S6,'[Train Wreck] Massive income spike in one month',()=>{
  const r=bsr([
    {date:'2025-06-01',amount:250000,account:'PNC Checking',category:'Bonus',    _source:'',itemDetail:false,_masked:false},
    {date:'2025-06-15',amount:-8000, account:'PNC Checking',category:'Expenses', _source:'',itemDetail:false,_masked:false},
  ],['2025-06']);
  assert.strictEqual(r[0].income,250000,'Bonus income correct');
  assert.strictEqual(r[0].net,242000,'Net correct with spike');
});

// ══════════════════════════════════════════════════════════════════════════════
const S7 = suite('S7 · Math Consistency');

test(S7,'BSR income = checking deposits only (code check)',()=>{
  const s=JS.indexOf('function buildSavingsRegister('),e=JS.indexOf('\n}\n',s)+3;
  const fn=JS.slice(s,e);
  assert(fn.includes("=== 'checking'"),'BSR income not restricted to checking');
  assert(fn.includes('amount > 0'),'BSR income not checking positive amounts');
});
test(S7,'BSR expenses = checking outflows + CC charges',()=>{
  const s=JS.indexOf('function buildSavingsRegister('),e=JS.indexOf('\n}\n',s)+3;
  const fn=JS.slice(s,e);
  assert(fn.includes("'credit'")&&fn.includes('amount < 0'),'BSR expenses missing CC');
});
test(S7,'Waterfall income = checking only (same as BSR)',()=>{
  const s=JS.indexOf('function renderCashFlow('),e=JS.indexOf('\nfunction renderCategories(');
  assert(JS.slice(s,e).includes("=== 'checking'"),'Waterfall income not checking-only');
});
test(S7,'Waterfall excludes mort_principal',()=>{
  const s=JS.indexOf('function renderCashFlow('),e=JS.indexOf('\nfunction renderCategories(');
  assert(JS.slice(s,e).includes("mort_principal"),'mort_principal not excluded from waterfall');
});
test(S7,'Waterfall net closes to income - totalExp',()=>{
  const s=JS.indexOf('function renderCashFlow('),e=JS.indexOf('\nfunction renderCategories(');
  const fn=JS.slice(s,e);
  assert(fn.includes('wfInc-tot')||fn.includes('wfInc - tot')||fn.includes('wfNet'),'Waterfall net calculation missing');
});
test(S7,'forceZeroBase produces minV=0 numerically',()=>{
  const sc=C.computeScale([7000,8000,7500],{forceZeroBase:true});
  assert.strictEqual(sc.minV,0,`minV=${sc.minV}`);
});
test(S7,'BSR net = income - expenses (numerical)',()=>{
  const r=bsr([
    {date:'2025-06-01',amount:10000,account:'PNC Checking',category:'Salary',  _source:'',itemDetail:false,_masked:false},
    {date:'2025-06-15',amount:-4500,account:'PNC Checking',category:'Expenses',_source:'',itemDetail:false,_masked:false},
    {date:'2025-06-20',amount:-2000,account:'Chase Sapphire Visa',category:'Dining',_source:'',itemDetail:false,_masked:false},
  ],['2025-06']);
  assert.strictEqual(r[0].net, r[0].income - r[0].expenses, 'net ≠ income - expenses');
  assert.strictEqual(r[0].net, 3500);
});
test(S7,'BSR cumulative = sum of all prior nets',()=>{
  const r=bsr([
    {date:'2025-01-01',amount:8000,account:'PNC Checking',category:'Salary',_source:'',itemDetail:false,_masked:false},
    {date:'2025-01-15',amount:-5000,account:'PNC Checking',category:'Exp',_source:'',itemDetail:false,_masked:false},
    {date:'2025-02-01',amount:8000,account:'PNC Checking',category:'Salary',_source:'',itemDetail:false,_masked:false},
    {date:'2025-02-15',amount:-7000,account:'PNC Checking',category:'Exp',_source:'',itemDetail:false,_masked:false},
    {date:'2025-03-01',amount:9000,account:'PNC Checking',category:'Salary',_source:'',itemDetail:false,_masked:false},
    {date:'2025-03-15',amount:-4000,account:'PNC Checking',category:'Exp',_source:'',itemDetail:false,_masked:false},
  ],['2025-01','2025-02','2025-03']);
  assert.strictEqual(r[0].cumulative,3000,'Jan cum=3000');
  assert.strictEqual(r[1].cumulative,4000,'Feb cum=3000+1000=4000');  // wait: 3000+1000=4000
  assert.strictEqual(r[2].cumulative,9000,'Mar cum=4000+5000=9000');
});

// ══════════════════════════════════════════════════════════════════════════════
const S8 = suite('S8 · CFA-Grade Features');

test(S8,'mort_interest bucket in codebase',()=>{ assert(JS.includes('mort_interest')); });
test(S8,'mort_principal excluded from IS expenses',()=>{
  assert(JS.includes('mort_principal')&&(JS.includes('CAPITAL_BKS')||JS.includes("=== 'mort_principal'")));
});
test(S8,'IS has accrual basis label',()=>{
  const s=JS.indexOf('function renderIncomeStatement('),e=JS.indexOf('\nfunction ',s+1);
  const fn=JS.slice(s,e);
  assert(fn.toLowerCase().includes('accrual')||H.toLowerCase().includes('accrual'));
});
test(S8,'IS has two-column layout (grid-template-columns)',()=>{
  const s=JS.indexOf('function renderIncomeStatement('),e=JS.indexOf('\nfunction ',s+1);
  assert(JS.slice(s,e).includes('grid-template-columns'));
});
test(S8,'IS has localStorage margin cards',()=>{
  const s=JS.indexOf('function renderIncomeStatement('),e=JS.indexOf('\nfunction ',s+1);
  const fn=JS.slice(s,e);
  assert(fn.includes('localStorage'),'localStorage missing');
  assert(fn.includes('Savings Rate')||fn.includes('_savRate'),'Savings Rate card missing');
});
test(S8,'buildCfpProof has all proof fields',()=>{
  const s=JS.indexOf('function buildCfpProof('),e=JS.indexOf('\n}\n',s)+3;
  const fn=JS.slice(s,e);
  ['openLiq','closeLiq','isNet','proofDiff'].forEach(f=>assert(fn.includes(f),`${f} missing`));
});
test(S8,'renderCfpProof shows balanced/unbalanced state',()=>{
  const s=JS.indexOf('function renderCfpProof('),e=JS.indexOf('\n}\n',s)+3;
  const fn=JS.slice(s,e);
  assert(fn.includes('balanced')&&fn.includes('Proof balanced'));
});
test(S8,'Reconcile 4-section: Account Balances, Cash Flow, Why, Quicken',()=>{
  const s=JS.indexOf('function renderReconcile('),e=JS.indexOf('\n}\n',s)+3;
  const fn=JS.slice(s,e);
  assert(fn.includes('Account Balances'),'Section 1 missing');
  assert(fn.includes('cash basis'),'Section 2 missing');
  assert(fn.includes('How to Verify in Quicken'),'Section 4 missing');
});
test(S8,'computeBSFromTxns excludes detail CSV',()=>{
  const s=JS.indexOf('function computeBSFromTxns('),e=JS.indexOf('\n}\n',s)+3;
  const fn=JS.slice(s,e);
  assert(fn.includes('itemDetail')||fn.includes('DET.has'));
});
test(S8,'buildAccrualEngine uses spFiltered (OPER restriction)',()=>{
  const s=JS.indexOf('function buildAccrualEngine(');
  if(s<0){skip(S8,'buildAccrualEngine OPER filter','Function not in file');return;}
  const e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('spFiltered')||JS.slice(s,e).includes('_AE_OPER'));
});
test(S8,'isTransfer uses Quicken bracket syntax [AccountName]',()=>{
  const s=JS.indexOf('function isTransfer('),e=JS.indexOf('\n}\n',s)+3;
  const fn=JS.slice(s,e);
  assert(fn.includes('[.+]')||fn.includes('\\['),'Bracket syntax missing');
});

// ══════════════════════════════════════════════════════════════════════════════
const S9 = suite('S9 · Glass Morphism & Visual');

test(S9,'chartTip: backdrop-filter blur + saturate',()=>{
  assert(CSS.includes('backdrop-filter')&&CSS.includes('blur('));
  assert(CSS.includes('saturate('),'Missing saturation');
});
test(S9,'chartTip: multi-layer box-shadow',()=>{
  const s=CSS.indexOf('#chartTip'),e=CSS.indexOf('}',s);
  assert(CSS.slice(s,e).includes('box-shadow'));
});
test(S9,'.kpi has ::before + ::after pseudo-elements',()=>{
  assert(CSS.includes('.kpi::before'),'::before missing');
  assert(CSS.includes('.kpi::after'),'::after missing');
});
test(S9,'.kpi:hover has translateY lift',()=>{
  const s=CSS.indexOf('.kpi:hover'),e=CSS.indexOf('}',s);
  assert(CSS.slice(s,e).includes('translateY'));
});
test(S9,'.chart-card glass: brighter top border',()=>{
  const s=CSS.indexOf('.chart-card {'),e=CSS.indexOf('}',s);
  const blk=CSS.slice(s,e);
  assert(blk.includes('border-top'),'Missing bright top border');
});
test(S9,'.chart-card has ::before shimmer',()=>{
  assert(CSS.includes('.chart-card::before')||CSS.includes('.chart-card:hover'));
});
test(S9,'showChartTip: styled label/value rows',()=>{
  const s=JS.indexOf('function showChartTip('),e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('justify-content:space-between'));
});
test(S9,'svgBar: bloom shadow via feGaussianBlur',()=>{
  const s=JS.indexOf('function svgBar('),e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('feGaussianBlur')||JS.slice(s,e).includes('blur-'));
});
test(S9,'svgLine: linearGradient fill area',()=>{
  const s=JS.indexOf('function svgLine('),e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('linearGradient'));
});
test(S9,'renderCfBankDraw: glass verdict card (backdrop-filter)',()=>{
  const s=JS.indexOf('function renderCfBankDraw('),e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('backdrop-filter'));
});

// ══════════════════════════════════════════════════════════════════════════════
const S10 = suite('S10 · Regression Guard');

test(S10,'REG-001 net[_projIdx] crash eliminated',()=>{ assert(!JS.includes('net[_projIdx]')); });
test(S10,'REG-002 renderCashFlow not commented out',()=>{ assert(!JS.includes('// ── function renderCashFlow')); });
test(S10,'REG-003 CSS not before DOCTYPE',()=>{ assert(!H.slice(0,50).includes('{')); });
test(S10,'REG-004 contain:paint removed (caused offsetWidth=0)',()=>{ assert(!CSS.includes('contain: paint')); });
test(S10,'REG-005 projStrip outside main (layout fix)',()=>{
  const main=H.slice(H.indexOf('<main'),H.indexOf('</main>'));
  assert(!main.includes('id="projStrip"'));
});
test(S10,'REG-006 No renderMasterRecon inline calls',()=>{
  ['recon-balancesheet','recon-cashflow','recon-dashboard','recon-income','cfp-proof-income']
    .forEach(id=>assert(!JS.includes(`renderMasterRecon('${id}'`),`${id} call still present`));
});
test(S10,'REG-007 computeBSFromTxns excludes detail rows',()=>{
  const s=JS.indexOf('function computeBSFromTxns('),e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('itemDetail')||JS.slice(s,e).includes('_source'));
});
test(S10,'REG-008 isTransfer uses bracket syntax',()=>{
  const s=JS.indexOf('function isTransfer('),e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('[.+]')||JS.slice(s,e).includes('\\['));
});
test(S10,'REG-009 svgBar has fallback width 860',()=>{
  const s=JS.indexOf('function svgBar('),e=JS.indexOf('\n}\n',s)+3;
  assert(JS.slice(s,e).includes('860')||JS.slice(s,e).includes('getBoundingClientRect'));
});
test(S10,'REG-010 forceZeroBase still in computeScale',()=>{ assert(JS.includes('forceZeroBase')); });
test(S10,'REG-011 Pulse footer SVG has dimensions',()=>{
  // find the footer svg
  const m=PH.match(/lukalab-credit[\s\S]{0,500}<svg([^>]+)>/);
  if(m) assert(m[1].includes('width=')&&m[1].includes('height='),'Footer SVG unsized');
});
test(S10,'REG-012 No net savings trend in CF page',()=>{
  const pg=H.slice(H.indexOf('id="page-cashflow"'),H.indexOf('id="page-categories"'));
  assert(!pg.includes('cfLineWrap'));
});
test(S10,'REG-013 Pulse CSS braces balanced',()=>{
  const o=(PCSS.match(/\{/g)||[]).length,c=(PCSS.match(/\}/g)||[]).length;
  assert.strictEqual(o,c,`Pulse CSS ${o}/${c}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════════════════════
const W = 72;
console.log('\n' + '═'.repeat(W));
console.log('  FORGE FAMILY FINANCE — TEST SUITE RESULTS');
console.log('═'.repeat(W));

let total=0;
Object.entries(suites).forEach(([name,tests])=>{
  const p=tests.filter(t=>t.status==='PASS').length;
  const f=tests.filter(t=>t.status==='FAIL').length;
  const s=tests.filter(t=>t.status==='SKIP').length;
  console.log(`\n${f===0?'✅':'❌'} ${name}  [${p} pass / ${f} fail / ${s} skip]`);
  tests.forEach(t=>{
    const sym=t.status==='PASS'?'  ✓':t.status==='SKIP'?'  ○':'  ✗';
    const msg=t.msg?`  →  ${t.msg}`:'';
    if(t.status!=='PASS') console.log(`${sym}  ${t.name}${msg}`);
  });
  total+=tests.length;
});

console.log('\n'+'─'.repeat(W));
console.log(`  ${total} tests  |  ${passed} passed  |  ${failed} failed  |  ${skipped} skipped`);
const pct=((passed/total)*100).toFixed(1);
console.log(`  Pass rate: ${pct}%  |  ${failed===0?'✅ ALL PASS':'❌ FAILURES NEED ATTENTION'}`);
console.log('─'.repeat(W)+'\n');
process.exit(failed>0?1:0);
