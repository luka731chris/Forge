'use strict';
let txns = [], accounts = [], amzItems = [], charts = {};
const DEFAULT_SETTINGS = {
  familyName: 'Luka',
  user1: 'Chris',
  user2: 'Kira',
  user1Dob: '',
  user2Dob: '',
  kids: [
    { name: 'Sam',     gender: 'm', dob: '', emoji: '👦' },
    { name: 'Whitney', gender: 'f', dob: '', emoji: '👧' },
    { name: 'Will',    gender: 'm', dob: '', emoji: '👦' },
  ],
  savingsTarget: 20,
  emergencyTarget: 25000,
  largePurchaseThreshold: 150,
  amzSensitivity: 3,
  confluenceMode: true,
  kidsInAlerts: true,
  confluenceAnim: true,
  meetingDay: '1',
  meetingDuration: '35',
  reportHeader: 'The Luka Family',
  reportSubtitle: 'Monthly Financial Review',
  pdfCollege: true,
  pdfSavings: true,
  categoryBudgets: {},
  agendaSteps: { 1:true, 2:true, 3:true, 4:true, 5:true, 6:true },
  // Maps Quicken account names → family member name for per-person analytics
  accountOwners: {},
  // How aggressively to flag detail-file impulse items (1=lenient, 5=strict)
  detailSensitivity: 3,
};
const CAT_COLORS = ['#FFB612','#4a9eff','#3ecf8e','#f97316','#a78bfa','#f43f5e','#06b6d4','#eab308','#8b5cf6','#10b981','#fb923c','#60a5fa','#34d399','#fbbf24','#c084fc','#fb7185','#38bdf8','#4ade80'];
const ACCT_COLORS = ['#FFB612','#4a9eff','#3ecf8e','#f97316','#a78bfa','#f43f5e','#06b6d4','#eab308','#8b5cf6','#10b981','#fb923c','#60a5fa'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const IMPULSE_CATS = new Set(['Health & Beauty','Toys & Games','Books','Electronics Accessories','Home','Kitchen','Sports','Pet Supplies','Arts Crafts & Sewing','Clothing','Shoes','Beauty','Grocery & Gourmet Food']);
const KID_EMOJIS = ['👦','👧','🧒','👶'];
const DB_KEY = 'ledger_v3';
const SETTINGS_KEY = 'forge_settings_v1';
const fmt=(n)=>'$'+Math.abs(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK=(n)=>{const a=Math.abs(n||0);return a>=1e6?'$'+(a/1e6).toFixed(1)+'M':a>=1000?'$'+(a/1000).toFixed(1)+'K':'$'+a.toFixed(0);};
const fmtPct=(n)=>(n>=0?'+':'')+n.toFixed(1)+'%';
let settings = { ...DEFAULT_SETTINGS };
let range = '1y', catR = '1y', mchR = '1y', intelR = '6m';
let intelAlerts=[];
let budgetDriftData=[];
let anomalyData=[];
let seasonalData={};
let isDemoMode = false;
let pendingFiles = [];

function parseDate(s) {
  if (!s) return null;
  s = String(s).trim().replace(/^["']+|["']+$/g,'');
  if (!s) return null;

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (m) {
    const [,y,mo,d] = m;
    if (parseInt(mo)>=1&&parseInt(mo)<=12&&parseInt(d)>=1&&parseInt(d)<=31)
      return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY or M/D/YY etc
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    let [,mo,d,y] = m;
    if (y.length===2) y = (parseInt(y)>30?'19':'20')+y;
    if (parseInt(mo)>=1&&parseInt(mo)<=12&&parseInt(d)>=1&&parseInt(d)<=31)
      return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // "Jan 05, 2024" or "January 5, 2024"
  const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  m = s.match(/^([A-Za-z]{3,9})[\s\.]+(\d{1,2}),?\s*(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[1].slice(0,3).toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  }

  // "5 Jan 2024" or "05-Jan-2024"
  m = s.match(/^(\d{1,2})[-\s]+([A-Za-z]{3,9})[-\s]+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].slice(0,3).toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }

  return null;
}

function splitCSV(l){const r=[];let c='',q=false;for(const ch of l){if(ch==='"'){q=!q;}else if(ch===','&&!q){r.push(c.trim());c='';}else c+=ch;}r.push(c.trim());return r;}

function parseCSV(text, fname) {
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  if (!lines.length) return [];
  // Handle both comma and tab delimited (Quicken exports both)
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const hdr = lines[0].split(delimiter).map(h=>h.replace(/["\']/g,'').trim().toLowerCase());
  const col = (...ns) => {
    for (const n of ns) {
      const i = hdr.findIndex(h => h===n || h.includes(n));
      if (i>=0) return i;
    }
    return -1;
  };
  const dateC = col('date','transaction date','trans date','posted date','post date','value date');
  const payeeC= col('payee','description','merchant','name','memo','narrative','details');
  const amtC  = col('amount','transaction amount','value','debit/credit','debit','credit','net amount','withdrawal','deposit');
  const catC  = col('category','type','transaction type','class');
  const acctC = col('account','account name','account number');
  const memoC = col('memo','notes','note','reference');
  const acctName = fname.replace(/\.[^.]+$/,'');
  return lines.slice(1).map(l=>{
    const r = delimiter==='\t' ? l.split('\t').map(c=>c.trim()) : splitCSV(l);
    if (r.length < 2) return null;
    const date=parseDate(dateC>=0?r[dateC]:''); if(!date)return null;
    const _rawA=(amtC>=0?r[amtC]:'0')||'0';
    const _neg=_rawA.trim().startsWith('(')||(_rawA.trim().startsWith('-')&&_rawA.trim().length>1);
    const amount=parseFloat(_rawA.replace(/[$,()"\s]/g,'').replace(/,/g,''))*(_neg&&!_rawA.includes('-')?-1:1);
    if(isNaN(amount))return null;
    return { date, payee:(payeeC>=0?r[payeeC]:'Unknown').replace(/"/g,'').trim()||'Unknown', amount, category:(catC>=0?r[catC]:'Uncategorized').replace(/"/g,'').trim()||'Uncategorized', account:(acctC>=0?r[acctC]:acctName).replace(/"/g,'').trim()||acctName, memo:'', type:amount>=0?'credit':'debit' };
  }).filter(Boolean);
}

function parseQIF(text, fname) {
  if (!text || !text.trim()) return [];
  const acctName=fname.replace(/\.[^.]+$/,''); let cur={}, acct=acctName; const out=[];
  for (const line of text.split('\n')) {
    const l=line.trim(); if(!l)continue;
    if(l==='^'){if(cur.date&&cur.amount!==undefined){out.push({date:cur.date,payee:cur.payee||'Unknown',amount:cur.amount,category:cur.category||'Uncategorized',account:acct,memo:cur.memo||'',type:cur.amount>=0?'credit':'debit'});}cur={};}
    else{const c=l[0],v=l.slice(1).trim();if(c==='D')cur.date=parseDate(v);else if(c==='T')cur.amount=parseFloat(v.replace(/[$,]/g,''));else if(c==='P')cur.payee=v;else if(c==='L')cur.category=v.replace(/^\[|\]$/g,'');else if(c==='M')cur.memo=v;}
  }
  return out.filter(t=>t.date);
}

function parseOFX(text, fname) {
  if (!text || !text.trim()) return [];
  const acctName=fname.replace(/\.[^.]+$/,''); const out=[];
  const blocks=text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi)||[];
  const acctM=text.match(/<ACCTID>(.*?)</i); const acctId=acctM?acctM[1].trim():acctName;
  for (const b of blocks) {
    const g=tag=>{const m=b.match(new RegExp(`<${tag}>([^<\n]+)`,'i'));return m?m[1].trim():'';};
    const date=parseOFXDate(g('DTPOSTED')||g('DTUSER')); if(!date)continue;
    const amount=parseFloat(g('TRNAMT')||'0'); if(isNaN(amount))continue;
    const payee=g('NAME')||g('n')||g('MEMO')||'Unknown';
    out.push({date,payee,amount,category:g('CATEGORY')||'Uncategorized',account:acctId,memo:g('MEMO')||'',type:amount>=0?'credit':'debit'});
  }
  return out;
}

function parseOFXDate(s){if(!s)return null;s=s.replace(/\[.*\]/,'').trim();return s.length>=8?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:null;}

function parseAmazon(text) {
  const lines=text.split('\n').map(l=>l.trim()).filter(Boolean); if(!lines.length)return[];
  const hdr=lines[0].split(',').map(h=>h.replace(/"/g,'').trim().toLowerCase());
  const col=(...ns)=>{for(const n of ns){const i=hdr.indexOf(n);if(i>=0)return i;}return -1;};

  // Supports both:
  // NEW format (2023+): Amazon Privacy Central → Your Orders → Retail.OrderHistory.1.csv
  //   Columns: Order ID, Order Date, Product Name, Quantity, Purchase Price Per Unit,
  //            Grand Total, ASIN/ISBN, Department, ...
  // OLD format (pre-2023): Order History Reports → Items CSV
  //   Columns: Order Date, Order ID, Title, Category, ASIN, Quantity, Item Total, ...

  const dc = col('order date','date');
  const tc = col('product name','title','item','product description');
  const cc = col('department','category','product category');
  const pc = col('purchase price per unit','item total','price','unit price','amount');
  const gc = col('grand total','order total','total charged');
  const qc = col('quantity','qty');
  const oc = col('order id');
  const ac = col('asin/isbn','asin');

  return lines.slice(1).map(r=>{
    const row=splitCSV(r);
    const date=parseDate(dc>=0?row[dc]:''); if(!date)return null;
    const title=(tc>=0?row[tc]:'Unknown').replace(/"/g,'').trim();
    if(!title||title==='Unknown')return null;
    const category=(cc>=0?row[cc]:'Other').replace(/"/g,'').trim()||'Other';
    const qty=parseInt((qc>=0?row[qc]:'1').replace(/\D/g,''))||1;

    // Prefer grand total, fall back to unit price × qty
    let total=0;
    if(gc>=0){
      total=parseFloat((row[gc]||'0').replace(/[$,"\s]/g,''));
    }
    if(isNaN(total)||total===0){
      const unitPrice=parseFloat((pc>=0?row[pc]:'0').replace(/[$,"\s]/g,''));
      total=isNaN(unitPrice)?0:parseFloat((unitPrice*qty).toFixed(2));
    }
    if(total<=0)return null;

    return{
      date,
      title,
      category,
      price: parseFloat((total/qty).toFixed(2)),
      qty,
      total: parseFloat(total.toFixed(2)),
      orderId:(oc>=0?row[oc]:'').replace(/"/g,'').trim(),
      asin:(ac>=0?row[ac]:'').replace(/"/g,'').trim(),
    };
  }).filter(Boolean);
}

function parseAppleCard(text, fname, purchaser) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const hdr = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
  const col = (...ns) => { for (const n of ns) { const i = hdr.indexOf(n); if (i >= 0) return i; } return -1; };
  const dIdx = col('transaction date','clearing date','date');
  const tIdx = col('merchant','description','payee');
  const aIdx = col('amount (usd)','amount');
  const cIdx = col('category','type');
  if (dIdx < 0 || tIdx < 0 || aIdx < 0) return [];
  const owner = (purchaser !== undefined && purchaser !== null) ? purchaser : (fname.replace(/\.csv$/i,'').replace(/[_-]/g,' ').trim() || 'Apple Card');
  return lines.slice(1).map(line => {
    const row = splitCSV(line);
    const raw = (row[aIdx]||'').replace(/[",]/g,'').trim();
    if (!raw) return null;
    const amount = parseFloat(raw.replace(/[$()]/g,'').trim());
    if (!amount || amount <= 0) return null;
    const date = parseDate((row[dIdx]||'').replace(/"/g,'').trim());
    if (!date) return null;
    const title = (row[tIdx]||'').replace(/"/g,'').trim();
    if (!title) return null;
    const catRaw = cIdx >= 0 ? (row[cIdx]||'').replace(/"/g,'').trim() : 'Shopping';
    // Skip payments, credits, autopay rows
    if (['payment','autopay','credit','refund'].some(k => catRaw.toLowerCase().includes(k) || title.toLowerCase().includes(k))) return null;
    return {
      date, title, category: catRaw || 'Shopping',
      price: amount, qty: 1, total: parseFloat(amount.toFixed(2)),
      orderId: `AC-${date}-${title.slice(0,8).replace(/\s/g,'')}`,
      asin: '', source: 'Apple Card', purchaser: owner,
    };
  }).filter(Boolean);
}

function parseGenericDetail(text, fname, purchaser) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const hdr = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
  const col = (...ns) => { for (const n of ns) { const i = hdr.indexOf(n); if (i >= 0) return i; } return -1; };
  const dIdx = col('date','transaction date','order date','purchase date','posted date');
  const tIdx = col('description','merchant','name','payee','title','item','memo');
  const aIdx = col('amount','total','price','charge','debit','cost','amount usd');
  const cIdx = col('category','type','department');
  if (dIdx < 0 || tIdx < 0 || aIdx < 0) return [];
  const srcName = fname.replace(/\.csv$/i,'').replace(/[_-]/g,' ').trim() || 'Detail Import';
  const owner = (purchaser !== undefined) ? purchaser : null;
  return lines.slice(1).map(line => {
    const row = splitCSV(line);
    const raw = (row[aIdx]||'').replace(/[",]/g,'').trim();
    if (!raw) return null;
    const amount = Math.abs(parseFloat(raw.replace(/[$()]/g,'').trim()) || 0);
    if (!amount) return null;
    const date = parseDate((row[dIdx]||'').replace(/"/g,'').trim());
    if (!date) return null;
    const title = (row[tIdx]||'').replace(/"/g,'').trim();
    if (!title) return null;
    const category = cIdx >= 0 ? (row[cIdx]||'').replace(/"/g,'').trim() || srcName : srcName;
    return {
      date, title, category,
      price: amount, qty: 1, total: parseFloat(amount.toFixed(2)),
      orderId: `GD-${date}-${title.slice(0,8).replace(/\s/g,'')}`,
      asin: '', source: srcName, purchaser: owner,
    };
  }).filter(i => i && i.total > 0);
}

function parseDetailFile(text, fname, purchaser) {
  if (!text || !text.trim()) return [];
  const firstLine = text.split('\n')[0].toLowerCase();
  // Amazon: ASIN column, 'product name', 'order id', or filename match
  if (firstLine.includes('asin') || firstLine.includes('product name') ||
      firstLine.includes('order id') || fname.toLowerCase().includes('retail.orderhistory') ||
      fname.toLowerCase().includes('orderhistory')) {
    const items = parseAmazon(text);
    // Stamp purchaser and source on every Amazon item
    return items.map(i => ({ ...i, source: 'Amazon', purchaser: purchaser || null }));
  }
  // Apple Card: clearing date column or "amount (usd)" or filename
  if (firstLine.includes('clearing date') || firstLine.includes('amount (usd)') ||
      fname.toLowerCase().includes('apple') || fname.toLowerCase().includes('applecard')) {
    return parseAppleCard(text, fname, purchaser);
  }
  // Fall back to generic parser
  return parseGenericDetail(text, fname, purchaser);
}

function sniffFile(text, fname) {
  if (!text || !text.trim()) return 'quicken';
  const fl = text.split('\n')[0].toLowerCase().replace(/"/g, '');
  const fn = fname.toLowerCase();

  // Amazon: has ASIN column or product name + order id
  if (fl.includes('asin') || fl.includes('product name') ||
      (fl.includes('order id') && fl.includes('quantity')) ||
      fn.includes('retail.orderhistory') || fn.includes('orderhistory')) {
    return 'amazon';
  }
  // Apple Card: clearing date + amount (usd), or filename signal
  if (fl.includes('clearing date') || fl.includes('amount (usd)') ||
      fn.includes('applecard') || fn.includes('apple_card') ||
      (fn.includes('apple') && fn.includes('card'))) {
    return 'applecard';
  }
  // Other detail formats: has "order date" but not Quicken-like payee/account structure
  if ((fl.includes('order date') || fl.includes('order id') || fl.includes('product') ||
       fl.includes('merchant') && !fl.includes('payee') && !fl.includes('account')) &&
      !fl.includes('qif') && !fl.includes('ofx')) {
    // Could be detail if it lacks the Quicken signature columns
    const hasQuickenCols = fl.includes('payee') || fl.includes('account');
    if (!hasQuickenCols) return 'detail';
  }
  // Quicken QIF/QFX/OFX are always Quicken format
  const ext = fname.split('.').pop().toLowerCase();
  if (['qif','qfx','ofx'].includes(ext)) return 'quicken';

  // For CSV: if it has ASIN/product signal it's detail, otherwise Quicken
  return 'quicken';
}

function scoreImpulse(item){
  if (!item) return 0;
  let s=0;
  const cat   = (item.category||'').toLowerCase();
  const ttl   = (item.title||'').toLowerCase();
  const total = item.total||0;
  const qty   = item.qty||1;
  if(IMPULSE_CATS&&IMPULSE_CATS.has(item.category))s+=30;
  if(total>0&&total<15)s+=25;else if(total>=15&&total<30)s+=15;
  if(qty>=3&&total<50)s+=15;
  if(ttl.includes('pack')||ttl.includes('bundle')||ttl.includes('variety'))s+=10;
  return Math.min(s,100);
}

function impulseBadge(sc){
  if(sc>=60)return{lbl:'🔴 High',cls:'imp-hi'};
  if(sc>=30)return{lbl:'🟡 Med',cls:'imp-md'};
  return{lbl:'🟢 Low',cls:'imp-lo'};
}

function guessType(n){n=n.toLowerCase();if(n.includes('check'))return'checking';if(n.includes('sav'))return'savings';if(n.includes('visa')||n.includes('credit')||n.includes('card')||n.includes('amex')||n.includes('mc'))return'credit';if(n.includes('invest')||n.includes('401')||n.includes('ira')||n.includes('brokerage')||n.includes('roth'))return'investment';return'other';}

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth)) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calcAgeInYears(dob, yearsAhead = 0) {
  if (!dob) return null;
  const future = new Date();
  future.setFullYear(future.getFullYear() + yearsAhead);
  const birth = new Date(dob);
  if (isNaN(birth)) return null;
  let age = future.getFullYear() - birth.getFullYear();
  const m = future.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && future.getDate() < birth.getDate())) age--;
  return age;
}

function getLifeStage(age) {
  if (age === null) return null;
  if (age < 5)  return { stage: 'early_childhood', label: 'Early Childhood', icon: '🍼' };
  if (age < 12) return { stage: 'elementary',      label: 'Elementary School', icon: '🎒' };
  if (age < 15) return { stage: 'middle_school',   label: 'Middle School',     icon: '📚' };
  if (age < 18) return { stage: 'high_school',     label: 'High School',       icon: '🎓' };
  if (age < 22) return { stage: 'college',          label: 'College',          icon: '🏛️' };
  if (age < 26) return { stage: 'young_adult',      label: 'Young Adult',      icon: '💼' };
  return { stage: 'adult', label: 'Adult', icon: '🧑' };
}

function getParentLifeStage(age) {
  if (age === null || age === undefined) return null;
  if (age < 37) return { stage: 'early_career',   label: 'Early Career',   icon: '🚀' };
  if (age < 47) return { stage: 'peak_earning',   label: 'Peak Earning',   icon: '📈' };
  if (age < 58) return { stage: 'pre_retirement', label: 'Pre-Retirement', icon: '🏗️' };
  if (age < 67) return { stage: 'late_career',    label: 'Late Career',    icon: '🏁' };
  return { stage: 'retirement', label: 'Retirement', icon: '🌅' };
}

function getRange(r) {
  const now=new Date(); const end=new Date(now.getFullYear(),now.getMonth()+1,0);
  let start;
  if(r==='3m')start=new Date(now.getFullYear(),now.getMonth()-2,1);
  else if(r==='6m')start=new Date(now.getFullYear(),now.getMonth()-5,1);
  else if(r==='1y')start=new Date(now.getFullYear()-1,now.getMonth()+1,1);
  else start=new Date('2000-01-01');
  return{start,end};
}

function inRange(t,r){const{start,end}=getRange(r);const d=new Date(t.date);return d>=start&&d<=end;}

function getSavingsRate() {
  const now = new Date();
  const start = new Date(now.getFullYear()-1, now.getMonth()+1, 1);
  const yr = txns.filter(t=>new Date(t.date)>=start);
  const inc = yr.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
  const exp = Math.abs(yr.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0));
  return inc>0?((inc-exp)/inc*100):0;
}

function getAnnualNet() {
  const now = new Date();
  const start = new Date(now.getFullYear()-1, now.getMonth()+1, 1);
  const yr = txns.filter(t=>new Date(t.date)>=start);
  return yr.reduce((s,t)=>s+t.amount,0);
}

function groupByDimension(txns, dim) {
  const groups = {};
  txns.forEach(t => {
    let key;
    const d = new Date(t.date);
    if (dim === 'month')     key = t.date.slice(0,7);
    else if (dim === 'quarter') {
      const q = Math.floor(d.getMonth()/3)+1;
      key = `${d.getFullYear()} Q${q}`;
    }
    else if (dim === 'year')       key = String(d.getFullYear());
    else if (dim === 'category')   key = t.category || 'Uncategorized';
    else if (dim === 'account')    key = t.account || 'Unknown';
    else if (dim === 'purchaser')  key = inferTxnOwner(t) || 'Shared';
    else if (dim === 'source')     key = t.account || 'Unknown';
    else if (dim === 'dayofweek')  key = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    else key = t.category;
    if (!groups[key]) groups[key] = { exp:0, inc:0, count:0, amounts:[] };
    if (t.amount < 0) { groups[key].exp += Math.abs(t.amount); groups[key].count++; groups[key].amounts.push(Math.abs(t.amount)); }
    else groups[key].inc += t.amount;
  });
  return groups;
}

function computeMetric(group, metric) {
  if (metric === 'spending')     return group.exp;
  if (metric === 'income')       return group.inc;
  if (metric === 'net')          return group.inc - group.exp;
  if (metric === 'txncount')     return group.count;
  if (metric === 'avg')          return group.count > 0 ? group.exp/group.count : 0;
  if (metric === 'savings_rate') return (group.inc + group.exp) > 0 ? ((group.inc-group.exp)/group.inc*100) : 0;
  return group.exp;
}

function personSummary(personName, dateFrom) {
  const mine = amzItems.filter(i => i.purchaser === personName &&
    (!dateFrom || new Date(i.date) >= dateFrom));
  if (!mine.length) return null;
  const total = mine.reduce((s,i) => s+i.total, 0);
  const catMap = {};
  mine.forEach(i => catMap[i.category] = (catMap[i.category]||0)+i.total);
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
  const highImp = mine.filter(i => scoreImpulse(i) >= 60);
  const months = [...new Set(mine.map(i=>i.date.slice(0,7)))].length || 1;
  return {
    name: personName, total, items: mine.length,
    topCat, impulseRate: mine.length ? Math.round(highImp.length/mine.length*100) : 0,
    avgOrder: mine.length ? total/mine.length : 0,
    monthlyAvg: total/months,
    categories: Object.entries(catMap).sort((a,b)=>b[1]-a[1]),
  };
}

function detectPersonTrends() {
  const people = [...new Set(amzItems.map(i=>i.purchaser).filter(Boolean))];
  const trends = [];
  const now = new Date();
  const c3start = new Date(now.getFullYear(), now.getMonth()-2, 1);
  const p3start = new Date(now.getFullYear(), now.getMonth()-5, 1);

  people.forEach(person => {
    const cur3 = amzItems.filter(i => i.purchaser===person && new Date(i.date)>=c3start);
    const prv3 = amzItems.filter(i => i.purchaser===person && new Date(i.date)>=p3start && new Date(i.date)<c3start);
    const curT = cur3.reduce((s,i)=>s+i.total,0);
    const prvT = prv3.reduce((s,i)=>s+i.total,0);
    if (prvT < 30) return;
    const pct = ((curT-prvT)/prvT)*100;

    // Category-level trends per person
    const curCats={}, prvCats={};
    cur3.forEach(i=>curCats[i.category]=(curCats[i.category]||0)+i.total);
    prv3.forEach(i=>prvCats[i.category]=(prvCats[i.category]||0)+i.total);
    Object.entries(curCats).forEach(([cat,v])=>{
      const p=prvCats[cat]||0; if(p<15)return;
      const pct2=((v-p)/p)*100;
      if(pct2>40) trends.push({ person, cat, pct:pct2, cur:v, prv:p, sev:pct2>80?'danger':'warn' });
    });

    if (pct > 30) trends.push({ person, cat:'ALL', pct, cur:curT, prv:prvT, sev:pct>70?'danger':'warn' });
  });
  return trends;
}

function predictMonthlyDetail(personName) {
  if (!amzItems.length) return null;
  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const mtd = amzItems.filter(i => i.purchaser===personName && i.date.startsWith(now.toISOString().slice(0,7)));
  const mtdTotal = mtd.reduce((s,i)=>s+i.total, 0);
  const projected = day > 0 ? mtdTotal * (daysInMonth/day) : 0;
  const hist = amzItems.filter(i => i.purchaser===personName);
  const months = [...new Set(hist.map(i=>i.date.slice(0,7)))].length || 1;
  const histAvg = hist.reduce((s,i)=>s+i.total,0) / months;
  return { projected, histAvg, mtdTotal, daysLeft: daysInMonth-day };
}

function inferTxnOwner(txn) {
  if (!settings.accountOwners) return null;
  return settings.accountOwners[txn.account] || null;
}

function getPersonSpend(items, personName) {
  if (!personName) return items;
  return items.filter(i => i.purchaser === personName);
}


module.exports = {txns, amzItems, accounts, parseDate, splitCSV, parseCSV, parseQIF, parseOFX, parseOFXDate, parseAmazon, parseAppleCard, parseGenericDetail, parseDetailFile, sniffFile, scoreImpulse, impulseBadge, guessType, calcAge, calcAgeInYears, getLifeStage, getParentLifeStage, getRange, inRange, getSavingsRate, getAnnualNet, groupByDimension, computeMetric, personSummary, detectPersonTrends, predictMonthlyDetail, inferTxnOwner, getPersonSpend, DEFAULT_SETTINGS, CAT_COLORS, ACCT_COLORS, MONTHS, IMPULSE_CATS, KID_EMOJIS, DB_KEY, SETTINGS_KEY, fmt, fmtK, fmtPct, settings, range, intelAlerts, budgetDriftData, anomalyData, seasonalData, isDemoMode, pendingFiles};
