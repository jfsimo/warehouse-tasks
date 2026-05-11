import React, { useState, useEffect, useCallback } from "react";

const TASKS = [
  { id:"warehouse-maintenance",    name:"Warehouse Maintenance",                                    freq:"Daily",        owners:["Rob Navito","Grant Douglas"]                       },
  { id:"warehouse-rostering",      name:"Warehouse Rostering (inc manage leave)",                   freq:"Weekly",       owners:["Rob Navito"]                                       },
  { id:"print-picking-slips",      name:"Print, assign picking slips, adjust runs if required",     freq:"Daily",        owners:["Rob Navito"]                                       },
  { id:"lead-pickers",             name:"Lead Pickers after 7am",                                   freq:"Daily",        owners:["Raman","Mick A"]                                   },
  { id:"load-deliver-market-runs", name:"Load and deliver market runs to warehouse",                freq:"",             owners:["Mick A"]                                           },
  { id:"clean-rubbish-warehouse",  name:"Clean/Rubbish Warehouse",                                  freq:"Daily",        owners:["Mick A","Picker"]                                  },
  { id:"logistics-scheduling",     name:"Logistics Scheduling/Comms",                               freq:"",             owners:["Grant Douglas"]                                    },
  { id:"maintenance-trucks",       name:"Maintenance Trucks/Forks/Pallet jacks etc",               freq:"Weekly",       owners:["Michael Cirillo"]                                  },
  { id:"flowers-buying",           name:"Flowers Buying/Pricing",                                   freq:"Daily",        owners:["Michael Cirillo"]                                  },
  { id:"load-unload-trucks",       name:"Load and unload trucks",                                   freq:"",             owners:["Rick Rosselli"]                                    },
  { id:"pick-orders",              name:"Pick orders",                                              freq:"Daily",        owners:["Picker"]                                           },
  { id:"pick-herbs",               name:"Pick herbs",                                               freq:"Daily",        owners:["Herb room Picker"]                                 },
  { id:"bag-cocktails",            name:"Bag Cocktails",                                            freq:"Ad-Hoc",       owners:["Picker"]                                           },
  { id:"log-pick-errors",          name:"Log Pick errors",                                          freq:"",             owners:["Rob Navito"]                                       },
  { id:"enter-wastage",            name:"Enter Wastage items",                                      freq:"",             owners:["Koran"]                                            },
  { id:"comms-roadteam",           name:"Comms with Roadteam after 7am re Pick errors/follow ups",  freq:"",             owners:["Raman"]                                            },
  { id:"deliveries",               name:"Deliveries (incl issues, access, delays, trucks, costs)",  freq:"Daily",        owners:["HR Truck Driver 2"]                                },
  { id:"sunday-qa",                name:"Sunday QA",                                                freq:"Weekly",       owners:["Koran"]                                            },
  { id:"health-safety",            name:"Health and safety induction",                              freq:"",             owners:["Rob Navito"]                                       },
  { id:"pallet-in-out",            name:"Pallet IN/OUT",                                            freq:"Daily",        owners:["Bala V"]                                           },
  { id:"toolbox-meetings",         name:"Run Tool box meetings",                                    freq:"Weekly",       owners:["Rob Navito","Johnny Alessandrino"]                 },
  { id:"truck-cleanliness",        name:"Manage Cleanliness of Trucks",                             freq:"Weekly",       owners:["Rob Navito"]                                       },
  { id:"delivery-runs",            name:"Delivery Runs",                                            freq:"Daily",        owners:["Aman","HR Truck Driver 2","HR Truck Driver 3"]     },
  { id:"warehouse-security",       name:"Warehouse Security & Surveillance",                        freq:"",             owners:["Simon Coppolino"]                                  },
  { id:"timesheet-approvals",      name:"Timesheet Approvals",                                      freq:"Daily",        owners:["Rob Navito","Simon Coppolino"]                     },
  { id:"stocktake",                name:"Stocktake",                                                freq:"Daily",        owners:["Anthony Alessandrino"]                             },
  { id:"group-op-management",      name:"Group Op management",                                      freq:"",             owners:["Grant Douglas","Ben Duffy"]                        },
];

