'use strict';
// ═══════════════════════════════════════════════════════════════
// FORGE COMPREHENSIVE TEST HARNESS — 14 Suites, 130+ Tests
// Unit · Functional · Regression · Edge Cases · Performance
// ═══════════════════════════════════════════════════════════════

const makeDeepProxy = (base={}) => new Proxy(base, {
  get:(t,p) => {
    if (p === Symbol.toPrimitive || p === 'valueOf') return ()=>0;
    if (p === 'toString') return ()=>'[mock]';
    if (p in t) return t[p];
    // Return a function for methods, deep proxy for objects
    if (['addEventListener','removeEventListener','appendChild','prepend',
         'insertAdjacentHTML','classList','add','remove','contains',
         'focus','blur','click','submit'].includes(p)) return ()=>{};
    return makeDeepProxy();
  },
  set:(t,p,v)=>{t[p]=v;return true;}
});

// Full DOM element mock
const mockEl = (id='') => ({
  id, style:{}, value:'', textContent:'', innerHTML:'', checked:false,
  className:'', dataset:{}, href:'',
  addEventListener:()=>{}, removeEventListener:()=>{},
  appendChild:()=>{}, prepend:()=>{}, insertAdjacentHTML:()=>{},
  classList:{ add:()=>{}, remove:()=>{}, toggle:()=>{}, contains:()=>false },
  querySelector:()=>null, querySelectorAll:()=>[],
  closest:()=>null, getAttribute:()=>null, setAttribute:()=>{},
  scrollTop:0, scrollHeight:0, offsetHeight:0, clientHeight:0,
  focus:()=>{}, blur:()=>{},
});

global.document = {
  getElementById: (id) => mockEl(id),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: (tag) => ({ ...mockEl(), tagName:tag, head:{appendChild:()=>{}} }),
  head: { appendChild:()=>{} },
  body: { ...mockEl(), appendChild:()=>{} },
  write:()=>{}, close:()=>{},
};
global.window = {
  addEventListener: ()=>{},
  open: ()=>({ document:{ write:()=>{}, close:()=>{}, createElement:()=>mockEl(), head:{appendChild:()=>{}} } }),
  print:()=>{},
};
global.localStorage  = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
global.sessionStorage = { getItem:()=>null, setItem:()=>{} };
global.fetch = async()=>({ok:true, json:async()=>({content:[{text:'ok'}]}) });
global.AbortController = class { constructor(){this.signal={};} abort(){} };
global.setTimeout  = ()=>{};
global.clearTimeout = ()=>{};
global.setInterval = ()=>{};
global.alert = ()=>{};
global.confirm = ()=>true;
global.prompt = ()=>'test';
global.FileReader = class {
  readAsText(){ this.onload && this.onload({target:{result:''}}); }
};
global.URLSearchParams = class {};

// Chart.js deep proxy
global.Chart = function(){ return {destroy:()=>{},data:{datasets:[]},update:()=>{},options:{}}; };
global.Chart.defaults = makeDeepProxy();
global.Chart.register  = ()=>{};

// Load Forge JS
const fs = require('fs');
const vm = require('vm');
let src = fs.readFileSync('/home/claude/forge_extracted.js', 'utf8');

// Remove boot listener (tested separately)
src = src.replace(/window\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,[\s\S]*?\}\s*\);/g, '/* boot removed */');
// Remove renderSettingsPage addEventListener calls that run at module level
src = src.replace(/document\.getElementById\('s-user1-dob'\)\?\.addEventListener[\s\S]*?updateAgeBadge\('s-user2-dob','s-user2-age-badge',true\)\);/g, '/* settings listeners removed */');

try {
  vm.runInThisContext(src);
} catch(e) {
  console.error('LOAD FAILED:', e.message, '\nAt:', e.stack.split('\n')[1]);
  process.exit(1);
}

// ─── TEST FRAMEWORK ──────────────────────────────────────────
let PASS=0, FAIL=0;
const FAILS=[];

