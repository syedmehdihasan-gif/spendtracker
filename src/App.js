import { useState, useMemo, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
  ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ── Accounts Mock Data ───────────────────────────────────────
const CREDIT_CARDS = [
  {id:1,name:"Chase Sapphire",network:"Visa",balance:2840.50,limit:10000,minPayment:85,dueDate:"Mar 15",apr:24.99,color:"#6366f1",rewards:"3.2x points",recentSpend:[{cat:"Food",amt:420},{cat:"Travel",amt:380},{cat:"Shopping",amt:290},{cat:"Other",amt:180}]},
  {id:2,name:"Amex Gold",network:"Amex",balance:1240.00,limit:8000,minPayment:35,dueDate:"Mar 22",apr:19.99,color:"#f59e0b",rewards:"4x dining",recentSpend:[{cat:"Dining",amt:340},{cat:"Groceries",amt:220},{cat:"Shopping",amt:180},{cat:"Other",amt:90}]},
  {id:3,name:"Citi Double Cash",network:"Mastercard",balance:580.25,limit:5000,minPayment:25,dueDate:"Mar 28",apr:21.99,color:"#10b981",rewards:"2% cashback",recentSpend:[{cat:"Gas",amt:120},{cat:"Utilities",amt:180},{cat:"Shopping",amt:160},{cat:"Other",amt:80}]},
];
const BROKERAGE_ACCTS = [
  {id:1,name:"Fidelity",type:"Taxable",balance:24820.40,dayChange:+340.20,dayChangePct:+1.38,totalGain:+4820.40,color:"#10b981",
    holdings:[{ticker:"VOO",name:"Vanguard S&P 500",shares:12.5,price:489.47,value:6118.38,gain:+818.38,gainPct:+15.4},{ticker:"AAPL",name:"Apple Inc.",shares:18,price:218.24,value:3928.32,gain:+928.32,gainPct:+30.9},{ticker:"BND",name:"Vanguard Bond ETF",shares:85,price:72.23,value:6139.55,gain:+139.55,gainPct:+2.3}]},
  {id:2,name:"Schwab",type:"Taxable",balance:12340.80,dayChange:-120.40,dayChangePct:-0.97,totalGain:+2340.80,color:"#6366f1",
    holdings:[{ticker:"QQQ",name:"Invesco QQQ",shares:10,price:485.20,value:4852.00,gain:+852.00,gainPct:+21.3},{ticker:"VTI",name:"Vanguard Total Mkt",shares:28,price:267.45,value:7488.60,gain:+1488.60,gainPct:+24.8}]},
  {id:3,name:"Robinhood",type:"Taxable",balance:4280.60,dayChange:+82.10,dayChangePct:+1.96,totalGain:+280.60,color:"#22d3ee",
    holdings:[{ticker:"TSLA",name:"Tesla",shares:5,price:248.42,value:1242.10,gain:-257.90,gainPct:-17.2},{ticker:"NVDA",name:"NVIDIA",shares:6,price:838.75,value:5032.50,gain:+1032.50,gainPct:+25.8}]},
];
const RETIREMENT_ACCTS = [
  {id:1,name:"401k — Fidelity",employer:"Acme Corp",balance:84320.00,ytdContrib:6200,employerMatch:3100,vestingPct:80,contribRate:8,employerMatchRate:4,ror:9.2,color:"#10b981",allocation:[{name:"US Stocks",pct:60},{name:"Intl Stocks",pct:20},{name:"Bonds",pct:15},{name:"Other",pct:5}]},
  {id:2,name:"Roth IRA — Schwab",employer:null,balance:28450.00,ytdContrib:4000,employerMatch:0,vestingPct:100,contribRate:null,employerMatchRate:0,ror:10.1,color:"#6366f1",allocation:[{name:"US Stocks",pct:70},{name:"Intl Stocks",pct:20},{name:"Bonds",pct:10},{name:"Other",pct:0}]},
];
const SAVINGS_ACCTS = [
  {id:1,name:"Emergency Fund",bank:"Marcus by Goldman",balance:18500,goal:20000,apy:5.10,monthlyContrib:500,color:"#10b981",type:"High-Yield Savings"},
  {id:2,name:"House Down Payment",bank:"Ally Bank",balance:32400,goal:80000,apy:4.85,monthlyContrib:1000,color:"#6366f1",type:"High-Yield Savings"},
  {id:3,name:"Vacation Fund",bank:"Capital One 360",balance:2800,goal:5000,apy:4.30,monthlyContrib:200,color:"#f59e0b",type:"Savings"},
];
const NW_HISTORY = [
  {month:"Mar 23",value:98200},{month:"Apr 23",value:101400},{month:"May 23",value:99800},
  {month:"Jun 23",value:104200},{month:"Jul 23",value:108600},{month:"Aug 23",value:106900},
  {month:"Sep 23",value:111200},{month:"Oct 23",value:115800},{month:"Nov 23",value:119400},
  {month:"Dec 23",value:123200},{month:"Jan 24",value:128600},{month:"Feb 24",value:134200},
  {month:"Mar 24",value:139840},
];

// ── Constants ────────────────────────────────────────────────
const C = ["#6366f1","#22d3ee","#f59e0b","#10b981","#f43f5e","#a78bfa","#fb923c","#34d399"];
const TABS = ["Overview","Monthly Trends","Categories","Transactions","Year Comparison","Spend Analyzer","Investment Strategy","Auto-Invest","Accounts"];
const CATS = ["Food & Dining","Shopping","Transport","Utilities","Healthcare","Entertainment","Subscriptions","Travel","Groceries","Other"];
const CAT_ICONS = ["🍔","🛍️","🚗","💡","🏥","🎬","📱","✈️","🛒","📦"];
const RISK_ICONS = { conservative:"🛡️", moderate:"⚖️", aggressive:"🚀" };
const RISK_CLR   = { conservative:"#10b981", moderate:"#f59e0b", aggressive:"#f43f5e" };
const RISK_LBL   = { conservative:"Conservative", moderate:"Moderate", aggressive:"Aggressive" };
const TAB_CLR    = { "Spend Analyzer":"#a78bfa", "Investment Strategy":"#10b981", "Auto-Invest":"#22d3ee", "Accounts":"#f59e0b" };

const BENCH = {
  "Food & Dining":  { pct:10, tip:"Cook at home 4x/week — saves ~$200/mo" },
  "Shopping":       { pct:5,  tip:"Use a 48-hr rule before non-essential buys" },
  "Transport":      { pct:10, tip:"Carpool or transit 2x/week saves ~$150/mo" },
  "Utilities":      { pct:5,  tip:"Smart thermostat + LEDs cut bills ~15%" },
  "Healthcare":     { pct:5,  tip:"Preventive care now reduces future costs" },
  "Entertainment":  { pct:5,  tip:"Free activities replace 2 paid outings/mo" },
  "Subscriptions":  { pct:2,  tip:"Audit subscriptions quarterly — avg waste $50/mo" },
  "Travel":         { pct:4,  tip:"Book 6+ weeks ahead and use points" },
  "Groceries":      { pct:8,  tip:"Meal planning + store brands save ~$120/mo" },
  "Other":          { pct:3,  tip:"Track misc spending weekly to spot patterns" },
};

const FUNDS = {
  conservative:[
    {name:"Vanguard Short-Term Bond ETF",ticker:"BSV",allocation:35,type:"Bond",risk:"Low",avgReturn:3.2,expense:0.04},
    {name:"iShares TIPS Bond ETF",ticker:"TIP",allocation:20,type:"Bond",risk:"Low",avgReturn:3.8,expense:0.19},
    {name:"Vanguard Total Stock Market ETF",ticker:"VTI",allocation:20,type:"Index",risk:"Low-Med",avgReturn:7.2,expense:0.03},
    {name:"SPDR Bloomberg T-Bill ETF",ticker:"BIL",allocation:25,type:"T-Bill",risk:"Very Low",avgReturn:2.1,expense:0.14},
  ],
  moderate:[
    {name:"Vanguard S&P 500 ETF",ticker:"VOO",allocation:35,type:"Index",risk:"Medium",avgReturn:10.5,expense:0.03},
    {name:"Vanguard Total Intl Stock ETF",ticker:"VXUS",allocation:15,type:"Index",risk:"Medium",avgReturn:6.8,expense:0.07},
    {name:"Vanguard Total Bond Market ETF",ticker:"BND",allocation:30,type:"Bond",risk:"Low",avgReturn:3.5,expense:0.03},
    {name:"Fidelity 500 Index Fund",ticker:"FXAIX",allocation:20,type:"Mutual Fund",risk:"Medium",avgReturn:10.4,expense:0.015},
  ],
  aggressive:[
    {name:"Vanguard S&P 500 ETF",ticker:"VOO",allocation:40,type:"Index",risk:"Medium",avgReturn:10.5,expense:0.03},
    {name:"Invesco QQQ ETF",ticker:"QQQ",allocation:20,type:"Index",risk:"High",avgReturn:14.2,expense:0.20},
    {name:"Vanguard Total Intl Stock ETF",ticker:"VXUS",allocation:20,type:"Index",risk:"Med-High",avgReturn:6.8,expense:0.07},
    {name:"Vanguard Small-Cap ETF",ticker:"VB",allocation:15,type:"Index",risk:"High",avgReturn:11.3,expense:0.05},
    {name:"Vanguard Total Bond Market ETF",ticker:"BND",allocation:5,type:"Bond",risk:"Low",avgReturn:3.5,expense:0.03},
  ],
};

const RQ = [
  {id:"age",q:"Age range?",opts:[{l:"Under 30",s:4},{l:"30–44",s:3},{l:"45–59",s:2},{l:"60+",s:1}]},
  {id:"horizon",q:"Time horizon?",opts:[{l:"20+ years",s:4},{l:"10–20 yrs",s:3},{l:"5–10 yrs",s:2},{l:"< 5 yrs",s:1}]},
  {id:"stability",q:"Income stability?",opts:[{l:"Very stable",s:4},{l:"Stable",s:3},{l:"Somewhat",s:2},{l:"Variable",s:1}]},
  {id:"emergency",q:"Emergency fund?",opts:[{l:"6+ months",s:4},{l:"3–6 months",s:3},{l:"< 3 months",s:2},{l:"None",s:1}]},
  {id:"loss",q:"Portfolio drops 25%?",opts:[{l:"Buy more!",s:4},{l:"Hold",s:3},{l:"Sell some",s:2},{l:"Sell all",s:1}]},
];

const MOCK_ORDERS = [
  {id:"o1",ticker:"VOO",notional:175,status:"filled",filled_avg_px:482.31,filled_qty:0.363,scheduled_date:"2025-01-01"},
  {id:"o2",ticker:"BND",notional:150,status:"filled",filled_avg_px:72.14,filled_qty:2.079,scheduled_date:"2025-01-01"},
  {id:"o3",ticker:"VOO",notional:175,status:"submitted",scheduled_date:"2025-03-01"},
  {id:"o4",ticker:"BND",notional:150,status:"submitted",scheduled_date:"2025-03-01"},
  {id:"o5",ticker:"VXUS",notional:75,status:"queued",scheduled_date:"2025-03-01"},
];
const MOCK_PORT = [
  {ticker:"VOO",qty:1.079,marketValue:528.14,costBasis:499.20,unrealizedPL:28.94,unrealizedPLPct:5.80,currentPrice:489.47},
  {ticker:"BND",qty:6.245,marketValue:451.10,costBasis:432.30,unrealizedPL:18.80,unrealizedPLPct:4.35,currentPrice:72.23},
  {ticker:"VXUS",qty:3.807,marketValue:228.10,costBasis:219.00,unrealizedPL:9.10,unrealizedPLPct:4.15,currentPrice:59.92},
  {ticker:"FXAIX",qty:1.474,marketValue:302.20,costBasis:291.40,unrealizedPL:10.80,unrealizedPLPct:3.71,currentPrice:205.02},
];
const SMETA = {
  filled:   {color:"#10b981",label:"Filled",icon:"✅"},
  submitted:{color:"#22d3ee",label:"Submitted",icon:"⏳"},
  queued:   {color:"#f59e0b",label:"Queued",icon:"🕐"},
  canceled: {color:"#64748b",label:"Canceled",icon:"✕"},
  failed:   {color:"#f43f5e",label:"Failed",icon:"❌"},
};

// ── Helpers ──────────────────────────────────────────────────
const fmt  = n => `$${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtK = n => n>=1e6 ? `$${(n/1e6).toFixed(2)}M` : n>=1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);
const fv   = (monthly, rate, years, lump=0) => {
  const r = rate/100/12, m = years*12;
  return lump*Math.pow(1+r,m) + (r>0 ? monthly*(Math.pow(1+r,m)-1)/r : monthly*m);
};

function getRisk(score) {
  return score<=8?"conservative":score<=14?"moderate":"aggressive";
}

function genTxns() {
  const merch = {
    "Food & Dining":["Chipotle","Starbucks","McDonald's","Uber Eats","DoorDash","Panera"],
    "Shopping":["Amazon","Target","Walmart","Best Buy","Nike","Costco"],
    "Transport":["Shell Gas","Uber","Lyft","BP Gas","EZPass"],
    "Utilities":["Con Edison","AT&T","Verizon","National Grid"],
    "Healthcare":["CVS","Walgreens","Dr. Smith","LabCorp"],
    "Entertainment":["AMC","Regal","Dave & Busters","Ticketmaster"],
    "Subscriptions":["Netflix","Spotify","Hulu","Disney+","Gym"],
    "Travel":["Delta","Marriott","Airbnb","Expedia"],
    "Groceries":["Whole Foods","Trader Joe's","Kroger","Safeway"],
    "Other":["ATM","Venmo","Misc"],
  };
  const avg  = {"Food & Dining":28,"Shopping":90,"Transport":38,"Utilities":125,"Healthcare":65,"Entertainment":55,"Subscriptions":18,"Travel":420,"Groceries":90,"Other":55};
  const freq = {"Food & Dining":9,"Shopping":5,"Transport":10,"Utilities":2,"Healthcare":1,"Entertainment":3,"Subscriptions":4,"Travel":0.5,"Groceries":4,"Other":3};
  const txns = [];
  const now  = new Date();
  for (let m=35;m>=0;m--) {
    const d  = new Date(now.getFullYear(), now.getMonth()-m, 1);
    const yr = d.getFullYear(), mo = d.getMonth();
    CATS.forEach(cat => {
      const cnt = Math.round(freq[cat]*(0.7+Math.random()*0.6));
      for (let i=0;i<cnt;i++) {
        txns.push({
          date: new Date(yr,mo,Math.floor(Math.random()*28)+1),
          year:yr, month:mo,
          monthLabel: d.toLocaleString("default",{month:"short"}),
          yearMonth: `${yr}-${String(mo+1).padStart(2,"0")}`,
          category: cat,
          amount: +(avg[cat]*(0.5+Math.random()*1.3)).toFixed(2),
          merchant: merch[cat][Math.floor(Math.random()*merch[cat].length)],
          id: `${yr}${mo}${i}${cat}`,
        });
      }
    });
  }
  return txns.sort((a,b)=>b.date-a.date);
}

function buildSchedule(plans, funds, lump, horizYears) {
  const nr = funds.reduce((s,f)=>s+(f.avgReturn-f.expense)*f.allocation/100,0)/100/12;
  const sorted = [...plans].sort((a,b)=>a.startMonth-b.startMonth);
  const rows=[]; let pv=lump, tc=lump;
  for (let m=1;m<=horizYears*12;m++) {
    let c=0;
    for (let i=sorted.length-1;i>=0;i--) { if(m>=sorted[i].startMonth){c=sorted[i].amount;break;} }
    pv=pv*(1+nr)+c; tc+=c;
    const yr=Math.ceil(m/12), mo=(m-1)%12;
    const ml=new Date(2024,mo,1).toLocaleString("default",{month:"short"});
    rows.push({month:m,label:m%12===0||m===1?`${ml} Y${yr}`:"",portfolioValue:Math.round(pv),contributed:Math.round(tc),gains:Math.round(Math.max(pv-tc,0)),contribution:c,year:yr});
  }
  return rows;
}

function buildScenario(monthly, rate, lump, years) {
  const r=rate/100/12; let val=lump; const data=[];
  for (let m=1;m<=years*12;m++) { val=val*(1+r)+monthly; if(m%12===0) data.push({year:`Yr ${m/12}`,value:Math.round(val)}); }
  return data;
}

const ALL_TXN = genTxns();

async function fetchPlaidTransactions() {
  try {
    const res = await fetch("http://localhost:4000/api/plaid/transactions");
    const data = await res.json();
    return data.filter(t=>t.amount>0&&!["TRANSFER_OUT","TRANSFER_IN","INCOME"].includes(t.personal_finance_category?.primary)).map(t=>({
      date: new Date(t.date),
      year: new Date(t.date).getFullYear(),
      month: new Date(t.date).getMonth(),
      monthLabel: new Date(t.date).toLocaleString("default",{month:"short"}),
      yearMonth: t.date.slice(0,7),
      category: mapPlaidCategory(t.personal_finance_category?.primary),
      amount: t.amount,
      merchant: t.merchant_name||t.name,
      id: t.transaction_id,
    }));
  } catch(e) {
    console.log("Using mock data");
    return null;
  }
}

function mapPlaidCategory(primary) {
  const map = {
    "FOOD_AND_DRINK":"Food & Dining",
    "GENERAL_MERCHANDISE":"Shopping",
    "TRANSPORTATION":"Transport",
    "RENT_AND_UTILITIES":"Utilities",
    "MEDICAL":"Healthcare",
    "ENTERTAINMENT":"Entertainment",
    "PERSONAL_CARE":"Subscriptions",
    "TRAVEL":"Travel",
    "GENERAL_SERVICES":"Other",
  };
  return map[primary]||"Other";
}
const YEARS   = [...new Set(ALL_TXN.map(t=>t.year))].sort();

function makeS(inp) {
  return {
    page: {fontFamily:"'Inter',sans-serif",background:"#0f172a",minHeight:"100vh",color:"#e2e8f0"},
    hdr:  {background:"linear-gradient(135deg,#1e1b4b,#0f172a)",borderBottom:"1px solid #1e293b",padding:"16px 24px",display:"flex",alignItems:"center",gap:12},
    logo: {width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#22d3ee)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18},
    card: {background:"#1e293b",borderRadius:14,padding:20,border:"1px solid #334155"},
    inp:  inp,
    btn:  (a,col="#6366f1")=>({padding:"8px 14px",borderRadius:8,border:`2px solid ${a?col:"#334155"}`,background:a?col+"22":"#0f172a",color:a?col:"#64748b",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all 0.15s"}),
    pill: (col)=>({padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:col+"22",color:col}),
    tt:   {background:"#0f172a",border:"1px solid #334155",borderRadius:8},
  };
}

function StatCard({icon,label,value,color,S}) {
  return (
    <div style={S.card}>
      <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{label}</div>
      <div style={{fontSize:19,fontWeight:800,color}}>{value}</div>
    </div>
  );
}

function SpendAnalyzer({S}) {
  const [income,   setIncome]   = useState(5000);
  const [horizon,  setHorizon]  = useState(10);
  const [rate,     setRate]     = useState(7.5);
  const [selCat,   setSelCat]   = useState(null);
  const [cutPct,   setCutPct]   = useState(25);

  const avgByCat = useMemo(()=>{
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth()-12);
    const recent = ALL_TXN.filter(t=>t.date>=cutoff);
    const map = {};
    CATS.forEach(c=>{ map[c]=+(recent.filter(t=>t.category===c).reduce((s,t)=>s+t.amount,0)/12).toFixed(2); });
    return map;
  },[]);

  const scores = useMemo(()=>{
    const out={};
    CATS.forEach(cat=>{
      const spent=avgByCat[cat], limit=income*(BENCH[cat].pct/100), ratio=spent/limit;
      if(ratio<=0.8)      out[cat]={score:0,label:"Great",     color:"#10b981",ratio};
      else if(ratio<=1.0) out[cat]={score:1,label:"On Track",  color:"#22d3ee",ratio};
      else if(ratio<=1.3) out[cat]={score:2,label:"Watch Out", color:"#f59e0b",ratio};
      else                out[cat]={score:3,label:"Overspending",color:"#f43f5e",ratio};
    });
    return out;
  },[avgByCat,income]);

  const overCats = CATS.filter(c=>scores[c].score>=2).sort((a,b)=>scores[b].score-scores[a].score);
  const totalOver = overCats.reduce((s,c)=>s+Math.max(avgByCat[c]-income*(BENCH[c].pct/100),0),0);

  const radarData = CATS.map(c=>({
    cat: c.split(" ")[0],
    actual: Math.min(Math.round((avgByCat[c]/income)*100),25),
    benchmark: BENCH[c].pct,
  }));

  const selSpend   = selCat ? avgByCat[selCat] : 0;
  const selLimit   = selCat ? income*(BENCH[selCat].pct/100) : 0;
  const selOver    = Math.max(selSpend-selLimit,0);
  const cutAmt     = +(selSpend*(cutPct/100)).toFixed(2);

  const scenCards = selCat ? [
    {label:`${horizon}yr Conservative (4.5%)`, value:fv(cutAmt,4.5,horizon), color:"#10b981", icon:"🛡️"},
    {label:`${horizon}yr Moderate (${rate}%)`,  value:fv(cutAmt,rate,horizon), color:"#6366f1", icon:"⚖️"},
    {label:`${horizon}yr Aggressive (11%)`,     value:fv(cutAmt,11,horizon),  color:"#f43f5e", icon:"🚀"},
    {label:`${horizon}yr Cash Saved`,           value:cutAmt*12*horizon,      color:"#22d3ee", icon:"💵"},
  ] : [];

  const growthData = useMemo(()=>{
    if(!selCat) return [];
    const r=rate/100/12; let inv=0;
    return Array.from({length:horizon*12},(_,i)=>{
      inv=inv*(1+r)+cutAmt;
      return {month:i+1,invested:Math.round(inv),saved:Math.round(cutAmt*(i+1))};
    }).filter((_,i)=>i%12===11);
  },[selCat,cutAmt,horizon,rate]);

  const costData = selCat ? [1,3,5,10].map(yr=>({
    years:`${yr}yr`,
    overspent: Math.round(selOver*12*yr),
    ifInvested: Math.round(fv(selOver,rate,yr)),
  })) : [];

  const topWaste = useMemo(()=>{
    if(!selCat) return [];
    const cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-12);
    const map={};
    ALL_TXN.filter(t=>t.date>=cutoff&&t.category===selCat).forEach(t=>{
      if(!map[t.merchant]) map[t.merchant]={merchant:t.merchant,total:0,count:0};
      map[t.merchant].total=+(map[t.merchant].total+t.amount).toFixed(2);
      map[t.merchant].count++;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,5);
  },[selCat]);

  return (
    <div>
      <div style={{...S.card,marginBottom:16,background:"linear-gradient(135deg,#1a0a2e,#0f172a)",border:"1px solid #a78bfa44"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:"#a78bfa",marginBottom:4}}>🔍 Spend Analyzer</div>
            <div style={{fontSize:13,color:"#64748b"}}>Identifies overspending and shows what you could've saved or earned investing the difference.</div>
          </div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {[["Monthly Income","$",income,setIncome,100],["Invest Rate %","",rate,setRate,70],["Horizon (yrs)","",horizon,setHorizon,60]].map(([lbl,pre,val,set,w])=>(
              <div key={lbl}>
                <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>{lbl}</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  {pre && <span style={{color:"#64748b"}}>{pre}</span>}
                  <input type="number" value={val} onChange={e=>set(Number(e.target.value))} style={{...S.inp,width:w,padding:"6px 10px"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overCats.length>0 && (
        <div style={{...S.card,marginBottom:16,border:"1px solid #f43f5e44",background:"#f43f5e08"}}>
          <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:28}}>⚠️</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"#f43f5e",marginBottom:2}}>Overspending in {overCats.length} categor{overCats.length===1?"y":"ies"}</div>
              <div style={{fontSize:13,color:"#94a3b8"}}>
                You're <span style={{color:"#f43f5e",fontWeight:700}}>{fmt(totalOver)}/mo</span> over budget.
                Invested over {horizon}yr at {rate}%: <span style={{color:"#10b981",fontWeight:700}}>{fmtK(fv(totalOver,rate,horizon))}</span>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"#64748b"}}>{horizon}yr potential</div>
              <div style={{fontSize:22,fontWeight:800,color:"#10b981"}}>{fmtK(fv(totalOver,rate,horizon))}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={S.card}>
          <div style={{fontWeight:600,color:"#fff",marginBottom:4}}>Spending vs Benchmarks</div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>% of monthly income</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155"/>
              <PolarAngleAxis dataKey="cat" tick={{fill:"#94a3b8",fontSize:10}}/>
              <Radar name="Your Spending" dataKey="actual"    stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25}/>
              <Radar name="Benchmark"     dataKey="benchmark" stroke="#10b981" fill="#10b981" fillOpacity={0.15}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Tooltip formatter={v=>`${v}% of income`} contentStyle={S.tt}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={{fontWeight:600,color:"#fff",marginBottom:12}}>Category Health</div>
          <div style={{display:"grid",gap:8,maxHeight:260,overflowY:"auto"}}>
            {CATS.map((cat,i)=>{
              const sc=scores[cat], spent=avgByCat[cat], limit=income*(BENCH[cat].pct/100), over=Math.max(spent-limit,0);
              const active = selCat===cat;
              return (
                <button key={cat} onClick={()=>setSelCat(active?null:cat)}
                  style={{background:active?sc.color+"22":"#0f172a",border:`1px solid ${active?sc.color:sc.color+"44"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>{CAT_ICONS[i]}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{cat}</div>
                        <div style={{fontSize:10,color:"#64748b"}}>{fmt(spent)}/mo · limit {fmt(limit)}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:12,background:sc.color+"22",color:sc.color}}>{sc.label}</div>
                      {over>0 && <div style={{fontSize:10,color:"#f43f5e",marginTop:2}}>+{fmt(over)}/mo over</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selCat && (
        <div>
          <div style={{...S.card,marginBottom:16,border:`1px solid ${scores[selCat].color}44`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:28}}>{CAT_ICONS[CATS.indexOf(selCat)]}</span>
                <div>
                  <div style={{fontWeight:800,fontSize:16,color:"#fff"}}>{selCat}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{BENCH[selCat].tip}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#64748b"}}>You Spend</div><div style={{fontWeight:800,color:"#f43f5e",fontSize:18}}>{fmt(selSpend)}/mo</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#64748b"}}>Recommended</div><div style={{fontWeight:800,color:"#10b981",fontSize:18}}>{fmt(selLimit)}/mo</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#64748b"}}>Over Budget</div><div style={{fontWeight:800,color:"#f59e0b",fontSize:18}}>{fmt(selOver)}</div></div>
              </div>
            </div>
            <div style={{background:"#0f172a",borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,color:"#94a3b8",fontWeight:600}}>If I cut {selCat} spending by…</span>
                <span style={{fontWeight:800,color:"#a78bfa",fontSize:18}}>{cutPct}% → save {fmt(cutAmt)}/mo</span>
              </div>
              <input type="range" min={5} max={100} step={5} value={cutPct} onChange={e=>setCutPct(Number(e.target.value))} style={{width:"100%",accentColor:"#a78bfa"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",marginTop:4}}><span>5%</span><span>100%</span></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:16}}>
              {scenCards.map(sc=>(
                <div key={sc.label} style={{...S.card,padding:14,background:"#0f172a"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{sc.icon}</div>
                  <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>{sc.label}</div>
                  <div style={{fontSize:18,fontWeight:800,color:sc.color}}>{fmtK(sc.value)}</div>
                  <div style={{fontSize:10,color:"#475569",marginTop:2}}>from {fmt(cutAmt)}/mo</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:600,color:"#fff",marginBottom:10}}>📈 Redirecting {fmt(cutAmt)}/mo to investments</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="sag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                    <linearGradient id="scg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="month" tickFormatter={v=>`Yr ${v/12}`} tick={{fill:"#64748b",fontSize:9}}/>
                  <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
                  <Tooltip formatter={v=>fmt(v)} labelFormatter={l=>`Year ${l/12}`} contentStyle={S.tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="invested" name="Invested"   stroke="#6366f1" fill="url(#sag)" strokeWidth={2.5}/>
                  <Area type="monotone" dataKey="saved"    name="Cash Saved" stroke="#22d3ee" fill="url(#scg)" strokeWidth={2} strokeDasharray="4 2"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:600,color:"#fff",marginBottom:10}}>💸 True cost of overspending vs investing</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={costData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="years" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="overspent"  name="Total Overspent"     fill="#f43f5e" radius={[4,4,0,0]}/>
                  <Bar dataKey="ifInvested" name="If Invested Instead"  fill="#10b981" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {topWaste.length>0 && (
              <div>
                <div style={{fontWeight:600,color:"#fff",marginBottom:10}}>🏪 Top {selCat} merchants</div>
                {topWaste.map((m,i)=>(
                  <div key={m.merchant} style={{display:"flex",alignItems:"center",gap:10,background:"#0f172a",padding:"10px 14px",borderRadius:8,marginBottom:8}}>
                    <div style={{width:26,height:26,borderRadius:6,background:C[i%C.length]+"33",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,color:C[i%C.length],flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{m.merchant}</span><span style={{fontWeight:700,color:"#fff"}}>{fmt(m.total)}/yr</span></div>
                      <div style={{height:4,background:"#1e293b",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(m.total/topWaste[0].total*100).toFixed(0)}%`,background:C[i%C.length],borderRadius:2}}/></div>
                    </div>
                    <span style={{fontSize:11,color:"#64748b",minWidth:50,textAlign:"right"}}>{m.count} visits</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {overCats.length>0 && (
            <div style={{...S.card,marginBottom:16,border:"1px solid #10b98144"}}>
              <div style={{fontWeight:700,color:"#10b981",marginBottom:14,fontSize:15}}>✅ What If You Hit Every Budget Target?</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:14}}>
                {overCats.map((cat)=>{
                  const over = Math.max(avgByCat[cat]-income*(BENCH[cat].pct/100),0);
                  return (
                    <div key={cat} style={{background:"#0f172a",borderRadius:10,padding:14,border:"1px solid #10b98122"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span>{CAT_ICONS[CATS.indexOf(cat)]}</span>
                        <span style={{fontWeight:700,color:"#e2e8f0",fontSize:12}}>{cat}</span>
                      </div>
                      <div style={{fontSize:11,color:"#64748b"}}>Free up <span style={{color:"#22d3ee",fontWeight:700}}>{fmt(over)}/mo</span></div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>= <span style={{color:"#10b981",fontWeight:700}}>{fmtK(fv(over,rate,horizon))}</span> in {horizon}yr</div>
                    </div>
                  );
                })}
              </div>
              <div style={{background:"#0f172a",borderRadius:10,padding:16,border:"1px solid #10b98133"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                  <div>
                    <div style={{fontSize:13,color:"#94a3b8"}}>Total monthly savings if all budgets met</div>
                    <div style={{fontWeight:800,fontSize:22,color:"#10b981"}}>{fmt(totalOver)}/mo</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,color:"#94a3b8"}}>Invested {horizon}yr at {rate}%</div>
                    <div style={{fontWeight:800,fontSize:28,color:"#10b981"}}>{fmtK(fv(totalOver,rate,horizon))}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {!selCat && overCats.length>0 && (
        <div style={{...S.card,textAlign:"center",padding:32,border:"1px dashed #334155"}}>
          <div style={{fontSize:32,marginBottom:8}}>👆</div>
          <div style={{color:"#64748b",fontSize:13}}>Click any category above to see detailed analysis and investment projections.</div>
        </div>
      )}
      {!selCat && overCats.length===0 && (
        <div style={{...S.card,textAlign:"center",padding:40,border:"1px solid #10b98133"}}>
          <div style={{fontSize:40,marginBottom:12}}>🎉</div>
          <div style={{fontWeight:700,color:"#10b981",fontSize:18,marginBottom:8}}>You're within budget on all categories!</div>
          <div style={{color:"#64748b",fontSize:13}}>Consider increasing your investment contributions.</div>
        </div>
      )}
    </div>
  );
}

function InvestStrategy({riskAnswers,setRiskAnswers,profileComplete,riskProfile,netReturn,monthlyInvest,setMonthlyInvest,lumpSum,setLumpSum,horizonYears,setHorizonYears,S}) {
  const r=netReturn/100/12, months=horizonYears*12;
  const finalVal = lumpSum*Math.pow(1+r,months)+(r>0?monthlyInvest*(Math.pow(1+r,months)-1)/r:monthlyInvest*months);
  const totalContrib = lumpSum+monthlyInvest*months;
  const pd = Array.from({length:horizonYears+1},(_,y)=>{
    const m=y*12, v=lumpSum*Math.pow(1+r,m)+(r>0&&m>0?monthlyInvest*(Math.pow(1+r,m)-1)/r:monthlyInvest*m);
    return {year:`Yr ${y}`, value:Math.round(y===0?lumpSum:v), contributed:Math.round(lumpSum+monthlyInvest*m)};
  });
  const riskColor = RISK_CLR[riskProfile];
  const riskIcon  = RISK_ICONS[riskProfile];
  const riskLabel = RISK_LBL[riskProfile];
  return (
    <div>
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,color:"#fff",marginBottom:12}}>🎯 Risk Profile</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14}}>
          {RQ.map(q=>(
            <div key={q.id}>
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:6,fontWeight:600}}>{q.q}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {q.opts.map(o=>(
                  <button key={o.l} onClick={()=>setRiskAnswers(p=>({...p,[q.id]:o.s}))} style={S.btn(riskAnswers[q.id]===o.s)}>{o.l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {profileComplete && (
          <div style={{marginTop:14,display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"#0f172a",borderRadius:10,border:`1px solid ${riskColor}`}}>
            <span style={{fontSize:24}}>{riskIcon}</span>
            <div><div style={{fontSize:11,color:"#64748b"}}>Risk Profile</div><div style={{fontWeight:800,fontSize:16,color:riskColor}}>{riskLabel}</div></div>
            <div style={{marginLeft:"auto",textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Net Return</div><div style={{fontWeight:700,color:"#10b981"}}>{netReturn.toFixed(2)}%</div></div>
          </div>
        )}
      </div>
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,color:"#fff",marginBottom:14}}>⚙️ Variables</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:18}}>
          {[
            {label:"Monthly",value:monthlyInvest,min:50,max:5000,step:50,set:setMonthlyInvest,disp:`$${monthlyInvest.toLocaleString()}`,color:"#6366f1"},
            {label:"Lump Sum",value:lumpSum,min:0,max:100000,step:1000,set:setLumpSum,disp:`$${lumpSum.toLocaleString()}`,color:"#22d3ee"},
            {label:"Horizon",value:horizonYears,min:1,max:40,step:1,set:setHorizonYears,disp:`${horizonYears}yr`,color:"#f59e0b"},
          ].map(sl=>(
            <div key={sl.label}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:12,color:"#94a3b8"}}>{sl.label}</span>
                <span style={{fontWeight:700,color:sl.color}}>{sl.disp}</span>
              </div>
              <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.value} onChange={e=>sl.set(Number(e.target.value))} style={{width:"100%",accentColor:sl.color}}/>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
        {[
          {label:"Final Value",  value:fmt(finalVal),              color:"#10b981",icon:"🏆"},
          {label:"Contributed",  value:fmt(totalContrib),          color:"#6366f1",icon:"💰"},
          {label:"Total Gains",  value:fmt(finalVal-totalContrib), color:"#22d3ee",icon:"📈"},
          {label:"Multiplier",   value:`${totalContrib>0?(finalVal/totalContrib).toFixed(2):0}x`,color:"#f59e0b",icon:"🚀"},
        ].map(sc=>(
          <div key={sc.label} style={S.card}>
            <div style={{fontSize:18}}>{sc.icon}</div>
            <div style={{fontSize:10,color:"#64748b",margin:"4px 0"}}>{sc.label}</div>
            <div style={{fontSize:16,fontWeight:800,color:sc.color}}>{sc.value}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Portfolio Growth</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={pd}>
            <defs>
              <linearGradient id="igv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              <linearGradient id="igc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis dataKey="year" tick={{fill:"#64748b",fontSize:9}}/>
            <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Area type="monotone" dataKey="value"       name="Portfolio Value" stroke="#10b981" fill="url(#igv)" strokeWidth={2}/>
            <Area type="monotone" dataKey="contributed" name="Contributed"     stroke="#6366f1" fill="url(#igc)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AutoInvest({activeFunds, S}) {
  const [view,setView]       = useState("scheduler");
  const [plans,setPlans]     = useState([{id:1,startMonth:1,amount:500,label:"Initial"},{id:2,startMonth:13,amount:750,label:"Year 2"},{id:3,startMonth:37,amount:1000,label:"Year 4"}]);
  const [editId,setEditId]   = useState(null);
  const [newPlan,setNewPlan] = useState({startMonth:25,amount:600,label:"New Phase"});
  const [showAdd,setShowAdd] = useState(false);
  const [autoDay,setAutoDay] = useState(1);
  const [showScen,setShowScen]=useState(false);
  const [horiz,setHoriz]     = useState(20);
  const [lump,setLump]       = useState(0);
  const [scens,setScens]     = useState([{id:1,label:"Conservative",monthly:300,rate:4.5,color:"#10b981"},{id:2,label:"Moderate",monthly:600,rate:7.5,color:"#6366f1"},{id:3,label:"Aggressive",monthly:1000,rate:11,color:"#f43f5e"}]);
  const [orders,setOrders]   = useState(MOCK_ORDERS);
  const [oFilter,setOFilter] = useState("all");
  const [syncing,setSyncing] = useState(false);
  const [exec,setExec]       = useState(false);
  const [execAmt,setExecAmt] = useState(500);
  const [lastSync,setLastSync]=useState(null);

  const schedData = useMemo(()=>buildSchedule(plans,activeFunds,lump,horiz),[plans,activeFunds,lump,horiz]);
  const yearly    = useMemo(()=>{
    const map={};
    schedData.forEach(r=>{
      if(!map[r.year]) map[r.year]={year:`Year ${r.year}`,portfolioValue:0,contributed:0,gains:0,totalContribution:0};
      Object.assign(map[r.year],{portfolioValue:r.portfolioValue,contributed:r.contributed,gains:r.gains});
      map[r.year].totalContribution+=r.contribution;
    });
    return Object.values(map);
  },[schedData]);
  const timeline  = useMemo(()=>{
    const sorted=[...plans].sort((a,b)=>a.startMonth-b.startMonth);
    return Array.from({length:horiz*12},(_,i)=>{
      const m=i+1; let amt=0;
      for(let j=sorted.length-1;j>=0;j--){if(m>=sorted[j].startMonth){amt=sorted[j].amount;break;}}
      return {month:m,label:m%12===0?`M${m}`:"",amount:amt};
    });
  },[plans,horiz]);
  const scenData  = useMemo(()=>{
    const all=scens.map(s=>buildScenario(s.monthly,s.rate,lump,horiz));
    return all[0].map((_,i)=>({year:all[0][i].year,...Object.fromEntries(scens.map((s,si)=>[s.label,all[si][i].value]))}));
  },[scens,horiz,lump]);
  const filtOrders= useMemo(()=>oFilter==="all"?orders:orders.filter(o=>o.status===oFilter),[orders,oFilter]);
  const port      = MOCK_PORT;
  const portTotal = port.reduce((s,p)=>s+p.marketValue,0);
  const portCost  = port.reduce((s,p)=>s+p.costBasis,0);
  const finalSched= schedData[schedData.length-1];
  const sortedPlans=[...plans].sort((a,b)=>a.startMonth-b.startMonth);
  const openOrders= orders.filter(o=>["queued","submitted"].includes(o.status)).length;

  const addPlan = ()=>{setPlans(p=>[...p,{...newPlan,id:Date.now()}].sort((a,b)=>a.startMonth-b.startMonth));setShowAdd(false);setNewPlan({startMonth:25,amount:600,label:"New Phase"});};
  const delPlan = id=>setPlans(p=>p.filter(x=>x.id!==id));
  const updPlan = (id,f,v)=>setPlans(p=>p.map(x=>x.id===id?{...x,[f]:["amount","startMonth"].includes(f)?Number(v):v}:x));
  const doSync  = ()=>{setSyncing(true);setTimeout(()=>{setOrders(o=>o.map(x=>x.status==="submitted"?{...x,status:"filled",filled_avg_px:+(460+Math.random()*80).toFixed(2),filled_qty:+(x.notional/(460+Math.random()*80)).toFixed(4),filled_at:new Date().toISOString()}:x.status==="queued"?{...x,status:"submitted"}:x));setSyncing(false);setLastSync(new Date());},1500);};
  const doExec  = ()=>{setExec(true);setTimeout(()=>{const d=new Date().toISOString().split("T")[0];setOrders(o=>[...activeFunds.map((f,i)=>({id:`alp_${Date.now()}_${i}`,ticker:f.ticker,notional:+(execAmt*f.allocation/100).toFixed(2),status:"submitted",scheduled_date:d})),...o]);setExec(false);},2000);};
  const cancelOrd=id=>setOrders(o=>o.map(x=>x.id===id?{...x,status:"canceled"}:x));

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        {[["scheduler","📅 Scheduler"],["orders","📋 Orders"],["portfolio","💼 Portfolio"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"8px 18px",borderRadius:8,border:`1px solid ${view===v?"#22d3ee44":"#334155"}`,background:view===v?"#22d3ee22":"#0f172a",color:view===v?"#22d3ee":"#64748b",cursor:"pointer",fontSize:12,fontWeight:700}}>
            {l}{v==="orders"&&openOrders>0&&<span style={{marginLeft:6,background:"#f43f5e",borderRadius:10,padding:"1px 6px",fontSize:10,color:"#fff"}}>{openOrders}</span>}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={S.pill("#f59e0b")}>📄 Paper Trading</span>
          {lastSync && <span style={{fontSize:11,color:"#475569"}}>Synced {lastSync.toLocaleTimeString()}</span>}
        </div>
      </div>

      {view==="scheduler" && (
        <div>
          <div style={{...S.card,marginBottom:16,background:"linear-gradient(135deg,#0f2744,#0f172a)",border:"1px solid #22d3ee44"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
              <div><div style={{fontWeight:800,fontSize:18,color:"#22d3ee",marginBottom:4}}>🤖 Auto-Invest Scheduler</div><div style={{fontSize:13,color:"#64748b"}}>Phased plans — Alpaca executes orders automatically.</div></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setShowScen(!showScen)} style={S.btn(showScen,"#f59e0b")}>⚡ Scenarios</button>
                <button onClick={()=>setShowAdd(!showAdd)}   style={S.btn(showAdd,"#22d3ee")}>＋ Add Phase</button>
              </div>
            </div>
          </div>
          <div style={{...S.card,marginBottom:16}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:14}}>⚙️ Settings</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
              {[
                {label:"Horizon",value:horiz,min:1,max:40,step:1,set:setHoriz,disp:`${horiz} yrs`,color:"#f59e0b"},
                {label:"Lump Sum",value:lump,min:0,max:100000,step:1000,set:setLump,disp:`$${lump.toLocaleString()}`,color:"#22d3ee"},
                {label:"Auto-Invest Day",value:autoDay,min:1,max:28,step:1,set:setAutoDay,disp:`Day ${autoDay}`,color:"#6366f1"},
              ].map(sl=>(
                <div key={sl.label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:"#94a3b8"}}>{sl.label}</span><span style={{fontWeight:700,color:sl.color}}>{sl.disp}</span></div>
                  <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.value} onChange={e=>sl.set(Number(e.target.value))} style={{width:"100%",accentColor:sl.color}}/>
                </div>
              ))}
            </div>
          </div>
          {showAdd && (
            <div style={{...S.card,marginBottom:16,border:"1px solid #22d3ee44"}}>
              <div style={{fontWeight:600,color:"#22d3ee",marginBottom:12}}>＋ New Phase</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:12,alignItems:"end"}}>
                <div><label style={{fontSize:11,color:"#94a3b8",display:"block",marginBottom:4}}>Label</label><input value={newPlan.label} onChange={e=>setNewPlan(p=>({...p,label:e.target.value}))} style={{...S.inp,width:"100%",boxSizing:"border-box"}}/></div>
                <div><label style={{fontSize:11,color:"#94a3b8",display:"block",marginBottom:4}}>Start Month</label><input type="number" min={1} value={newPlan.startMonth} onChange={e=>setNewPlan(p=>({...p,startMonth:Number(e.target.value)}))} style={{...S.inp,width:"100%",boxSizing:"border-box"}}/></div>
                <div><label style={{fontSize:11,color:"#94a3b8",display:"block",marginBottom:4}}>$/Month</label><input type="number" min={0} value={newPlan.amount} onChange={e=>setNewPlan(p=>({...p,amount:Number(e.target.value)}))} style={{...S.inp,width:"100%",boxSizing:"border-box"}}/></div>
                <button onClick={addPlan} style={{padding:"9px 18px",background:"#22d3ee",border:"none",borderRadius:8,color:"#0f172a",fontWeight:700,cursor:"pointer"}}>Add</button>
              </div>
            </div>
          )}
          <div style={{...S.card,marginBottom:16}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:14}}>📋 Investment Phases</div>
            {sortedPlans.map((plan,i)=>(
              <div key={plan.id} style={{background:"#0f172a",borderRadius:10,padding:14,border:`1px solid ${C[i%C.length]}33`,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
                <div style={{width:34,height:34,borderRadius:8,background:C[i%C.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,color:C[i%C.length],flexShrink:0}}>P{i+1}</div>
                {editId===plan.id ? (
                  <>
                    <input value={plan.label} onChange={e=>updPlan(plan.id,"label",e.target.value)} style={{...S.inp,flex:1,minWidth:90}}/>
                    <input type="number" value={plan.startMonth} onChange={e=>updPlan(plan.id,"startMonth",e.target.value)} style={{...S.inp,width:70}}/>
                    <input type="number" value={plan.amount}     onChange={e=>updPlan(plan.id,"amount",e.target.value)}     style={{...S.inp,width:85}}/>
                    <button onClick={()=>setEditId(null)} style={{padding:"6px 12px",background:"#10b981",border:"none",borderRadius:6,color:"#fff",fontWeight:600,cursor:"pointer",fontSize:12}}>Save</button>
                  </>
                ) : (
                  <>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:"#e2e8f0",fontSize:13}}>{plan.label}</div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Month {plan.startMonth} → {i<sortedPlans.length-1?`Month ${sortedPlans[i+1].startMonth-1}`:"end"}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:800,fontSize:17,color:C[i%C.length]}}>{fmt(plan.amount)}<span style={{fontSize:11,color:"#64748b"}}>/mo</span></div>
                      <div style={{fontSize:11,color:"#64748b"}}>{fmt(plan.amount*12)}/yr</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setEditId(plan.id)} style={{padding:"6px 10px",background:"#1e293b",border:"1px solid #334155",borderRadius:6,color:"#94a3b8",cursor:"pointer",fontSize:12}}>✏️</button>
                      {plans.length>1&&<button onClick={()=>delPlan(plan.id)} style={{padding:"6px 10px",background:"#1e293b",border:"1px solid #334155",borderRadius:6,color:"#f43f5e",cursor:"pointer",fontSize:12}}>✕</button>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div style={{...S.card,marginBottom:16}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:12}}>📅 Contribution Timeline</div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={timeline}>
                <defs><linearGradient id="ctg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="label" tick={{fill:"#64748b",fontSize:9}}/>
                <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={v=>`$${v}`}/>
                <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                <Area type="stepAfter" dataKey="amount" name="Monthly Contribution" stroke="#22d3ee" fill="url(#ctg)" strokeWidth={2}/>
                {sortedPlans.map((p,i)=><ReferenceLine key={p.id} x={p.startMonth} stroke={C[i%C.length]} strokeDasharray="4 2"/>)}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{...S.card,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:600,color:"#fff"}}>📈 Portfolio Growth</div>
              {finalSched && <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#64748b"}}>Final Value</div><div style={{fontWeight:800,fontSize:17,color:"#10b981"}}>{fmtK(finalSched.portfolioValue)}</div></div>}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={yearly}>
                <defs>
                  <linearGradient id="pgv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="pgc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                  <linearGradient id="pgg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="year" tick={{fill:"#64748b",fontSize:9}}/>
                <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
                <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Area type="monotone" dataKey="portfolioValue" name="Portfolio Value" stroke="#10b981" fill="url(#pgv)" strokeWidth={2.5}/>
                <Area type="monotone" dataKey="contributed"    name="Contributed"     stroke="#6366f1" fill="url(#pgc)" strokeWidth={2}/>
                <Area type="monotone" dataKey="gains"          name="Gains"           stroke="#22d3ee" fill="url(#pgg)" strokeWidth={1.5} strokeDasharray="4 2"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {showScen && (
            <div style={{...S.card,marginBottom:16,border:"1px solid #f59e0b44"}}>
              <div style={{fontWeight:600,color:"#f59e0b",marginBottom:14}}>⚡ Scenario Comparison</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:16}}>
                {scens.map(s=>(
                  <div key={s.id} style={{background:"#0f172a",borderRadius:10,padding:14,border:`1px solid ${s.color}33`}}>
                    <div style={{fontWeight:700,color:s.color,marginBottom:10}}>{s.label}</div>
                    <div style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#64748b"}}>Monthly</span><span style={{fontWeight:700,color:"#e2e8f0"}}>${s.monthly}/mo</span></div>
                      <input type="range" min={100} max={3000} step={50} value={s.monthly} onChange={e=>setScens(p=>p.map(x=>x.id===s.id?{...x,monthly:Number(e.target.value)}:x))} style={{width:"100%",accentColor:s.color}}/>
                    </div>
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#64748b"}}>Return</span><span style={{fontWeight:700,color:"#e2e8f0"}}>{s.rate}%</span></div>
                      <input type="range" min={2} max={18} step={0.5} value={s.rate} onChange={e=>setScens(p=>p.map(x=>x.id===s.id?{...x,rate:Number(e.target.value)}:x))} style={{width:"100%",accentColor:s.color}}/>
                    </div>
                    <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1e293b"}}>
                      <span style={{fontWeight:800,color:s.color,fontSize:15}}>{fmtK(Math.round(fv(s.monthly,s.rate,horiz,lump)))}</span>
                      <span style={{fontSize:11,color:"#64748b"}}> in {horiz}yr</span>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={scenData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="year" tick={{fill:"#64748b",fontSize:9}}/>
                  <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  {scens.map(s=><Line key={s.id} type="monotone" dataKey={s.label} stroke={s.color} strokeWidth={2.5} dot={false}/>)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {view==="orders" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:16}}>
            {[{label:"Portfolio Value",value:"$1,509.54",color:"#10b981",icon:"💼"},{label:"Buying Power",value:"$3,490.46",color:"#22d3ee",icon:"💵"},{label:"Total P&L",value:"+$67.64",color:"#10b981",icon:"📈"},{label:"Open Orders",value:openOrders,color:"#f59e0b",icon:"⏳"}].map(c=>(
              <div key={c.label} style={S.card}><div style={{fontSize:18,marginBottom:4}}>{c.icon}</div><div style={{fontSize:10,color:"#64748b",marginBottom:4}}>{c.label}</div><div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.value}</div></div>
            ))}
          </div>
          <div style={{...S.card,marginBottom:16,border:"1px solid #22d3ee33"}}>
            <div style={{fontWeight:600,color:"#22d3ee",marginBottom:12}}>⚡ Manual Execute</div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:180}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:"#94a3b8"}}>Amount</span><span style={{fontWeight:700,color:"#22d3ee"}}>{fmt(execAmt)}</span></div>
                <input type="range" min={50} max={5000} step={50} value={execAmt} onChange={e=>setExecAmt(Number(e.target.value))} style={{width:"100%",accentColor:"#22d3ee"}}/>
              </div>
              <button onClick={doExec} disabled={exec} style={{padding:"10px 22px",background:exec?"#334155":"linear-gradient(135deg,#22d3ee,#0891b2)",border:"none",borderRadius:8,color:"#0f172a",fontWeight:700,cursor:exec?"not-allowed":"pointer",fontSize:13}}>
                {exec?"⏳ Placing...":"🚀 Execute Now"}
              </button>
            </div>
            <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
              {activeFunds.map((f,i)=>(
                <div key={f.ticker} style={{background:"#0f172a",borderRadius:8,padding:"8px 12px",border:`1px solid ${C[i%C.length]}33`,fontSize:12}}>
                  <span style={{color:C[i%C.length],fontWeight:700}}>{f.ticker}</span>
                  <span style={{color:"#64748b",marginLeft:6}}>{fmt(execAmt*f.allocation/100)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["all","filled","submitted","queued","canceled","failed"].map(s=>(
                <button key={s} onClick={()=>setOFilter(s)} style={{...S.btn(oFilter===s),padding:"6px 12px",fontSize:11,textTransform:"capitalize"}}>{s}</button>
              ))}
            </div>
            <button onClick={doSync} disabled={syncing} style={{marginLeft:"auto",padding:"8px 16px",background:syncing?"#334155":"#1e293b",border:"1px solid #334155",borderRadius:8,color:syncing?"#64748b":"#22d3ee",cursor:syncing?"not-allowed":"pointer",fontSize:12,fontWeight:600}}>
              {syncing?"⏳ Syncing...":"🔄 Sync Alpaca"}
            </button>
          </div>
          <div style={S.card}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:"1px solid #334155"}}>{["Date","Ticker","Amount","Status","Fill Price","Shares",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtOrders.map((o,i)=>{
                    const sm=SMETA[o.status]||SMETA.queued;
                    return (
                      <tr key={o.id} style={{borderBottom:"1px solid #1e293b",background:i%2===0?"transparent":"#ffffff04"}}>
                        <td style={{padding:"10px",color:"#94a3b8",whiteSpace:"nowrap"}}>{o.scheduled_date}</td>
                        <td style={{padding:"10px"}}><span style={{fontWeight:800,color:"#e2e8f0",background:"#334155",padding:"3px 8px",borderRadius:6}}>{o.ticker}</span></td>
                        <td style={{padding:"10px",fontWeight:700,color:"#22d3ee"}}>{fmt(o.notional)}</td>
                        <td style={{padding:"10px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:sm.color+"22",color:sm.color}}>{sm.icon} {sm.label}</span></td>
                        <td style={{padding:"10px",color:"#94a3b8"}}>{o.filled_avg_px?fmt(o.filled_avg_px):"—"}</td>
                        <td style={{padding:"10px",color:"#94a3b8"}}>{o.filled_qty?Number(o.filled_qty).toFixed(4):"—"}</td>
                        <td style={{padding:"10px"}}>
                          {["queued","submitted"].includes(o.status) && (
                            <button onClick={()=>cancelOrd(o.id)} style={{padding:"4px 10px",background:"#f43f5e22",border:"1px solid #f43f5e44",borderRadius:6,color:"#f43f5e",cursor:"pointer",fontSize:11}}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtOrders.length===0 && <div style={{textAlign:"center",padding:32,color:"#475569"}}>No {oFilter==="all"?"":oFilter} orders</div>}
            </div>
          </div>
        </div>
      )}

      {view==="portfolio" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:16}}>
            {[{label:"Total Value",value:fmt(portTotal),color:"#10b981",icon:"💼"},{label:"Cost Basis",value:fmt(portCost),color:"#6366f1",icon:"💰"},{label:"Total P&L",value:fmt(portTotal-portCost),color:(portTotal-portCost)>=0?"#10b981":"#f43f5e",icon:"📊"},{label:"Return",value:`${(((portTotal-portCost)/portCost)*100).toFixed(2)}%`,color:(portTotal-portCost)>=0?"#10b981":"#f43f5e",icon:"📈"}].map(c=>(
              <div key={c.label} style={S.card}><div style={{fontSize:18,marginBottom:4}}>{c.icon}</div><div style={{fontSize:10,color:"#64748b",marginBottom:4}}>{c.label}</div><div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.value}</div></div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div style={S.card}>
              <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Holdings</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={port.map(p=>({name:p.ticker,value:p.marketValue}))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {port.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>P&L by Position</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={port.map(p=>({name:p.ticker,pl:+p.unrealizedPL.toFixed(2)}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <YAxis tick={{fill:"#64748b",fontSize:9}}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                  <Bar dataKey="pl" name="Unrealized P&L" fill="#10b981" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={S.card}>
            <div style={{fontWeight:600,marginBottom:14,color:"#fff"}}>Holdings Detail</div>
            {port.map((p,i)=>(
              <div key={p.ticker} style={{background:"#0f172a",borderRadius:10,padding:14,border:`1px solid ${C[i%C.length]}33`,display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:C[i%C.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:C[i%C.length],flexShrink:0}}>{p.ticker}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:14,color:"#e2e8f0"}}>{p.ticker}</span>
                    <span style={{fontWeight:800,fontSize:16,color:"#fff"}}>{fmt(p.marketValue)}</span>
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
                    <span>{p.qty.toFixed(4)} shares @ {fmt(p.currentPrice)}</span>
                    <span>Cost: {fmt(p.costBasis)}</span>
                    <span style={{color:p.unrealizedPL>=0?"#10b981":"#f43f5e",fontWeight:600}}>P&L: {p.unrealizedPL>=0?"+":""}{fmt(p.unrealizedPL)} ({p.unrealizedPLPct.toFixed(2)}%)</span>
                  </div>
                </div>
                <div style={{textAlign:"center",minWidth:70}}>
                  <div style={{fontSize:11,color:"#64748b"}}>% of Portfolio</div>
                  <div style={{fontWeight:800,color:C[i%C.length],fontSize:16}}>{((p.marketValue/portTotal)*100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:8,padding:"12px 14px",background:"#0f172a",borderRadius:8,fontSize:11,color:"#475569",display:"flex",gap:10}}>
              <span>⚠️</span><span><strong style={{color:"#64748b"}}>Paper Trading Mode.</strong> Set ALPACA_PAPER=false in .env to go live.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Accounts Tab ─────────────────────────────────────────────
function AccountsTab({S}) {
  const [view, setView] = useState("overview");
  const [selCard, setSelCard]   = useState(CREDIT_CARDS[0]);
  const [selBrok, setSelBrok]   = useState(BROKERAGE_ACCTS[0]);
  const [retireAge, setRetireAge]   = useState(65);
  const [currentAge, setCurrentAge] = useState(32);

  const totalBrok   = BROKERAGE_ACCTS.reduce((s,b)=>s+b.balance,0);
  const totalRet    = RETIREMENT_ACCTS.reduce((s,r)=>s+r.balance,0);
  const totalSav    = SAVINGS_ACCTS.reduce((s,a)=>s+a.balance,0);
  const totalAssets = totalBrok+totalRet+totalSav;
  const totalDebt   = CREDIT_CARDS.reduce((s,c)=>s+c.balance,0);
  const netWorth    = totalAssets-totalDebt;
  const nwChange    = netWorth - NW_HISTORY[NW_HISTORY.length-2].value;
  const yearsLeft   = retireAge-currentAge;
  const tt          = S.tt;

  return (
    <div>
      {/* Net worth header */}
      <div style={{...S.card,marginBottom:16,background:"linear-gradient(135deg,#0f2744,#0f172a)",border:"1px solid #f59e0b44"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontWeight:800,fontSize:20,color:"#fff",marginBottom:4}}>🏦 Accounts & Net Worth</div>
            <div style={{fontSize:13,color:"#64748b"}}>All your accounts in one place.</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#64748b"}}>Total Net Worth</div>
            <div style={{fontWeight:900,fontSize:30,color:"#10b981"}}>{fmtK(netWorth)}</div>
            <div style={{fontSize:12,color:nwChange>=0?"#10b981":"#f43f5e",fontWeight:600}}>{nwChange>=0?"↑":"↓"} {fmt(Math.abs(nwChange))} this month</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
        {[
          {icon:"💰",label:"Total Assets",    value:fmtK(totalAssets), color:"#10b981"},
          {icon:"💳",label:"Total Debt",      value:fmt(totalDebt),    color:"#f43f5e"},
          {icon:"📈",label:"Brokerage",       value:fmtK(totalBrok),   color:"#6366f1"},
          {icon:"🏦",label:"Retirement",      value:fmtK(totalRet),    color:"#22d3ee"},
          {icon:"💵",label:"Savings",         value:fmtK(totalSav),    color:"#f59e0b"},
        ].map(c=>(
          <div key={c.label} style={S.card}>
            <div style={{fontSize:18,marginBottom:4}}>{c.icon}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Net worth chart */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontWeight:600,color:"#fff",marginBottom:12}}>📈 Net Worth — Last 12 Months</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={NW_HISTORY}>
            <defs><linearGradient id="nwg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis dataKey="month" tick={{fill:"#64748b",fontSize:9}}/>
            <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={tt}/>
            <Area type="monotone" dataKey="value" name="Net Worth" stroke="#10b981" fill="url(#nwg)" strokeWidth={2.5}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sub nav */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[["overview","📊 Overview"],["cards","💳 Credit Cards"],["brokerage","📈 Brokerage"],["retirement","🏦 Retirement"],["savings","💵 Savings"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${view===v?"#f59e0b44":"#334155"}`,background:view===v?"#f59e0b22":"#0f172a",color:view===v?"#f59e0b":"#64748b",cursor:"pointer",fontSize:12,fontWeight:700}}>{l}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {view==="overview" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={S.card}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:12}}>Asset Breakdown</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[{name:"Brokerage",value:totalBrok},{name:"Retirement",value:totalRet},{name:"Savings",value:totalSav}]} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {["#6366f1","#22d3ee","#10b981"].map((col,i)=><Cell key={i} fill={col}/>)}
                </Pie>
                <Tooltip formatter={v=>fmt(v)} contentStyle={tt}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={S.card}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:14}}>All Accounts</div>
            {[
              ...BROKERAGE_ACCTS.map(b=>({label:b.name,value:b.balance,color:b.color,icon:"📈"})),
              ...RETIREMENT_ACCTS.map(r=>({label:r.name.split("—")[0].trim(),value:r.balance,color:r.color,icon:"🏦"})),
              ...SAVINGS_ACCTS.map(a=>({label:a.name,value:a.balance,color:a.color,icon:"💵"})),
            ].map(a=>(
              <div key={a.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14}}>{a.icon}</span>
                  <span style={{fontSize:12,color:"#94a3b8"}}>{a.label}</span>
                </div>
                <span style={{fontWeight:700,color:a.color,fontSize:13}}>{fmtK(a.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREDIT CARDS */}
      {view==="cards" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
            {[
              {icon:"💳",label:"Total Balance",value:fmt(totalDebt),color:"#f43f5e"},
              {icon:"📊",label:"Total Credit", value:fmt(CREDIT_CARDS.reduce((s,c)=>s+c.limit,0)),color:"#6366f1"},
              {icon:"⚡",label:"Utilization",  value:`${(totalDebt/CREDIT_CARDS.reduce((s,c)=>s+c.limit,0)*100).toFixed(1)}%`,color:totalDebt/CREDIT_CARDS.reduce((s,c)=>s+c.limit,0)<0.3?"#10b981":"#f43f5e"},
              {icon:"💸",label:"Min Due",      value:fmt(CREDIT_CARDS.reduce((s,c)=>s+c.minPayment,0)),color:"#f59e0b"},
            ].map(c=><div key={c.label} style={S.card}><div style={{fontSize:18,marginBottom:4}}>{c.icon}</div><div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{c.label}</div><div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.value}</div></div>)}
          </div>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            {CREDIT_CARDS.map(card=>(
              <button key={card.id} onClick={()=>setSelCard(card)} style={{padding:"10px 18px",borderRadius:10,border:`2px solid ${selCard.id===card.id?card.color:"#334155"}`,background:selCard.id===card.id?card.color+"22":"#0f172a",color:selCard.id===card.id?card.color:"#64748b",cursor:"pointer",fontWeight:700,fontSize:13}}>{card.name}</button>
            ))}
          </div>
          <div style={{...S.card,marginBottom:16,border:`1px solid ${selCard.color}44`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div><div style={{fontWeight:800,fontSize:16,color:"#fff",marginBottom:2}}>{selCard.name}</div><div style={{fontSize:12,color:"#64748b"}}>{selCard.network} · APR {selCard.apr}% · {selCard.rewards}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Balance</div><div style={{fontWeight:800,fontSize:22,color:"#f43f5e"}}>{fmt(selCard.balance)}</div><div style={{fontSize:11,color:"#64748b"}}>Min {fmt(selCard.minPayment)} due {selCard.dueDate}</div></div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"#94a3b8"}}>Utilization</span><span style={{fontWeight:700,color:(selCard.balance/selCard.limit)<0.3?"#10b981":"#f43f5e"}}>{(selCard.balance/selCard.limit*100).toFixed(1)}% of {fmt(selCard.limit)}</span></div>
              <div style={{height:10,background:"#0f172a",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${(selCard.balance/selCard.limit*100).toFixed(0)}%`,background:(selCard.balance/selCard.limit)<0.3?"#10b981":(selCard.balance/selCard.limit)<0.5?"#f59e0b":"#f43f5e",borderRadius:5}}/></div>
              <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Keep below 30% for best credit score</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
              {[
                {label:"Min Only",monthly:selCard.minPayment,color:"#f43f5e"},
                {label:"2x Minimum",monthly:selCard.minPayment*2,color:"#f59e0b"},
                {label:"$500/mo",monthly:500,color:"#10b981"},
                {label:"$1000/mo",monthly:1000,color:"#6366f1"},
              ].map(sc=>{
                const r=selCard.apr/100/12;
                const months=r>0?Math.ceil(-Math.log(1-selCard.balance*r/sc.monthly)/Math.log(1+r)):Math.ceil(selCard.balance/sc.monthly);
                const interest=sc.monthly*months-selCard.balance;
                return (
                  <div key={sc.label} style={{background:"#0f172a",borderRadius:10,padding:14,border:`1px solid ${sc.color}33`}}>
                    <div style={{fontWeight:700,color:sc.color,marginBottom:6,fontSize:12}}>{sc.label}</div>
                    <div style={{fontWeight:800,color:"#fff",fontSize:18,marginBottom:4}}>{months>120?`${(months/12).toFixed(0)}+ yrs`:`${months} mo`}</div>
                    <div style={{fontSize:11,color:"#f43f5e"}}>Interest: {fmt(Math.max(interest,0))}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BROKERAGE */}
      {view==="brokerage" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
            {[
              {icon:"📈",label:"Total Value",value:fmtK(totalBrok),color:"#10b981"},
              {icon:"💰",label:"Total Gain", value:fmt(BROKERAGE_ACCTS.reduce((s,b)=>s+b.totalGain,0)),color:"#10b981"},
              {icon:"📅",label:"Today",      value:`${BROKERAGE_ACCTS.reduce((s,b)=>s+b.dayChange,0)>=0?"+":""}${fmt(BROKERAGE_ACCTS.reduce((s,b)=>s+b.dayChange,0))}`,color:BROKERAGE_ACCTS.reduce((s,b)=>s+b.dayChange,0)>=0?"#10b981":"#f43f5e"},
              {icon:"🏦",label:"Accounts",  value:BROKERAGE_ACCTS.length,color:"#6366f1"},
            ].map(c=><div key={c.label} style={S.card}><div style={{fontSize:18,marginBottom:4}}>{c.icon}</div><div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{c.label}</div><div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.value}</div></div>)}
          </div>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            {BROKERAGE_ACCTS.map(b=>(
              <button key={b.id} onClick={()=>setSelBrok(b)} style={{padding:"10px 18px",borderRadius:10,border:`2px solid ${selBrok.id===b.id?b.color:"#334155"}`,background:selBrok.id===b.id?b.color+"22":"#0f172a",color:selBrok.id===b.id?b.color:"#64748b",cursor:"pointer",fontWeight:700,fontSize:13}}>
                {b.name} <span style={{fontSize:11,color:b.dayChange>=0?"#10b981":"#f43f5e"}}>{b.dayChange>=0?"+":""}{b.dayChangePct.toFixed(2)}%</span>
              </button>
            ))}
          </div>
          <div style={{...S.card,marginBottom:16,border:`1px solid ${selBrok.color}44`}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div><div style={{fontWeight:800,fontSize:16,color:"#fff"}}>{selBrok.name}</div><div style={{fontSize:12,color:"#64748b"}}>{selBrok.holdings.length} positions</div></div>
              <div style={{display:"flex",gap:20}}>
                <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Value</div><div style={{fontWeight:800,fontSize:20,color:"#fff"}}>{fmt(selBrok.balance)}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Total Gain</div><div style={{fontWeight:800,fontSize:20,color:selBrok.totalGain>=0?"#10b981":"#f43f5e"}}>{selBrok.totalGain>=0?"+":""}{fmt(selBrok.totalGain)}</div></div>
              </div>
            </div>
            {selBrok.holdings.map((h,i)=>(
              <div key={h.ticker} style={{background:"#0f172a",borderRadius:10,padding:14,border:`1px solid ${C[i%C.length]}22`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C[i%C.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,color:C[i%C.length],flexShrink:0}}>{h.ticker}</div>
                  <div><div style={{fontWeight:700,color:"#e2e8f0",fontSize:13}}>{h.name}</div><div style={{fontSize:11,color:"#64748b"}}>{h.shares} shares @ {fmt(h.price)}</div></div>
                </div>
                <div style={{display:"flex",gap:16}}>
                  <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Value</div><div style={{fontWeight:700,color:"#fff"}}>{fmt(h.value)}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Gain</div><div style={{fontWeight:700,color:h.gain>=0?"#10b981":"#f43f5e"}}>{h.gain>=0?"+":""}{fmt(h.gain)}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RETIREMENT */}
      {view==="retirement" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
            {[
              {icon:"🏦",label:"Total Saved",value:fmtK(totalRet),color:"#10b981"},
              {icon:"📅",label:"YTD Contrib",value:fmt(RETIREMENT_ACCTS.reduce((s,r)=>s+r.ytdContrib,0)),color:"#6366f1"},
              {icon:"🎁",label:"Employer Match",value:fmt(RETIREMENT_ACCTS.reduce((s,r)=>s+r.employerMatch,0)),color:"#22d3ee"},
              {icon:"⏰",label:"Years to Retire",value:`${yearsLeft} yrs`,color:"#f59e0b"},
            ].map(c=><div key={c.label} style={S.card}><div style={{fontSize:18,marginBottom:4}}>{c.icon}</div><div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{c.label}</div><div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.value}</div></div>)}
          </div>
          <div style={{...S.card,marginBottom:16}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:14}}>⚙️ Age Settings</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[{label:"Current Age",value:currentAge,min:22,max:64,set:setCurrentAge,color:"#6366f1"},{label:"Retirement Age",value:retireAge,min:50,max:75,set:setRetireAge,color:"#10b981"}].map(sl=>(
                <div key={sl.label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:"#94a3b8"}}>{sl.label}</span><span style={{fontWeight:700,color:sl.color,fontSize:16}}>{sl.value}</span></div>
                  <input type="range" min={sl.min} max={sl.max} value={sl.value} onChange={e=>sl.set(Number(e.target.value))} style={{width:"100%",accentColor:sl.color}}/>
                </div>
              ))}
            </div>
          </div>
          {RETIREMENT_ACCTS.map((acct,idx)=>{
            const r=acct.ror/100/12, months=yearsLeft*12;
            const mc=(acct.contribRate?acct.balance*acct.contribRate/100/12:acct.ytdContrib/12)+acct.employerMatch/12;
            const projected=acct.balance*Math.pow(1+r,months)+(r>0?mc*(Math.pow(1+r,months)-1)/r:mc*months);
            const projData=Array.from({length:yearsLeft+1},(_,y)=>{const m=y*12,v=acct.balance*Math.pow(1+r,m)+(r>0&&m>0?mc*(Math.pow(1+r,m)-1)/r:mc*m);return{year:`${currentAge+y}`,value:Math.round(v)};});
            return (
              <div key={acct.id} style={{...S.card,marginBottom:16,border:`1px solid ${acct.color}44`}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:14}}>
                  <div><div style={{fontWeight:800,fontSize:15,color:"#fff"}}>{acct.name}</div>{acct.employer&&<div style={{fontSize:12,color:"#64748b"}}>Match: {acct.employerMatchRate}% · Vesting: {acct.vestingPct}%</div>}</div>
                  <div style={{display:"flex",gap:16}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Balance</div><div style={{fontWeight:800,fontSize:18,color:"#fff"}}>{fmtK(acct.balance)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>At {retireAge}</div><div style={{fontWeight:800,fontSize:18,color:acct.color}}>{fmtK(projected)}</div></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={projData}>
                    <defs><linearGradient id={`rg${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={acct.color} stopOpacity={0.3}/><stop offset="95%" stopColor={acct.color} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="year" tick={{fill:"#64748b",fontSize:9}} interval={Math.floor(yearsLeft/5)}/>
                    <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
                    <Tooltip formatter={v=>fmtK(v)} contentStyle={tt}/>
                    <Area type="monotone" dataKey="value" stroke={acct.color} fill={`url(#rg${idx})`} strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}

      {/* SAVINGS */}
      {view==="savings" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
            {[
              {icon:"💰",label:"Total Saved",     value:fmtK(totalSav),color:"#10b981"},
              {icon:"🎯",label:"Total Goals",      value:fmtK(SAVINGS_ACCTS.reduce((s,a)=>s+a.goal,0)),color:"#6366f1"},
              {icon:"📈",label:"Monthly Interest", value:fmt(SAVINGS_ACCTS.reduce((s,a)=>s+(a.balance*a.apy/100/12),0)),color:"#22d3ee"},
              {icon:"💵",label:"Monthly Deposits", value:fmt(SAVINGS_ACCTS.reduce((s,a)=>s+a.monthlyContrib,0)),color:"#f59e0b"},
            ].map(c=><div key={c.label} style={S.card}><div style={{fontSize:18,marginBottom:4}}>{c.icon}</div><div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{c.label}</div><div style={{fontSize:17,fontWeight:800,color:c.color}}>{c.value}</div></div>)}
          </div>
          {SAVINGS_ACCTS.map((acct,idx)=>{
            const pct=acct.balance/acct.goal*100;
            const remaining=acct.goal-acct.balance;
            const monthsToGoal=Math.ceil(remaining/(acct.monthlyContrib+acct.balance*acct.apy/100/12));
            const projData=Array.from({length:Math.min(monthsToGoal+1,61)},(_,i)=>{
              const r=acct.apy/100/12,v=acct.balance*Math.pow(1+r,i)+acct.monthlyContrib*(Math.pow(1+r,i)-1)/r;
              return{month:i,value:Math.round(Math.min(v,acct.goal*1.05)),goal:acct.goal};
            }).filter((_,i)=>i%Math.max(1,Math.floor(monthsToGoal/8))===0);
            return (
              <div key={acct.id} style={{...S.card,marginBottom:16,border:`1px solid ${acct.color}44`}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:14}}>
                  <div><div style={{fontWeight:800,fontSize:15,color:"#fff"}}>{acct.name}</div><div style={{fontSize:12,color:"#64748b"}}>{acct.bank} · {acct.apy}% APY</div></div>
                  <div style={{display:"flex",gap:16}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Balance</div><div style={{fontWeight:800,fontSize:18,color:"#fff"}}>{fmt(acct.balance)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Goal</div><div style={{fontWeight:800,fontSize:18,color:acct.color}}>{fmt(acct.goal)}</div></div>
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"#94a3b8"}}>Progress</span><span style={{fontWeight:700,color:acct.color}}>{pct.toFixed(1)}% · {fmt(remaining)} to go</span></div>
                  <div style={{height:12,background:"#0f172a",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(pct,100).toFixed(0)}%`,background:`linear-gradient(90deg,${acct.color},${acct.color}99)`,borderRadius:6}}/></div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Goal in ~{monthsToGoal} months at {fmt(acct.monthlyContrib)}/mo</div>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={projData}>
                    <defs><linearGradient id={`sg${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={acct.color} stopOpacity={0.3}/><stop offset="95%" stopColor={acct.color} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="month" tickFormatter={v=>`Mo ${v}`} tick={{fill:"#64748b",fontSize:9}}/>
                    <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={tt}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Area type="monotone" dataKey="value" name="Savings" stroke={acct.color} fill={`url(#sg${idx})`} strokeWidth={2}/>
                    <Line type="monotone" dataKey="goal" name="Goal" stroke="#334155" strokeWidth={1} strokeDasharray="4 2" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab,        setTab]        = useState("Overview");
  const [selYear,    setSelYear]    = useState("All");
  const [selCat,     setSelCat]     = useState("All");
  const [search,     setSearch]     = useState("");
  const [connected,  setConnected]  = useState(false);
  const [linkToken,  setLinkToken]  = useState(null);

const getLinkToken = useCallback(async () => {
    const res  = await fetch("http://localhost:4000/api/plaid/create-link-token", {method:"POST"});
    const data = await res.json();
    setLinkToken(data.link_token);
  }, []);

  useEffect(()=>{ getLinkToken(); }, [getLinkToken]);

  const { open } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token) => {
      await fetch("http://localhost:4000/api/plaid/exchange-token", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({public_token}),
      });
      setConnected(true);
    },
  });
  const [riskAnswers,setRiskAnswers]= useState({});
  const [monthly,    setMonthly]    = useState(500);
  const [horiz,      setHoriz]      = useState(20);
  const [lump,       setLump]       = useState(0);
const [plaidTxns, setPlaidTxns] = useState(null);

useEffect(()=>{
  if(connected){
    fetchPlaidTransactions().then(data=>{ if(data) setPlaidTxns(data); });
  }
},[connected]);


  const riskScore   = Object.values(riskAnswers).reduce((s,v)=>s+v,0);
  const riskProfile = getRisk(riskScore);
  const profComplete= Object.keys(riskAnswers).length===RQ.length;
  const activeFunds = FUNDS[riskProfile];
  const netReturn   = activeFunds.reduce((s,f)=>s+(f.avgReturn-f.expense)*f.allocation/100,0);

  const INP_STYLE = {background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13,outline:"none"};
  const S = makeS(INP_STYLE);
const txnSource = plaidTxns || ALL_TXN;
  const filtered   = useMemo(()=>txnSource.filter(t=>(selYear==="All"||t.year===Number(selYear))&&(selCat==="All"||t.category===selCat)&&(search===""||t.merchant.toLowerCase().includes(search.toLowerCase()))),[selYear,selCat,search]);
  const totalSpent = useMemo(()=>filtered.reduce((s,t)=>s+t.amount,0),[filtered]);
  const byCategory = useMemo(()=>{const map={};filtered.forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});return Object.entries(map).map(([name,value])=>({name,value:+value.toFixed(2)})).sort((a,b)=>b.value-a.value);},[filtered]);
  const byMonth    = useMemo(()=>{const map={};ALL_TXN.filter(t=>selYear==="All"?true:t.year===Number(selYear)).forEach(t=>{const k=t.yearMonth;if(!map[k])map[k]={label:`${t.monthLabel} ${t.year}`,total:0,...Object.fromEntries(CATS.map(c=>[c,0]))};map[k].total=+(map[k].total+t.amount).toFixed(2);map[k][t.category]=+((map[k][t.category]||0)+t.amount).toFixed(2);});return Object.values(map).slice(-24);},[selYear]);
  const byYear     = useMemo(()=>{const map={};ALL_TXN.forEach(t=>{if(!map[t.year])map[t.year]={year:String(t.year),total:0,...Object.fromEntries(CATS.map(c=>[c,0]))};map[t.year].total=+(map[t.year].total+t.amount).toFixed(2);map[t.year][t.category]=+((map[t.year][t.category]||0)+t.amount).toFixed(2);});return Object.values(map).sort((a,b)=>a.year-b.year);},[]);
  const topMerch   = useMemo(()=>{const map={};filtered.forEach(t=>{if(!map[t.merchant])map[t.merchant]={merchant:t.merchant,total:0,count:0};map[t.merchant].total=+(map[t.merchant].total+t.amount).toFixed(2);map[t.merchant].count++;});return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,8);},[filtered]);
  const avgMonthly = byMonth.length>0?totalSpent/(selYear==="All"?36:12):0;
  const prevPeriod = useMemo(()=>{if(selYear==="All")return null;return ALL_TXN.filter(t=>t.year===Number(selYear)-1).reduce((s,t)=>s+t.amount,0);},[selYear]);
  const pct        = prevPeriod ? ((totalSpent-prevPeriod)/prevPeriod*100) : null;
  const showFilters= !["Investment Strategy","Auto-Invest","Spend Analyzer"].includes(tab);

  if (!connected) return (
    <div style={S.page}>
      <div style={S.hdr}><div style={S.logo}>🏦</div><div><div style={{fontWeight:700,fontSize:18,color:"#fff"}}>SpendTracker</div><div style={{fontSize:11,color:"#94a3b8"}}>Powered by Plaid + Alpaca</div></div></div>
      <div style={{maxWidth:480,margin:"80px auto",padding:24,textAlign:"center"}}>
        <div style={{...S.card,padding:40}}>
          <div style={{fontSize:48,marginBottom:16}}>🏦</div>
          <h2 style={{color:"#fff",marginBottom:8}}>Connect Your Bank</h2>
          <p style={{color:"#64748b",fontSize:14,marginBottom:28}}> + Alpaca to analyze spending and automate investments.</p>
          <div style={{background:"#0f172a",borderRadius:12,padding:16,marginBottom:24,textAlign:"left"}}>
            {["256-bit encryption via Plaid","Alpaca paper trading — no real money risk","Read-only bank access","Disconnect anytime"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,fontSize:13,color:"#94a3b8"}}><span style={{color:"#10b981"}}>✓</span>{f}</div>
            ))}
          </div>
        <button onClick={()=>open()} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>Connect Wells Fargo + Alpaca</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <div style={S.logo}>🏦</div>
        <div><div style={{fontWeight:700,fontSize:18,color:"#fff"}}>SpendTracker</div><div style={{fontSize:11,color:"#94a3b8"}}>Wells Fargo ••4821 · Alpaca Paper</div></div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <span style={S.pill("#10b981")}>● Bank</span>
          <span style={S.pill("#f59e0b")}>📄 Paper</span>
        </div>
      </div>

      {showFilters && (
        <div style={{padding:"10px 24px",borderBottom:"1px solid #1e293b",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <select value={selYear} onChange={e=>setSelYear(e.target.value)} style={S.inp}><option value="All">All Years</option>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}</select>
          <select value={selCat}  onChange={e=>setSelCat(e.target.value)}  style={S.inp}><option value="All">All Categories</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...S.inp,width:180}}/>
          <span style={{fontSize:12,color:"#475569",marginLeft:"auto"}}>{filtered.length.toLocaleString()} txns</span>
        </div>
      )}

      <div style={{display:"flex",gap:2,padding:"10px 24px 0",borderBottom:"1px solid #1e293b",overflowX:"auto"}}>
        {TABS.map(t=>{
          const active = tab===t;
          const color  = TAB_CLR[t]||"#6366f1";
          const icons  = {"Spend Analyzer":"🔍 ","Investment Strategy":"📈 ","Auto-Invest":"🤖 "};
          const label  = (icons[t]||"")+t;
          return (
            <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 14px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:active?color:"transparent",color:active?"#fff":"#64748b",borderBottom:active?`2px solid ${color}`:"2px solid transparent",whiteSpace:"nowrap"}}>
              {label}
            </button>
          );
        })}
      </div>

      <div style={{padding:20,maxWidth:1100,margin:"0 auto"}}>

        {tab==="Overview" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:14,marginBottom:20}}>
              <StatCard icon="💸" label="Total Spent"  value={fmt(totalSpent)} color="#f43f5e" S={S}/>
              <StatCard icon="📅" label="Avg / Month"  value={fmt(avgMonthly)} color="#6366f1" S={S}/>
              <StatCard icon="🧾" label="Transactions" value={filtered.length.toLocaleString()} color="#22d3ee" S={S}/>
              <StatCard icon="🏆" label="Top Category" value={byCategory[0]?.name||"—"} color="#f59e0b" S={S}/>
              {pct!==null && <StatCard icon={pct>0?"📈":"📉"} label="vs Prior Year" value={`${pct>0?"+":""}${pct.toFixed(1)}%`} color={pct>0?"#f43f5e":"#10b981"} S={S}/>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div style={S.card}>
                <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Spending by Category</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name.split(" ")[0]} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {byCategory.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={S.card}>
                <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Monthly Trend</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={byMonth.slice(-12)}>
                    <defs><linearGradient id="ovg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="label" tick={{fill:"#64748b",fontSize:9}} interval={1}/>
                    <YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/>
                    <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#ovg)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={S.card}>
              <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>🏪 Top Merchants</div>
              {topMerch.map((m,i)=>(
                <div key={m.merchant} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:26,height:26,borderRadius:8,background:C[i%C.length]+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C[i%C.length],flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{m.merchant}</span><span style={{fontSize:13,fontWeight:700}}>{fmt(m.total)}</span></div>
                    <div style={{height:4,background:"#0f172a",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(m.total/topMerch[0].total*100).toFixed(0)}%`,background:C[i%C.length],borderRadius:2}}/></div>
                  </div>
                  <span style={{fontSize:11,color:"#64748b",minWidth:45,textAlign:"right"}}>{m.count} txns</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="Monthly Trends" && (
          <div>
            <div style={{...S.card,marginBottom:16}}>
              <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Monthly Spending</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byMonth}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="label" tick={{fill:"#64748b",fontSize:9}} interval={1}/><YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/><Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/><Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]}/></BarChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Stacked by Category</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byMonth.slice(-12)}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="label" tick={{fill:"#64748b",fontSize:9}}/><YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/><Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/><Legend wrapperStyle={{fontSize:10}}/>{CATS.slice(0,5).map((c,i)=><Bar key={c} dataKey={c} stackId="a" fill={C[i]}/>)}</BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab==="Categories" && (
          <div style={{display:"grid",gap:12}}>
            {byCategory.map((cat,i)=>{
              const p=totalSpent>0?(cat.value/totalSpent*100):0, tc=filtered.filter(t=>t.category===cat.name).length;
              return (
                <div key={cat.name} style={{...S.card,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:C[i%C.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{CAT_ICONS[i]||"💳"}</div>
                  <div style={{flex:1,minWidth:140}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontWeight:700,color:"#fff"}}>{cat.name}</span><span style={{fontWeight:800,color:C[i%C.length]}}>{fmt(cat.value)}</span></div>
                    <div style={{height:6,background:"#0f172a",borderRadius:3,overflow:"hidden",marginBottom:5}}><div style={{height:"100%",width:`${p.toFixed(0)}%`,background:C[i%C.length],borderRadius:3}}/></div>
                    <div style={{display:"flex",gap:14,fontSize:11,color:"#64748b"}}><span>{p.toFixed(1)}%</span><span>{tc} txns</span><span>Avg {fmt(tc>0?cat.value/tc:0)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="Transactions" && (
          <div style={S.card}>
            <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Transactions</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:"1px solid #334155"}}>{["Date","Merchant","Category","Amount"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:11}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.slice(0,100).map((t,i)=>(
                    <tr key={t.id} style={{borderBottom:"1px solid #1e293b",background:i%2===0?"transparent":"#ffffff04"}}>
                      <td style={{padding:"9px 10px",color:"#94a3b8"}}>{t.date.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td>
                      <td style={{padding:"9px 10px",color:"#e2e8f0",fontWeight:500}}>{t.merchant}</td>
                      <td style={{padding:"9px 10px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:600,background:C[CATS.indexOf(t.category)%C.length]+"22",color:C[CATS.indexOf(t.category)%C.length]}}>{t.category}</span></td>
                      <td style={{padding:"9px 10px",color:"#f43f5e",fontWeight:700}}>{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="Year Comparison" && (
          <div>
            <div style={{...S.card,marginBottom:16}}>
              <div style={{fontWeight:600,marginBottom:12,color:"#fff"}}>Annual Spending</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byYear}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="year" tick={{fill:"#94a3b8",fontSize:12}}/><YAxis tick={{fill:"#64748b",fontSize:9}} tickFormatter={fmtK}/><Tooltip formatter={v=>fmt(v)} contentStyle={S.tt}/><Legend wrapperStyle={{fontSize:10}}/>{CATS.slice(0,6).map((c,i)=><Bar key={c} dataKey={c} stackId="a" fill={C[i]} radius={i===5?[4,4,0,0]:[0,0,0,0]}/>)}</BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
              {byYear.map((y,i)=>{
                const prev=byYear[i-1], diff=prev?((y.total-prev.total)/prev.total*100):null;
                return (
                  <div key={y.year} style={S.card}>
                    <div style={{fontSize:12,color:"#64748b"}}>{y.year}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#fff",margin:"4px 0"}}>{fmtK(y.total)}</div>
                    {diff!==null && <div style={{fontSize:12,color:diff>0?"#f43f5e":"#10b981",fontWeight:600}}>{diff>0?"↑":"↓"} {Math.abs(diff).toFixed(1)}%</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="Spend Analyzer"      && <SpendAnalyzer S={S}/>}
        {tab==="Investment Strategy" && <InvestStrategy riskAnswers={riskAnswers} setRiskAnswers={setRiskAnswers} profileComplete={profComplete} riskProfile={riskProfile} netReturn={netReturn} monthlyInvest={monthly} setMonthlyInvest={setMonthly} lumpSum={lump} setLumpSum={setLump} horizonYears={horiz} setHorizonYears={setHoriz} S={S}/>}
        {tab==="Auto-Invest"         && <AutoInvest activeFunds={activeFunds} S={S}/>}
        {tab==="Accounts"            && <AccountsTab S={S}/>}

      </div>
    </div>
  );
}