const ALL_PEOPLE = [...new Set(TASKS.flatMap(t => t.owners))].sort();

const FREQ_COLOR = {
  Daily:           { bg:"#dbeafe", color:"#1d4ed8" },
  Weekly:          { bg:"#f3e8ff", color:"#7c3aed" },
  Monthly:         { bg:"#dcfce7", color:"#166534" },
  "Tues & Thurs":  { bg:"#fef9c3", color:"#a16207" },
  "Ad-Hoc":        { bg:"#f1f5f9", color:"#475569" },
  "":              { bg:"#f1f5f9", color:"#6b7280" },
};

function getPeriodStart(freq) {
  const now = new Date();
  if (freq === "Daily") {
    const t = new Date(); t.setHours(8, 0, 0, 0); return t;
  }
  if (freq === "Weekly") {
    const t = new Date(); t.setHours(8, 0, 0, 0);
    const day = t.getDay();
    t.setDate(t.getDate() - (day === 0 ? 6 : day - 1));
    return t;
  }
  if (freq === "Monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1, 8, 0, 0, 0);
  }
  if (freq === "Tues & Thurs") {
    const day = now.getDay();
    if (day === 2 || day === 4) { const t = new Date(); t.setHours(8, 0, 0, 0); return t; }
    return null;
  }
  return null;
}

function getNextReset(freq) {
  const now = new Date();
  if (freq === "Daily") {
    const t = new Date(); t.setHours(8, 0, 0, 0);
    if (now >= t) t.setDate(t.getDate() + 1);
    return t;
  }
  if (freq === "Weekly") {
    const t = new Date(); t.setHours(8, 0, 0, 0);
    const day = t.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    t.setDate(t.getDate() + daysUntilMonday);
    return t;
  }
  if (freq === "Monthly") {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0, 0);
  }
  return null;
}