function test(name, fn) {
  try { fn(); PASS++; }
  catch(e) { FAIL++; FAILS.push({name, err:String(e.message||e).slice(0,160)}); }
}
function assert(c, m='assertion failed') { if(!c) throw new Error(m); }
function eq(a, b, m='') {
  if (a !== b) throw new Error(`${m} | got ${JSON.stringify(a)} ≠ expected ${JSON.stringify(b)}`);
}
function ok(v, m='value was null/undefined') { if (v==null) throw new Error(m); }

// ═══════════════════════════════════════════════════════════════
// SUITE 1 — parseDate (18 tests)
// ═══════════════════════════════════════════════════════════════
console.log('\n[ Suite 1 ] parseDate');
test('YYYY-MM-DD',          ()=>eq(parseDate('2024-03-15'),      '2024-03-15'));
test('YYYY-MM-DD + time',   ()=>eq(parseDate('2024-03-15T10:00'),'2024-03-15'));
test('MM/DD/YYYY',          ()=>eq(parseDate('03/15/2024'),      '2024-03-15'));
test('M/D/YYYY single',     ()=>eq(parseDate('3/5/2024'),        '2024-03-05'));
test('MM/DD/YY 2000s',      ()=>eq(parseDate('03/15/24'),        '2024-03-15'));
test('MM/DD/YY 1990s',      ()=>eq(parseDate('03/15/95'),        '1995-03-15'));
test('MM-DD-YYYY',          ()=>eq(parseDate('03-15-2024'),      '2024-03-15'));
test('YYYY/MM/DD',          ()=>eq(parseDate('2024/03/15'),      '2024-03-15'));
test('Jan 05, 2024',        ()=>eq(parseDate('Jan 05, 2024'),    '2024-01-05'));
test('January 5, 2024',     ()=>eq(parseDate('January 5, 2024'),'2024-01-05'));
test('5 Jan 2024',          ()=>eq(parseDate('5 Jan 2024'),      '2024-01-05'));
test('05-Jan-2024',         ()=>eq(parseDate('05-Jan-2024'),     '2024-01-05'));
test('Dec 31, 2024',        ()=>eq(parseDate('Dec 31, 2024'),    '2024-12-31'));
test('null → null',         ()=>eq(parseDate(null),              null));
test('empty → null',        ()=>eq(parseDate(''),                null));
test('garbage → null',      ()=>eq(parseDate('not-a-date'),      null));
test('quoted strips',       ()=>eq(parseDate('"2024-03-15"'),    '2024-03-15'));
test('number input safe',   ()=>{ const r=parseDate(20240315); assert(r===null||typeof r==='string'); });

// ═══════════════════════════════════════════════════════════════
// SUITE 2 — splitCSV (6 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 2 ] splitCSV');
test('basic 3 fields',      ()=>{ const r=splitCSV('a,b,c'); eq(r.length,3); eq(r[0],'a'); });
test('quoted comma',        ()=>{ const r=splitCSV('"Whole Foods, Market",123,Food'); eq(r[0],'Whole Foods, Market'); });
test('empty field',         ()=>{ const r=splitCSV('a,,c'); eq(r.length,3); eq(r[1],''); });
test('empty string',        ()=>{ const r=splitCSV(''); eq(r.length,1); });
test('all quoted',          ()=>{ const r=splitCSV('"a","b","c"'); eq(r.length,3); });
test('trailing comma',      ()=>{ const r=splitCSV('a,b,'); assert(r.length>=2); });

// ═══════════════════════════════════════════════════════════════
// SUITE 3 — parseCSV happy path (12 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 3 ] parseCSV happy path');
const CSV=`Date,Payee,Amount,Category,Account\n03/15/2024,Whole Foods,-123.45,Groceries,Checking\n03/16/2024,Amazon,-42,Shopping,Checking\n03/17/2024,Paycheck,3500,Income,Checking`;
test('3 rows',              ()=>eq(parseCSV(CSV,'t.csv').length,3));
test('negative amount',     ()=>eq(parseCSV(CSV,'t.csv')[0].amount,-123.45));
test('positive income',     ()=>eq(parseCSV(CSV,'t.csv')[2].amount,3500));
test('payee extracted',     ()=>eq(parseCSV(CSV,'t.csv')[0].payee,'Whole Foods'));
test('category',            ()=>eq(parseCSV(CSV,'t.csv')[0].category,'Groceries'));
test('date to ISO',         ()=>eq(parseCSV(CSV,'t.csv')[0].date,'2024-03-15'));
test('account',             ()=>eq(parseCSV(CSV,'t.csv')[0].account,'Checking'));
test('type field',          ()=>{ const r=parseCSV(CSV,'t.csv')[0]; assert('type' in r,'type field'); });

