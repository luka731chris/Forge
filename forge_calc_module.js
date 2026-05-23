// Auto-extracted Forge calculation functions
function computeScale(vals, opts) {
  opts = opts || {};
  var showZero      = opts.showZero !== false;
  var forceZeroBase = opts.forceZeroBase || false;
  var padPct        = opts.padPct != null ? opts.padPct : 0.18;
  var finite        = vals.filter(isFinite);
  if (!finite.length) return { maxV:1, minV:0, span:1, y0Pct:0, ticks:[], zero:true };

  var dMax  = finite.reduce(function(m,v){ return Math.max(m,v); }, finite[0]);
  var dMin  = finite.reduce(function(m,v){ return Math.min(m,v); }, finite[0]);
  var dSpan = Math.max(Math.abs(dMax - dMin), 1);
  var pad   = dSpan * padPct;
  var rawMax = dMax + pad;
  var rawMin = dMin - pad;

  if (forceZeroBase) {
    rawMax = Math.max(rawMax, 0);
    rawMin = Math.min(rawMin, 0);
  } else if (showZero) {
    var distToZero = (dMin >= 0) ? dMin : (dMax <= 0 ? Math.abs(dMax) : 0);
    if (distToZero <= dSpan * 2.0) {
      rawMax = Math.max(rawMax, 0);
      rawMin = Math.min(rawMin, 0);
    }
  }

  if (opts.minSpan && (rawMax - rawMin) < opts.minSpan) {
    var mid = (rawMax + rawMin) / 2;
    rawMax = Math.max(rawMax, mid + opts.minSpan / 2);
    rawMin = Math.min(rawMin, mid - opts.minSpan / 2);
    if (showZero || forceZeroBase) { rawMax = Math.max(rawMax,0); rawMin = Math.min(rawMin,0); }
  }

  var span = Math.max(rawMax - rawMin, 1);

  function niceTicks(lo, hi) {
    var range = hi - lo, rough = range / 5;
    if (rough <= 0) return [lo, hi];
    var mag   = Math.pow(10, Math.floor(Math.log10(rough)));
    var cands = [mag*0.5, mag, mag*2, mag*2.5, mag*5, mag*10];
    var iv    = cands.find(function(c){ return range/c >= 3 && range/c <= 7; }) || rough;
    var start = Math.ceil(lo / iv) * iv;
    var ticks = [];
    for (var v = start; v <= hi + iv*0.01; v += iv)
      ticks.push(Math.round(v * 1000) / 1000);
    return ticks;
  }

  return {
    maxV:      rawMax,
    minV:      rawMin,
    span:      span,
    y0Pct:     Math.max(0, Math.min(1, (0 - rawMin) / span)),
    ticks:     niceTicks(rawMin, rawMax),
    zero:      rawMin <= 0 && rawMax >= 0,
    truncated: dMin > 0 && rawMin > 0
  };
}


function monthlyData(txnArr) {
  const m = {};
  txnArr.forEach(t => {
    const k = t.date.slice(0,7);
    if (!m[k]) m[k] = { inc:0, exp:0 };
    if (t.amount > 0) m[k].inc += t.amount;
    else              m[k].exp += Math.abs(t.amount);
  });
  const keys = Object.keys(m).sort();
  return {
    labels:   keys.map(k => k.slice(2)),  // YY-MM
    fullKeys: keys,
    income:   keys.map(k => m[k].inc),
    expenses: keys.map(k => m[k].exp),
  };
}


function buildSavingsRegister(months) {
  if (!months || !months.length) return [];
  const DETAIL = new Set(['apple_card','amazon_orders','home_depot','lowes','venmo']);
  const OPER   = new Set(['checking','savings','credit']);
  const rows   = [];

  months.forEach(function(mo) {
    const moTxns = (txns||[]).filter(function(t) {
      if (!t.date.startsWith(mo)) return false;
      if (isTransfer(t)) return false;
      if (t._masked || t.itemDetail) return false;
      if (DETAIL.has(t._source||t._ftype||'')) return false;
      if (!OPER.has(detectAcctType(t.account||''))) return false;
      return true;
    });

    // Income: non-transfer positive amounts on CHECKING accounts only
    const income = moTxns.filter(function(t) {
      return t.amount > 0 && detectAcctType(t.account||'') === 'checking';
    }).reduce(function(s,t){ return s+t.amount; }, 0);

    // Expenses: checking outflows + CC charges (not CC payments which are transfers)
    const expenses = moTxns.filter(function(t) {
      const tp = detectAcctType(t.account||'');
      return t.amount < 0 && (tp === 'checking' || tp === 'credit');
    }).reduce(function(s,t){ return s+Math.abs(t.amount); }, 0);

    // Savings transfers out (checking → savings)
    const savXferOut = (txns||[]).filter(function(t) {
      return t.date.startsWith(mo) && isTransfer(t) && t.amount < 0 && detectAcctType(t.account||'') === 'checking';
    }).reduce(function(s,t){ return s+Math.abs(t.amount); }, 0);

    // Savings transfers in (savings → checking draw)
    const savXferIn = (txns||[]).filter(function(t) {
      return t.date.startsWith(mo) && isTransfer(t) && t.amount > 0 && detectAcctType(t.account||'') === 'checking';
    }).reduce(function(s,t){ return s+t.amount; }, 0);

    const mParts   = mo.split('-');
    const monthName = new Date(+mParts[0], +mParts[1]-1, 1).toLocaleDateString('en-US',{month:'short', year:'2-digit'});

    rows.push({
      month:      mo,
      monthName:  monthName,
      income:     income,
      expenses:   expenses,
      net:        income - expenses,
      savXferOut: savXferOut,
      savXferIn:  savXferIn,
      cumulative: 0  // filled in below
    });
  });

  // Compute running cumulative net
  let cum = 0;
  rows.forEach(function(r) { cum += r.net; r.cumulative = cum; });
  return rows;
}