function getStatus(task, completions) {
  const completedAt = completions[task.id];
  const periodStart = getPeriodStart(task.freq);
  const now = Date.now();
  if (completedAt && periodStart && completedAt >= periodStart.getTime()) return "done";
  if (completedAt && !periodStart) return "done";
  if (periodStart && now >= periodStart.getTime()) return "overdue";
  return "pending";
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit" });
}
function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-AU", { weekday:"short", day:"numeric", month:"short" });
}
function timeUntil(date) {
  const diff = date - Date.now();
  if (diff <= 0) return "now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return Math.floor(h / 24) + "d";
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

function Avatar({ name, size = 24 }) {
  if (!name) return null;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const palettes = [
    ["#e8e2ff","#5b33d4"],["#fde8cc","#a05a00"],["#d1fae5","#155a30"],
    ["#fee2e2","#b91c1c"],["#dbeafe","#1d4ed8"],["#fef9c3","#a16207"],
  ];
  const [bg, fg] = palettes[name.charCodeAt(0) % palettes.length];
  return (
    <div title={name} style={{ width:size, height:size, borderRadius:"50%", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size * 0.38, fontWeight:800, color:fg, flexShrink:0, border:"2px solid #fff" }}>
      {initials}
    </div>
  );
}

function loadCompletions() {
  try { return JSON.parse(localStorage.getItem("wh_completions") || "{}"); }
  catch { return {}; }
}
function saveCompletions(c) {
  localStorage.setItem("wh_completions", JSON.stringify(c));
}

export default function App() {
  const [completions, setCompletions] = useState(loadCompletions);
  const [tick, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("All");
  const [freqFilter, setFreqFilter] = useState("All");

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const complete = useCallback((id) => {
    setCompletions(prev => {
      const next = { ...prev, [id]: Date.now() };
      saveCompletions(next);
      return next;
    });
  }, []);

  const undo = useCallback((id) => {
    setCompletions(prev => {
      const next = { ...prev };
      delete next[id];
      saveCompletions(next);
      return next;
    });
  }, []);

  // Recalculate statuses on every tick
  const statuses = {};
  TASKS.forEach(t => { statuses[t.id] = getStatus(t, completions); });

  const counts = { done:0, overdue:0, pending:0 };
  Object.values(statuses).forEach(s => counts[s]++);

  const freqs = ["All", ...new Set(TASKS.map(t => t.freq).filter(Boolean))];

  const filtered = TASKS.filter(t => {
    if (statusFilter !== "all" && statuses[t.id] !== statusFilter) return false;
    if (personFilter !== "All" && !t.owners.includes(personFilter)) return false;
    if (freqFilter !== "All" && t.freq !== freqFilter) return false;
    return true;
  });

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-AU", { hour:"2-digit", minute:"2-digit" });
  const dateStr = now.toLocaleDateString("en-AU", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div style={{ minHeight:"100vh", background:"#f4f3f8", fontFamily:"'DM Sans','Segoe UI',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:"#0f0c1e", color:"#fff", padding:"24px 40px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:11, letterSpacing:2, color:"#a78bfa", fontWeight:700, marginBottom:4, textTransform:"uppercase" }}>Just Fresh · Warehouse</div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:800, letterSpacing:-0.5 }}>Daily Task Tracker</h1>
              <div style={{ marginTop:4, color:"#a0a0b8", fontSize:13 }}>{dateStr} · {timeStr}</div>
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {[
                { label:"Overdue", key:"overdue", bg:"#ff3b3b" },
                { label:"Pending", key:"pending", bg:"#ff8c00" },
                { label:"Done",    key:"done",    bg:"#22c55e" },
              ].map(({ label, key, bg }) => (
                <div key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
                  style={{ background:statusFilter===key ? bg : "rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 18px", cursor:"pointer", textAlign:"center", border:`1.5px solid ${statusFilter===key ? bg : "rgba(255,255,255,0.1)"}`, minWidth:72 }}>
                  <div style={{ fontSize:22, fontWeight:800, color:"#fff" }}>{counts[key]}</div>
                  <div style={{ fontSize:11, color:statusFilter===key ? "#fff" : "#a0a0b8", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 20px 0" }}>

        {/* Filters */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
          {[
            { key:"all",     label:`All (${TASKS.length})` },
            { key:"overdue", label:"Overdue" },
            { key:"pending", label:"Pending" },
            { key:"done",    label:"Done" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              style={{ padding:"6px 14px", borderRadius:8, border:`1.5px solid ${statusFilter===key?"#6c47ff":"#ddd"}`, background:statusFilter===key?"#f0ebff":"#fff", color:statusFilter===key?"#6c47ff":"#555", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              {label}
            </button>
          ))}
          <div style={{ width:1, height:24, background:"#e0e0e0", margin:"0 4px" }}/>
          {freqs.map(f => (
            <button key={f} onClick={() => setFreqFilter(f)}
              style={{ padding:"6px 12px", borderRadius:20, border:`1.5px solid ${freqFilter===f?"#6c47ff":"#ddd"}`, background:freqFilter===f?"#f0ebff":"#fff", color:freqFilter===f?"#6c47ff":"#555", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {f}
            </button>
          ))}
          <select value={personFilter} onChange={e => setPersonFilter(e.target.value)}
            style={{ marginLeft:4, padding:"6px 12px", borderRadius:8, border:"1.5px solid #ddd", fontSize:12, fontWeight:600, color:personFilter==="All"?"#888":"#6c47ff", background:"#fff", cursor:"pointer" }}>
            <option value="All">All people</option>
            {ALL_PEOPLE.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(statusFilter !== "all" || personFilter !== "All" || freqFilter !== "All") && (
            <button onClick={() => { setStatusFilter("all"); setPersonFilter("All"); setFreqFilter("All"); }}
              style={{ marginLeft:"auto", padding:"6px 12px", borderRadius:8, border:"1.5px solid #e0e0e0", background:"#fff", color:"#666", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Task list */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", color:"#aaa", padding:60, background:"#fff", borderRadius:14 }}>No tasks match this filter.</div>
          )}
          {filtered.map(task => {
            const status = statuses[task.id];
            const completedAt = completions[task.id];
            const nextReset = getNextReset(task.freq);
            const fc = FREQ_COLOR[task.freq] || FREQ_COLOR[""];
            const borderColor = status === "done" ? "#22c55e" : status === "overdue" ? "#ff3b3b" : "#e5e7eb";
            const bgColor = status === "done" ? "#f0fdf4" : status === "overdue" ? "#fff5f5" : "#fff";

            return (
              <div key={task.id} style={{ background:bgColor, borderRadius:14, border:`2px solid ${borderColor}`, borderLeft:`5px solid ${borderColor}`, boxShadow:"0 2px 8px rgba(0,0,0,0.05)", overflow:"hidden" }}>
                <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>

                  {/* Checkbox button */}
                  <button onClick={() => status === "done" ? undo(task.id) : complete(task.id)}
                    title={status === "done" ? "Undo" : "Mark done"}
                    style={{ width:34, height:34, borderRadius:"50%", border:`2.5px solid ${status==="done"?"#22c55e":status==="overdue"?"#ff3b3b":"#d1d5db"}`, background:status==="done"?"#22c55e":status==="overdue"?"#fff0f0":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
                    {status === "done"    && <span style={{ color:"#fff",     fontSize:17, lineHeight:1 }}>✓</span>}
                    {status === "overdue" && <span style={{ color:"#ff3b3b", fontSize:18, lineHeight:1, fontWeight:900 }}>!</span>}
                  </button>

                  {/* Task info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                      {task.freq && (
                        <span style={{ background:fc.bg, color:fc.color, borderRadius:4, padding:"2px 8px", fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" }}>{task.freq}</span>
                      )}
                      {status === "overdue" && (
                        <span style={{ background:"#fee2e2", color:"#b91c1c", borderRadius:4, padding:"2px 8px", fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" }}>Overdue</span>
                      )}
                    </div>
                    <div style={{ fontWeight:800, fontSize:14, color:status==="done"?"#9ca3af":"#111", textDecoration:status==="done"?"line-through":"none", marginBottom:5 }}>
                      {task.name}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      {task.owners.map(o => <Avatar key={o} name={o} size={20}/>)}
                      <span style={{ fontSize:11, color:"#9ca3af", marginLeft:2 }}>{task.owners.join(", ")}</span>
                    </div>
                  </div>

                  {/* Right side: time info + action */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                    {status === "done" && completedAt && (
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>Done {formatTime(completedAt)}</div>
                        <div style={{ fontSize:10, color:"#9ca3af" }}>{formatDate(completedAt)}</div>
                      </div>
                    )}
                    {nextReset && (
                      <div style={{ fontSize:10, color:"#9ca3af" }}>
                        Resets in {timeUntil(nextReset)}
                      </div>
                    )}
                    {status === "done" ? (
                      <button onClick={() => undo(task.id)}
                        style={{ padding:"5px 12px", borderRadius:8, border:"1.5px solid #d1d5db", background:"#fff", color:"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                        Undo
                      </button>
                    ) : (
                      <button onClick={() => complete(task.id)}
                        style={{ padding:"5px 14px", borderRadius:8, border:"none", background:status==="overdue"?"#ff3b3b":"#111", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        Mark done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer legend */}
        <div style={{ marginTop:20, padding:"10px 16px", background:"#fff", borderRadius:12, display:"flex", gap:16, flexWrap:"wrap", alignItems:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          {[["#22c55e","Done"],["#ff3b3b","Overdue"],["#e5e7eb","Pending"]].map(([color, label]) => (
            <span key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#6b7280" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }}/>
              {label}
            </span>
          ))}
          <span style={{ fontSize:11, color:"#9ca3af", marginLeft:"auto" }}>Daily tasks reset at 8:00 AM · {TASKS.length} tasks</span>
        </div>
      </div>
    </div>
  );
}