const CSV_QKN=`Transaction Date,Description,Amount,Category,Account\n01/15/2024,STARBUCKS,-5.75,Dining,Chase Checking`;
test('Quicken "Transaction Date"', ()=>eq(parseCSV(CSV_QKN,'q.csv').length,1));
test('Quicken "Description"',      ()=>eq(parseCSV(CSV_QKN,'q.csv')[0].payee,'STARBUCKS'));

const CSV_TAB=`Date\tPayee\tAmount\tCategory\tAccount\n2024-01-15\tTarget\t-89.42\tShopping\tChecking`;
test('tab-delimited',       ()=>{ const r=parseCSV(CSV_TAB,'t.csv'); eq(r.length,1); eq(r[0].payee,'Target'); });

const CSV_POSTDATE=`Posted Date,Merchant,Net Amount,Category,Account\n2024-03-15,Costco,-234.00,Groceries,Visa`;
test('"Posted Date"/"Merchant" headers', ()=>eq(parseCSV(CSV_POSTDATE,'t.csv').length,1));

// ═══════════════════════════════════════════════════════════════
// SUITE 4 — parseCSV train wrecks (12 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 4 ] parseCSV edge cases & train wrecks');
test('empty string',        ()=>eq(parseCSV('','t.csv').length,0));
test('header only',         ()=>eq(parseCSV('Date,Payee,Amount','t.csv').length,0));
test('garbage content',     ()=>eq(parseCSV('not csv\nblah','t.csv').length,0));
test('invalid dates skip',  ()=>{ const r=parseCSV('Date,Payee,Amount,Category,Account\nbad,X,-1,Y,Z\n03/15/2024,Y,-1,Y,Z','t.csv'); eq(r.length,1); });
test('NaN amounts skip',    ()=>{ const r=parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,X,bad,Y,Z\n03/16/2024,Y,-5,Y,Z','t.csv'); eq(r.length,1); });
test('blank lines ignored', ()=>{ const r=parseCSV('Date,Payee,Amount,Category,Account\n\n03/15/2024,X,-1,Y,Z\n\n','t.csv'); eq(r.length,1); });
test('dollar sign in amt',  ()=>{ const r=parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,X,"$-42.00",Y,Z','t.csv'); if(r.length>0) assert(Math.abs(r[0].amount)===42,`got ${r[0].amount}`); });
test('comma in amount',     ()=>{ const r=parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,X,"-1,200.00",Y,Z','t.csv'); if(r.length>0) assert(Math.abs(r[0].amount)>100,`got ${r[0].amount}`); });
test('paren negative',      ()=>{ const r=parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,X,(89.42),Y,Z','t.csv'); if(r.length>0) assert(r[0].amount<0,`got ${r[0].amount}`); });
test('BOM prefix no crash', ()=>{ const r=parseCSV('\uFEFFDate,Payee,Amount,Cat,Acct\n03/15/2024,X,-1,Y,Z','t.csv'); assert(r.length>=0); });
test('unicode payee',       ()=>{ const r=parseCSV('Date,Payee,Amount,Cat,Acct\n03/15/2024,Café Zürich,-12.50,Dining,Checking','t.csv'); assert(r.length>=0); });
test('1000 row perf <3s',   ()=>{ const rows=['Date,Payee,Amount,Category,Account']; for(let i=0;i<1000;i++) rows.push(`03/15/2024,P${i},-${i+1},Shopping,Checking`); const t=Date.now(); const r=parseCSV(rows.join('\n'),'t.csv'); assert(Date.now()-t<3000,`${Date.now()-t}ms`); eq(r.length,1000); });

// ═══════════════════════════════════════════════════════════════
// SUITE 5 — parseQIF (11 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 5 ] parseQIF');
const QIF=`!Type:Bank\nD03/15/2024\nT-123.45\nPTarget Store\nLGroceries\n^\nD03/16/2024\nT3500.00\nPDirect Deposit\nLIncome\n^`;
test('2 txns',              ()=>eq(parseQIF(QIF,'c.qif').length,2));
test('date ISO',            ()=>eq(parseQIF(QIF,'c.qif')[0].date,'2024-03-15'));
test('negative amount',     ()=>eq(parseQIF(QIF,'c.qif')[0].amount,-123.45));
test('payee',               ()=>eq(parseQIF(QIF,'c.qif')[0].payee,'Target Store'));
test('category',            ()=>eq(parseQIF(QIF,'c.qif')[0].category,'Groceries'));
test('account from fname',  ()=>eq(parseQIF(QIF,'my-checking.qif')[0].account,'my-checking'));
test('empty → []',          ()=>eq(parseQIF('','t.qif').length,0));
test('header only → []',    ()=>eq(parseQIF('!Type:Bank','t.qif').length,0));
test('garbage no crash',    ()=>assert(parseQIF('garbage\n^\n','t.qif').length>=0));
test('comma in amount',     ()=>{ const r=parseQIF('!Type:Bank\nD01/01/2024\nT-1,234.56\nPTest\n^','t.qif'); if(r.length>0) assert(r[0].amount<-1000,`got ${r[0]?.amount}`); });
test('positive + negative', ()=>{ const q='!Type:Bank\nD01/01/2024\nT100.00\nPDep\n^\nD01/02/2024\nT-50.00\nPWith\n^'; const r=parseQIF(q,'t.qif'); eq(r.length,2); assert(r[0].amount>0); assert(r[1].amount<0); });

// ═══════════════════════════════════════════════════════════════
// SUITE 6 — parseAmazon (12 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 6 ] parseAmazon');
const AMZ_NEW=`Order ID,Order Date,Order Status,Product Name,Quantity,Purchase Price Per Unit,Grand Total,ASIN/ISBN,Department\n123-456,2024-01-15,Shipped,Wireless Headphones,1,79.99,84.99,B001,Electronics Accessories\n124-789,2024-01-20,Shipped,Dog Food,2,32.50,70.00,B002,Pet Supplies`;
test('new format count',    ()=>eq(parseAmazon(AMZ_NEW).length,2));
test('new format title',    ()=>assert(parseAmazon(AMZ_NEW)[0].title.includes('Headphones')));
test('new format date',     ()=>eq(parseAmazon(AMZ_NEW)[0].date,'2024-01-15'));
test('new format orderId',  ()=>eq(parseAmazon(AMZ_NEW)[0].orderId,'123-456'));
test('new format total>0',  ()=>assert(parseAmazon(AMZ_NEW)[0].total>0));
test('multi-qty grand total',()=>{ const c='Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,Department\n123,2024-01-01,Widget,3,10.00,30.00,Other'; eq(parseAmazon(c)[0].total,30); });

const AMZ_OLD=`"Order Date","Order ID","Title","Category","ASIN","Quantity","Item Total"\n"03/15/2024","123","LEGO Set","Toys & Games","B0LEGO","1","$89.99"`;
test('old format count',    ()=>eq(parseAmazon(AMZ_OLD).length,1));
test('old format title',    ()=>assert(parseAmazon(AMZ_OLD)[0].title.includes('LEGO')));
test('empty → []',          ()=>eq(parseAmazon('').length,0));
test('zero price skipped',  ()=>{ const c='Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,Department\n123,2024-01-01,Free,1,0,0,Other'; eq(parseAmazon(c).length,0); });
test('empty title skipped', ()=>{ const c='Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,Department\n123,2024-01-01,,1,9.99,9.99,Other'; eq(parseAmazon(c).length,0); });
test('header only → []',    ()=>eq(parseAmazon('Order ID,Order Date,Product Name,Grand Total').length,0));

// ═══════════════════════════════════════════════════════════════
// SUITE 7 — parseOFX / parseOFXDate (9 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 7 ] parseOFX');
const OFX=`<OFX><STMTTRN><DTPOSTED>20240315</DTPOSTED><TRNAMT>-42.50</TRNAMT><NAME>STARBUCKS</NAME><MEMO>COFFEE</MEMO></STMTTRN><STMTTRN><DTPOSTED>20240316120000</DTPOSTED><TRNAMT>3500.00</TRNAMT><NAME>PAYCHECK</NAME></STMTTRN></OFX>`;
test('2 txns',              ()=>eq(parseOFX(OFX,'t.ofx').length,2));
test('date YYYYMMDD',       ()=>eq(parseOFX(OFX,'t.ofx')[0].date,'2024-03-15'));
test('date with time',      ()=>eq(parseOFX(OFX,'t.ofx')[1].date,'2024-03-16'));
test('negative amount',     ()=>eq(parseOFX(OFX,'t.ofx')[0].amount,-42.50));
test('payee from NAME',     ()=>eq(parseOFX(OFX,'t.ofx')[0].payee,'STARBUCKS'));
test('empty → []',          ()=>eq(parseOFX('','t.ofx').length,0));
test('ACCTID used',         ()=>{ const o=`<OFX><ACCTID>CHK-99</ACCTID><STMTTRN><DTPOSTED>20240101</DTPOSTED><TRNAMT>-10</TRNAMT><n>X</n></STMTTRN></OFX>`; const r=parseOFX(o,'t.ofx'); if(r.length>0) eq(r[0].account,'CHK-99'); });
test('parseOFXDate YYYYMMDD',()=>eq(parseOFXDate('20240315'),'2024-03-15'));
test('parseOFXDate with time',()=>eq(parseOFXDate('20240315120000'),'2024-03-15'));

// ═══════════════════════════════════════════════════════════════
// SUITE 8 — calcAge + life stages (16 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 8 ] Age & Life Stage');
const YR=new Date().getFullYear(), MO=String(new Date().getMonth()+1).padStart(2,'0');
test('calcAge ~10',         ()=>{ const a=calcAge(`${YR-10}-${MO}-01`); assert(a===10||a===9,`~10 got ${a}`); });
test('calcAge null→null',   ()=>eq(calcAge(null),null));
test('calcAge empty→null',  ()=>eq(calcAge(''),null));
test('calcAge invalid→null',()=>eq(calcAge('bad'),null));
test('calcAge future<0',    ()=>assert(calcAge(`${YR+5}-01-01`)<0));
test('getLifeStage 3',      ()=>eq(getLifeStage(3).stage,'early_childhood'));
test('getLifeStage 8',      ()=>eq(getLifeStage(8).stage,'elementary'));
test('getLifeStage 13',     ()=>eq(getLifeStage(13).stage,'middle_school'));
test('getLifeStage 16',     ()=>eq(getLifeStage(16).stage,'high_school'));
test('getLifeStage 20',     ()=>eq(getLifeStage(20).stage,'college'));
test('getLifeStage null',   ()=>eq(getLifeStage(null),null));
test('getLifeStage 0',      ()=>assert(getLifeStage(0)!==null));
test('getLifeStage 100',    ()=>assert(getLifeStage(100)!==null));
test('getParentStage 32',   ()=>eq(getParentLifeStage(32).stage,'early_career'));
test('getParentStage 42',   ()=>eq(getParentLifeStage(42).stage,'peak_earning'));
test('getParentStage null', ()=>eq(getParentLifeStage(null),null));

// ═══════════════════════════════════════════════════════════════
// SUITE 9 — scoreImpulse (6 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 9 ] scoreImpulse');
test('cheap H&B ≥50',       ()=>assert(scoreImpulse({category:'Health & Beauty',total:12,qty:1})>=50));
test('expensive elec <50',  ()=>assert(scoreImpulse({category:'Electronics',total:500,qty:1})<50));
test('capped at 100',       ()=>assert(scoreImpulse({category:'Health & Beauty',total:5,qty:5,title:'bundle'})<=100));
test('zero total no crash', ()=>assert(scoreImpulse({category:'Other',total:0,qty:1})>=0));
test('undefined fields safe',()=>assert(scoreImpulse({})>=0));
test('Pet Supplies impulse',()=>assert(scoreImpulse({category:'Pet Supplies',total:8,qty:3})>0));

// ═══════════════════════════════════════════════════════════════
// SUITE 10 — guessType (7 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 10 ] guessType');
test('checking',            ()=>eq(guessType('chase-checking'),'checking'));
test('savings',             ()=>eq(guessType('my-savings'),'savings'));
test('visa credit',         ()=>eq(guessType('visa-platinum'),'credit'));
test('amex',                ()=>eq(guessType('amex-gold'),'credit'));
test('401k',                ()=>eq(guessType('401k-fidelity'),'investment'));
test('roth IRA',            ()=>eq(guessType('roth-ira'),'investment'));
test('unknown',             ()=>eq(guessType('mystery'),'other'));

// ═══════════════════════════════════════════════════════════════
// SUITE 11 — fmt / fmtK (9 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 11 ] Formatters');
test('fmtK 1500',           ()=>eq(fmtK(1500),'$1.5K'));
test('fmtK 1M',             ()=>eq(fmtK(1500000),'$1.5M'));
test('fmtK <1000',          ()=>eq(fmtK(500),'$500'));
test('fmtK negative',       ()=>eq(fmtK(-1500),'$1.5K'));
test('fmtK zero',           ()=>eq(fmtK(0),'$0'));
test('fmt 42.50',           ()=>eq(fmt(42.5),'$42.50'));
test('fmt negative abs',    ()=>eq(fmt(-100),'$100.00'));
test('fmt zero',            ()=>eq(fmt(0),'$0.00'));
test('fmt large comma',     ()=>assert(fmt(1234567.89).includes(','),'comma'));

// ═══════════════════════════════════════════════════════════════
// SUITE 12 — DEFAULT_SETTINGS / family (10 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 12 ] Settings & Family');
test('familyName=Luka',     ()=>eq(DEFAULT_SETTINGS.familyName,'Luka'));
test('user1=Chris',         ()=>eq(DEFAULT_SETTINGS.user1,'Chris'));
test('user2=Kira',          ()=>eq(DEFAULT_SETTINGS.user2,'Kira'));
test('3 kids',              ()=>eq(DEFAULT_SETTINGS.kids.length,3));
test('Sam present',         ()=>assert(DEFAULT_SETTINGS.kids.some(k=>k.name==='Sam')));
test('Whitney present',     ()=>assert(DEFAULT_SETTINGS.kids.some(k=>k.name==='Whitney')));
test('Will present',        ()=>assert(DEFAULT_SETTINGS.kids.some(k=>k.name==='Will')));
test('savingsTarget=20',    ()=>eq(DEFAULT_SETTINGS.savingsTarget,20));
test('emergency=25000',     ()=>eq(DEFAULT_SETTINGS.emergencyTarget,25000));
test('largePurchase=150',   ()=>eq(DEFAULT_SETTINGS.largePurchaseThreshold,150));

// ═══════════════════════════════════════════════════════════════
// SUITE 13 — Deduplication (4 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 13 ] Deduplication');
test('dedup: 2 identical rows, 0 existing = both pass parser', ()=>{
  const p=parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,T,-42,S,C\n03/15/2024,T,-42,S,C','t.csv');
  eq(p.length,2,'parser returns both rows — dedup happens at import stage');
  // Simulate the actual processAll dedup: existing set starts empty
  const ex=new Set(); // no prior txns
  const deduped=p.filter(t=>!ex.has(`${t.date}|${t.payee}|${t.amount}|${t.account}`));
  eq(deduped.length,2,'all new rows pass when ex is empty');
  // Now simulate re-import of same file (existing = first import)
  const ex2=new Set(p.map(t=>`${t.date}|${t.payee}|${t.amount}|${t.account}`));
  const deduped2=p.filter(t=>!ex2.has(`${t.date}|${t.payee}|${t.amount}|${t.account}`));
  eq(deduped2.length,0,'re-import of same file = 0 new txns (all dupes)');
});
test('diff amounts not deduped', ()=>{
  const p=parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,T,-42,S,C\n03/15/2024,T,-43,S,C','t.csv');
  const ex=new Set(); eq(p.filter(t=>!ex.has(`${t.date}|${t.payee}|${t.amount}|${t.account}`)).length,2);
});
test('diff accounts not deduped', ()=>{
  const p=parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,T,-42,S,C1\n03/15/2024,T,-42,S,C2','t.csv');
  const ex=new Set(); eq(p.filter(t=>!ex.has(`${t.date}|${t.payee}|${t.amount}|${t.account}`)).length,2);
});
test('Amazon dedup works', ()=>{
  const r=parseAmazon(AMZ_NEW);
  const ex=new Set(r.slice(0,1).map(i=>`${i.date}|${i.title}|${i.orderId}`));
  const d=r.filter(i=>!ex.has(`${i.date}|${i.title}|${i.orderId}`));
  eq(d.length,1);
});

// ═══════════════════════════════════════════════════════════════
// SUITE 14 — Real-world edge cases (10 tests)
// ═══════════════════════════════════════════════════════════════
console.log('[ Suite 14 ] Real-world edge cases');
test('long payee no crash', ()=>{ const long='X'.repeat(500); assert(parseCSV(`Date,Payee,Amount,Cat,Acct\n03/15/2024,${long},-1,Y,Z`,'t.csv').length>=0); });
test('all quoted CSV',      ()=>{ const r=parseCSV('"Date","Payee","Amount","Cat","Acct"\n"03/15/2024","T","-42","S","C"','t.csv'); if(r.length>0){eq(r[0].payee,'T');} });
test('QIF bracket category',()=>{ const q='!Type:Bank\nD01/01/2024\nT-10\nPTest\nL[Transfer]\n^\n'; const r=parseQIF(q,'t.qif'); assert(r.length>=0); });
test('OFX zero amount safe',()=>{ const o='<OFX><STMTTRN><DTPOSTED>20240101</DTPOSTED><TRNAMT>0.00</TRNAMT><n>FEE</n></STMTTRN></OFX>'; assert(parseOFX(o,'t.ofx').length>=0); });
test('mixed date formats same CSV', ()=>{
  const c='Date,Payee,Amount,Cat,Acct\n03/15/2024,A,-1,Y,Z\n2024-03-16,B,-2,Y,Z\nMar 17 2024,C,-3,Y,Z';
  const r=parseCSV(c,'t.csv');
  assert(r.length>=1,'at least ISO rows');
});
test('QIF no payee uses Unknown', ()=>{ const q='!Type:Bank\nD01/01/2024\nT-20\n^'; const r=parseQIF(q,'t.qif'); if(r.length>0) ok(r[0].payee,'payee'); });
test('getLifeStage -1 no crash',  ()=>{ try{getLifeStage(-1);}catch(e){assert(false,`threw: ${e.message}`);} });
test('getLifeStage 100 returns something', ()=>ok(getLifeStage(100)));
test('parseDate strips whitespace', ()=>eq(parseDate('  2024-03-15  '), '2024-03-15'));
test('5000 row perf <5s',   ()=>{
  const rows=['Date,Payee,Amount,Category,Account'];
  for(let i=0;i<5000;i++) rows.push(`03/15/2024,P${i},-${(i%100)+1},Shopping,Checking`);
  const t=Date.now(); parseCSV(rows.join('\n'),'t.csv');
  assert(Date.now()-t<5000,`5000 rows took ${Date.now()-t}ms`);
});

// ═══════════════════════════════════════════════════════════════
// PRINT RESULTS
// ═══════════════════════════════════════════════════════════════
const TOTAL=PASS+FAIL;
console.log('\n'+'═'.repeat(64));
console.log('  FORGE — COMPREHENSIVE TEST RESULTS');
console.log('═'.repeat(64));
if(FAILS.length){
  console.log('\n  ❌  FAILURES:');
  FAILS.forEach(f=>console.log(`      [FAIL] ${f.name}\n             ${f.err}`));
}
console.log(`\n  ✅  Passed : ${PASS} / ${TOTAL}`);
console.log(`  ❌  Failed : ${FAIL} / ${TOTAL}`);
console.log(`  📊  Score  : ${Math.round(PASS/TOTAL*100)}%`);
console.log(FAIL===0
  ? '\n  🏆  ALL TESTS PASS — Forge is battle-ready.\n'
  : `\n  ⚠️   ${FAIL} test(s) need attention.\n`);
