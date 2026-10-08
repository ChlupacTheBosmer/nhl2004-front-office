// Leafs Front Office. Static, hash-routed, reads site/public/data/*.json.
// One component -- the plate -- at three sizes; everything else is rules and rows.

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtMoney = v => v == null ? "" : "$" + (v / 1e6).toFixed(2) + "M";
const fmtDate = s => { if (!s) return ""; const d = new Date(s + "T00:00:00"); return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
const fmtDateLong = s => { if (!s) return ""; const d = new Date(s + "T00:00:00"); return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
const NA = "n/a";

const UNITS = [
  ["L1", "even_strength", 1, "1st line", ["LW", "C", "RW", "LD", "RD"]],
  ["L2", "even_strength", 2, "2nd line", ["LW", "C", "RW", "LD", "RD"]],
  ["L3", "even_strength", 3, "3rd line", ["LW", "C", "RW", "LD", "RD"]],
  ["L4", "even_strength", 4, "4th line", ["LW", "C", "RW"]],
  ["P1", "power_play", 1, "PP 1", ["LW", "C", "RW", "LD", "RD"]],
  ["P2", "power_play", 2, "PP 2", ["LW", "C", "RW", "LD", "RD"]],
  ["K1", "penalty_kill", 1, "PK 1", ["LW", "C", "LD", "RD"]],
  ["K2", "penalty_kill", 2, "PK 2", ["LW", "C", "LD", "RD"]],
  ["G", "goalie", null, "Goalies", ["G1", "G2"]],
];
const POS_LABEL = { LW: "Left wing", C: "Centre", RW: "Right wing", LD: "Left defence", RD: "Right defence", G1: "Starter", G2: "Backup", D: "Defence", G: "Goalie" };
const KIND_LABEL = { line_change: "Line change", ice_time: "Ice time", goalie: "Goalie", roster_gap: "Roster gap", development: "Development", no_change: "No change", trade: "Trade", target: "Target", renewal: "Renewal", release: "Release", signing: "Signing", draft: "Draft" };
const AGENT_LABEL = { coach: "Coach", gm_assistant: "GM Assistant" };
const OUTLET_LABEL = { "league-wire": "League Wire", "plus-minus": "Plus/Minus", "home-ice-network": "Home Ice Network", "queen-city-telegram": "Queen City Telegram", "slot-report": "The Slot Report", "hot-stove": "The Hot Stove", "hockey-gazette": "The Hockey Gazette", "prospect-file": "The Prospect File", "penalty-box": "The Penalty Box", "rinkside": "Rinkside" };
// What each grade code means, for the tooltip on every code the page shows.
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; }
// The icons the game draws beside a player's name. The form marker is NOT an injury.
const MARK_GLYPH = { flame: "\u{1F525}", snowflake: "\u2744\uFE0F", thermometer: "\u{1F321}\uFE0F", zzz: "\u{1F4A4}", plaster: "\u{1FA79}" };
const BADGE_GLYPH = { "winged skate": "\u26F8\uFE0F", target: "\u{1F3AF}", "hockey stick": "\u{1F3D2}", hammer: "\u{1F528}" };
const ATTR_LABEL = { SPEE: "speed", ACCE: "acceleration", AGIL: "agility", BALA: "balance", ENDU: "endurance", CHKG: "checking", TOUG: "toughness", FIGH: "fighting", AGGR: "aggression", HERO: "hero", ACCU: "shot accuracy", SHPW: "shot power", PASS: "passing", PUCK: "puck control", DEKG: "deking", FACE: "faceoffs", PENA: "penalty proneness", INJU: "injury proneness", POTE: "potential", PRES: "prestige", ODBI: "offence / defence bias", PCBI: "pass / carry bias", SPBI: "shoot / pass bias",
  GSH_: "glove high", GSL_: "glove low", SSH_: "stick high", SSL_: "stick low", "5HOL": "five-hole", BRKA: "breakaways", REBC: "rebound control", SREC: "recovery", INTE: "intensity", POKE: "poke check", PADL: "paddle down", POSI: "positioning", FLOP: "floppiness", STYL: "style (stand-up / butterfly)", CONS: "consistency", OVR: "overall, as the game shows it today" };
const attrTitle = k => ATTR_LABEL[k] ? ` title="${esc(ATTR_LABEL[k])}"` : "";
// The grade strip on every plate: the three grades that say most about a man in that job.
const STRIP = { F: ["ACCU", "SHPW", "SPEE"], D: ["CHKG", "PASS", "SPEE"], G: ["GSH_", "GSL_", "REBC"] };

const D = {};
let byId = new Map(), byTeam = new Map(), bySurname = new Map(), TOR = "TOR", teamByAbbr = new Map();

// ---------------------------------------------------------------- boot
async function load() {
  const names = ["meta", "teams", "players", "schedule", "recommendations", "reports", "inbox", "owed", "careers", "trades"];
  const res = await Promise.all(names.map(n => fetch(`data/${n}.json?b=${BUILD}`).then(r => { if (!r.ok) throw new Error(`${n}.json ${r.status}`); return r.json(); })));
  names.forEach((n, i) => D[n] = res[i]);
  TOR = D.meta.team;
  const mark = document.querySelector(".mark img"); if (mark) mark.src = asset(`logos/square/${TOR}.png`);
  byId = new Map(D.players.map(p => [p.player_id, p]));
  byTeam = new Map(); bySurname = new Map();
  for (const p of D.players) {
    if (!byTeam.has(p.team)) byTeam.set(p.team, []); byTeam.get(p.team).push(p);
    const k = p.last_name.toLowerCase(); if (!bySurname.has(k)) bySurname.set(k, []); bySurname.get(k).push(p);
  }
  teamByAbbr = new Map(D.teams.map(t => [t.abbr, t]));
  $("#clock").textContent = fmtDateLong(D.meta.in_game_date);
  $("#foot-meta").textContent = `As of ${fmtDateLong(D.meta.in_game_date)}. ${D.meta.players} players on 30 rosters, ${D.meta.games_played} of ${D.meta.games_scheduled} league games played.`;
}
async function icons() {
  try { $("#icons").innerHTML = await (await fetch("icons.svg")).text(); } catch { /* decorative */ }
}

// ---------------------------------------------------------------- plate
// Image files keep their names across reprocessing; the version query keeps a
// browser from showing last week's crop.
const BUILD = document.querySelector('meta[name="build"]')?.content || "0";
const asset = path => `assets/${esc(path)}?${encodeURIComponent(D.meta?.asset_version || "0")}`;
function face(p, eager = false) {
  const initials = (p.first_name?.[0] || "") + (p.last_name?.[0] || "");
  return p.portrait
    ? `<span class="plate-face"><img src="${asset(p.portrait)}" alt="" ${eager ? "" : 'loading="lazy"'} width="36" height="36"></span>`
    : `<span class="plate-face" aria-hidden="true">${esc(initials)}</span>`;
}
function ovrBig(p) {
  return p.overall == null ? "" : `<span class="ovr-hero ${p.overall >= 90 ? "g90" : ""}"><b>${p.overall}</b><span>overall</span></span>`;
}
function ovr(p) {
  return p.overall == null ? "" : `<span class="gr gr-ovr"><span class="gr-k"${attrTitle("OVR")}>OVR</span> <span class="gr-v ${p.overall >= 90 ? "g90" : p.overall >= 80 ? "g80" : ""}">${p.overall}</span></span>`;
}
function strip(p) {
  const keys = STRIP[p.position === "G" ? "G" : p.position === "D" ? "D" : "F"];
  const r = p.ratings || {};
  return ovr(p) + keys.map(k => r[k] == null ? "" : `<span class="gr"><span class="gr-k"${attrTitle(k)}>${esc(k.replace(/_/g, ""))}</span> <span class="gr-v ${r[k] >= 90 ? "g90" : r[k] >= 80 ? "g80" : ""}">${r[k]}</span></span>`).join("");
}
function partsText(p) {
  const q = p.overall_parts; if (!q) return "";
  const sgn = v => (v > 0 ? "+" : "") + v;
  const bits = [["form", "form"], ["morale", "morale"], ["facilities", "facilities"], ["venue", "venue"], ["day", "practice"]].filter(([k]) => q[k]).map(([k, l]) => `${l} ${sgn(q[k])}`);
  return ` · base ${q.base}${bits.length ? " · " + bits.join(" · ") : ""}`;
}
function plate(p, { size = "row", state = "", sub, side, note, eager = false, heading = false } = {}) {
  if (!p) return `<span class="plate plate--empty">empty</span>`;
  const status = [];
  if (state.includes("is-struck")) status.push("out of this slot");
  if (state.includes("is-proposed")) status.push("proposed");
  if (state.includes("is-selected")) status.push("flagged");
  const tags = (p.injury?.out ? `<span class="tag tag-out">out${p.injury.part ? " (" + esc(p.injury.part) + ")" : ""} to ${esc(fmtDate(p.injury.return_date))}</span>` : "")
    + (p.marker ? `<span class="tag tag-mark tag-${esc(p.marker.icon)}" title="${esc(p.marker.note)}">${MARK_GLYPH[p.marker.icon] || ""} ${esc(p.marker.label)}</span>` : "")
    + (p.badges || []).map(b => `<span class="tag tag-badge" title="a displayed rating of 90 or better">${BADGE_GLYPH[b] || ""} ${esc(b)}</span>`).join("")
    + (!p.dressed && !p.retired ? `<span class="tag tag-out">scratched</span>` : "")
    + (p.rating_source === "full" ? `<span class="tag tag-rev" title="revised grades on file">revised</span>` : "");
  const subline = sub ?? `${esc(p.position)} · ${p.age} · ${esc(p.team)}`;
  const sideline = side ?? strip(p);
  const nameTag = heading ? "h1" : "span";
  return `<a class="plate plate--${size} ${state}" href="#player/${p.player_id}">
    <span class="plate-num">${p.jersey ?? ""}</span>${face(p, eager)}
    <span class="plate-body"><${nameTag} class="plate-name">${esc(p.first_name)} ${esc(p.last_name)}${tags}${status.length ? `<span class="sr-only"> (${status.join(", ")})</span>` : ""}</${nameTag}><span class="plate-sub">${subline}</span>${size === "slot" ? `<span class="plate-strip">${sideline}</span>` : ""}</span>
    ${size === "slot" ? "" : `<span class="plate-side">${sideline}</span>`}
  </a>${note ? `<div class="slot-note">${note}</div>` : ""}`;
}

// ---------------------------------------------------------------- name resolution
// Free text from the staff names players by surname, and surnames collide across
// the league (two Nashes, two Richards, two Kaberles, two Spaceks). One player per
// surname: the full name wins, then a club named in the text, then our own club.
function resolve(text, { preferTeam = TOR, avoidTeam = null, onlyTeam = null, limit = 6 } = {}) {
  if (!text) return [];
  const hay = " " + String(text).replace(/[^\p{L}\p{N}']+/gu, " ").toLowerCase() + " ";
  const out = [];
  for (const [surname, cands] of bySurname) {
    if (!hay.includes(" " + surname + " ")) continue;
    let pool = cands;
    // A note about our own lineup names opponents too; only our men can be
    // on our plates.
    if (onlyTeam) { pool = pool.filter(p => p.team === onlyTeam); if (!pool.length) continue; }
    if (avoidTeam) { const away = pool.filter(p => p.team !== avoidTeam); if (away.length) pool = away; }
    const score = p => {
      let s = 0;
      if (hay.includes(" " + p.first_name.toLowerCase() + " " + surname + " ")) s += 100;
      const t = teamByAbbr.get(p.team);
      if (t && (hay.includes(" " + t.abbr.toLowerCase() + " ") || hay.includes(" " + t.name.toLowerCase().replace(/®/g, "").split(" ").pop() + " "))) s += 10;
      if (p.team === preferTeam) s += 5;
      return s;
    };
    const best = pool.map(p => [score(p), p]).sort((a, b) => b[0] - a[0]);
    // A bare surname shared across clubs, with nothing to pick by, is ambiguous;
    // keep it only when something in the text or our club settles it.
    if (best.length > 1 && best[0][0] === 0) continue;
    out.push(best[0][1]);
  }
  return out.slice(0, limit);
}
function mentions(p) {
  const about = [], passing = [];
  const is = who => who.some(q => q.player_id === p.player_id);
  for (const run of D.recommendations) for (const x of run.recommendations || []) {
    const item = { ...x, agent: run.agent, date: run.in_game_date };
    if (is(resolve(`${x.current || ""} | ${x.proposed || ""}`, { limit: 20 }))) about.push(item);
    else if (is(resolve(x.summary || "", { limit: 20 }))) passing.push(item);
  }
  return { about, passing };
}

// ---------------------------------------------------------------- lines
function linesOf(team) {
  const out = {};
  for (const p of byTeam.get(team) || []) for (const s of p.slots) {
    const key = s.unit === "goalie" ? `G:${s.code.slice(0, 2)}` : `${s.unit}:${s.unit_no}:${s.position}`;
    out[key] = p;
  }
  return out;
}
const slotPlayer = (lines, u, pos) => u[0] === "G" ? lines[`G:${pos}`] : lines[`${u[1]}:${u[2]}:${pos}`];
function latestRuns() {
  const seen = new Set(), out = [];
  for (const run of D.recommendations) { if (seen.has(run.agent)) continue; seen.add(run.agent); out.push(run); }
  return out;
}
function proposalsFor(team) {
  const items = [];
  for (const run of latestRuns()) for (const r of run.recommendations || []) {
    if (!["line_change", "goalie", "ice_time"].includes(r.kind)) continue;
    const cur = resolve(r.current, { onlyTeam: team })[0], pro = resolve(r.proposed, { onlyTeam: team })[0];
    if (!cur && !pro) continue;
    items.push({ ...r, agent: run.agent, date: run.in_game_date, curP: cur, proP: pro });
  }
  return items;
}
function slotMatches(text, u, pos) {
  // Whole words only: "forward" contains "rw". A named unit decides; position narrows within it.
  const t = " " + text.toLowerCase().replace(/[-_/]/g, " ") + " ";
  const has = w => t.includes(" " + w + " ");
  const unitWords = { L1: ["first line", "1st line", "top line"], L2: ["second line", "2nd line"], L3: ["third line", "3rd line"], L4: ["fourth line", "4th line"],
    P1: ["first power play", "power play 1", "pp1", "pp 1", "first unit", "first pp"], P2: ["second power play", "power play 2", "pp2", "pp 2", "second unit", "second pp"],
    K1: ["first penalty kill", "penalty kill 1", "pk1", "pk 1", "first kill", "first pk"], K2: ["second penalty kill", "penalty kill 2", "pk2", "pk 2", "second kill", "second pk"],
    G: ["goalie", "goaltender", "starter", "net", "starting goalie"] };
  const posWords = { LW: ["left wing", "lw"], RW: ["right wing", "rw"], C: ["centre", "center"], LD: ["left defence", "left defense", "left d", "ld"], RD: ["right defence", "right defense", "right d", "rd"], G1: ["starter", "start", "starting"], G2: ["backup"] };
  const namedUnit = Object.keys(unitWords).find(k => unitWords[k].some(has));
  const posOk = (posWords[pos] || []).some(has);
  const anyPos = Object.values(posWords).flat().some(has);
  if (namedUnit) return namedUnit === u[0] && (posOk || !anyPos);
  return posOk;
}
function board(team, { compact = false, shortNotes = false } = {}) {
  const lines = linesOf(team);
  const props = proposalsFor(team);
  const units = compact ? UNITS.slice(0, 4) : UNITS;
  const ORD = ["1st", "2nd", "3rd", "4th"];
  // Even-strength units are stored as five-man lines; the board shows the three
  // forward lines/rows first and the defence pairs as rows of their own, so a
  // fourth line without a pair beside it no longer looks like a gap.
  const rows = [];
  for (const [ui, u] of units.entries()) {
    if (u[1] === "even_strength") rows.push({ u, ui, label: u[3], positions: u[4].filter(x => !/D$/.test(x)), cols: 3 });
    else rows.push({ u, ui, label: u[3], positions: u[4], cols: u[4].length });
  }
  const pairs = units.map((u, ui) => ({ u, ui })).filter(({ u }) => u[1] === "even_strength" && u[4].some(x => /D$/.test(x)))
    .map(({ u, ui }, i) => ({ u, ui, label: `${ORD[i] || i + 1} pair`, positions: u[4].filter(x => /D$/.test(x)), cols: 3 }));
  const lastES = rows.map(r => r.u[1]).lastIndexOf("even_strength");
  rows.splice(lastES + 1, 0, ...pairs);
  const row = ({ u, ui, label, positions, cols }) => `<div class="unit"><div class="unit-label">${esc(label)}</div><div class="slots" style="--n:${cols}">${positions.map(pos => {
    const p = slotPlayer(lines, u, pos);
    const hit = props.find(x => x.curP && p && x.curP.player_id === p.player_id && (!x.slot || slotMatches(x.slot, u, pos)));
    const note = hit ? `<b>${AGENT_LABEL[hit.agent]}</b> · ${esc(hit.reason_class || "")}${shortNotes ? "" : ": " + esc(hit.summary)}` : "";
    let html;
    if (hit && hit.proP && hit.proP.player_id !== p.player_id) html = plate(p, { size: "slot", state: "is-struck", eager: ui < 2 }) + plate(hit.proP, { size: "slot", state: "is-proposed", note });
    else if (hit) html = plate(p, { size: "slot", state: "is-selected", note, eager: ui < 2 });
    else html = plate(p, { size: "slot", eager: ui < 2 });
    return `<div class="slot"><span class="slot-pos">${POS_LABEL[pos] || pos}</span>${html}</div>`;
  }).join("")}</div></div>`;
  return `<div class="board">${rows.map(row).join("")}</div>`;
}

// ---------------------------------------------------------------- views
const views = {};

views.dashboard = () => {
  const tor = teamByAbbr.get(TOR);
  const nx = D.schedule.next?.[0];
  const opp = nx && teamByAbbr.get(nx.opponent);
  const recent = D.schedule.recent.slice(0, 10).reverse();
  const msgs = D.inbox.filter(m => m.direction === "out").slice(0, 2);
  const flagged = latestRuns().map(run => ({ ...run, recommendations: (run.recommendations || []).filter(r => r.kind !== "no_change").slice(0, 3) }));
  return `
  <h1 class="sr-only">Today</h1>
  <div class="panel">
    <div class="today">
      <div class="vs">
        <img src="${asset(tor.logo_square)}" alt="">
        <div><div class="big">${tor.w}-${tor.l}-${tor.otl}</div><div class="muted small">${tor.pts} points · ${tor.gp} games · ${tor.gf} for, ${tor.ga} against
          <span class="form" role="img" aria-label="Last ten: ${recent.map(g => g.result).join(", ")}">${recent.map(g => `<i class="${g.result === "W" ? "w" : g.result === "OTL" ? "o" : "l"}" title="${esc(g.result)} ${g.gf}-${g.ga} ${g.at_home ? "vs" : "at"} ${esc(g.opponent)}"></i>`).join("")}</span></div></div>
      </div>
      ${nx ? `<div class="vs"><span class="muted">Next</span><img src="${asset(opp?.logo_square || "")}" alt=""><div><div class="big">${nx.at_home ? "vs" : "at"} ${esc(nx.opponent)}</div><div class="muted small">${fmtDateLong(nx.game_date)} · they are ${nx.opp_w}-${nx.opp_l}-${nx.opp_otl}, last ten ${esc(nx.opp_last10 || "")}</div></div></div>` : ""}
    </div>
  </div>
  <div class="grid-2">
    <section>
      <h2>From the staff</h2>
      <div class="panel divide">${msgs.length ? msgs.map(m => msgHtml(m, { preview: true })).join("") : `<div class="empty">Nothing yet. The Coach and the GM Assistant write after each save.</div>`}</div>
      <p class="small" style="margin-top:.5rem"><a href="#inbox">All messages</a> · <a href="#reports">Reports</a></p>
    </section>
    <section>
      <h2>What they want changed</h2>
      <div class="panel divide">${flagged.length ? flagged.map(runHtml).join("") : `<div class="empty">No proposals yet. They arrive with the next report.</div>`}</div>
      <p class="small" style="margin-top:.5rem"><a href="#proposals">All proposals</a></p>
    </section>
  </div>
  <h2>Lines <span class="muted small">(proposed changes marked; special teams under Lines)</span></h2>
  ${board(TOR, { compact: true, shortNotes: true })}`;
};

views.lines = () => `<h1>Toronto lines</h1><p class="muted">As set in the game at ${fmtDateLong(D.meta.in_game_date)}. A struck plate with a blue plate beside it is a staff proposal; the label says who and why.</p>${board(TOR)}`;

const SKATER_COLS = ["SPEE", "ACCE", "AGIL", "BALA", "ENDU", "CHKG", "TOUG", "FIGH", "AGGR", "HERO", "ACCU", "SHPW", "PASS", "PUCK", "DEKG", "FACE", "PENA", "INJU", "POTE"];
const GOALIE_COLS = ["GSH_", "GSL_", "SSH_", "SSL_", "5HOL", "BRKA", "REBC", "SREC", "INTE", "POKE", "AGIL", "SPEE", "ENDU", "POTE"];
// Advanced filters live in the same URL state as the basic ones, so a filtered
// view stays bookmarkable: amin/amax age, yrs = contract years at least, ovr =
// overall at least, sal = salary at most ($M), a1..a3/v1..v3 = "attribute at
// least" clauses, more = whether the second row is open.
const ROSTER_DEFAULT = { team: "", pos: "", tor: "1", sort: "points", dir: "-1", q: "",
  more: "0", amin: "", amax: "", yrs: "", ovr: "", sal: "", a1: "", v1: "", a2: "", v2: "", a3: "", v3: "" };
const ADV_KEYS = ["amin", "amax", "yrs", "ovr", "sal", "a1", "a2", "a3"];
function advancedCount(s) { return ADV_KEYS.filter(k => s[k] !== "" && (!k.startsWith("a") || k.startsWith("am") || s["v" + k[1]] !== "")).length; }
function passesAdvanced(p, s) {
  const n = v => v === "" ? null : Number(v);
  const amin = n(s.amin), amax = n(s.amax), yrs = n(s.yrs), ovr = n(s.ovr), sal = n(s.sal);
  if (amin != null && !(p.age >= amin)) return false;
  if (amax != null && !(p.age <= amax)) return false;
  if (yrs != null && !((p.contract_years ?? 0) >= yrs)) return false;
  if (ovr != null && !((p.overall ?? 0) >= ovr)) return false;
  if (sal != null && !((p.salary ?? 0) <= sal * 1e6)) return false;
  for (const i of [1, 2, 3]) {
    const k = s["a" + i], v = n(s["v" + i]);
    if (k && v != null && !(((p.ratings || {})[k] ?? -1) >= v)) return false;
  }
  return true;
}
function rosterState() {
  const q = new URLSearchParams((location.hash.split("?")[1] || ""));
  const s = { ...ROSTER_DEFAULT };
  for (const k of Object.keys(s)) if (q.has(k)) s[k] = q.get(k);
  return s;
}
function setRoster(patch, { replace = false } = {}) {
  const s = { ...rosterState(), ...patch };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(s)) if (v !== ROSTER_DEFAULT[k]) q.set(k, v);
  const h = "#roster" + (q.toString() ? "?" + q.toString() : "");
  if (replace) {
    const el = document.activeElement, sel = el?.dataset?.adv ? `[data-adv="${el.dataset.adv}"]` : "[data-q]";
    history.replaceState(null, "", h); render({ keepFocus: sel });
  }
  else location.hash = h;
}
views.roster = () => {
  const s = rosterState();
  const goalieMode = s.pos === "G";
  const cols = goalieMode ? GOALIE_COLS : SKATER_COLS;
  const val = (p, k) => k in p ? p[k] : (p.ratings || {})[k];
  const dir = Number(s.dir);
  let rows = D.players.filter(p => (s.tor !== "1" || p.team === TOR) && (s.team ? p.team === s.team : p.team !== "RET") && (!s.pos || p.position === s.pos) && (!s.q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(s.q.toLowerCase())) && passesAdvanced(p, s));
  const picked = new Set(basket());
  rows.sort((a, b) => { const x = val(a, s.sort), y = val(b, s.sort); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * dir || a.last_name.localeCompare(b.last_name); });
  const th = (k, label, cls = "") => `<th scope="col" class="${cls}" aria-sort="${s.sort === k ? (dir < 0 ? "descending" : "ascending") : "none"}"><button type="button" class="sort" data-sort="${k}" title="Sort by ${esc(ATTR_LABEL[k] || label)}">${esc(label)}</button></th>`;
  const teams = D.teams.map(t => `<option value="${t.abbr}" ${s.team === t.abbr ? "selected" : ""}>${t.abbr} · ${esc(t.name.replace("®", ""))}</option>`).join("");
  const g = v => v == null ? "<td></td>" : `<td class="g ${v >= 90 ? "g90" : v >= 80 ? "g80" : v < 65 ? "g-lo" : ""}">${v}</td>`;
  const statCols = goalieMode
    ? [["gp", "GP"], ["wins", "W"], ["losses", "L"], ["gaa", "GAA"], ["sv_pct", "SV%"], ["morale", "Morale"], ["salary", "Salary"], ["contract_years", "Yrs"]]
    : [["gp", "GP"], ["goals", "G"], ["assists", "A"], ["points", "P"], ["mpg", "MPG"], ["fo_pct", "FO%"], ["morale", "Morale"], ["salary", "Salary"], ["contract_years", "Yrs"]];
  statCols.unshift(["overall", "OVR"]);
  const ncols = 5 + statCols.length + cols.length;
  return `<h1>Roster</h1>
  <div class="filters">
    <button class="chip" type="button" data-tor aria-pressed="${s.tor === "1"}">Toronto only</button>
    <select data-team aria-label="Team"><option value="">All teams</option>${teams}<option value="RET" ${s.team === "RET" ? "selected" : ""}>Retired players</option></select>
    <select data-pos aria-label="Position"><option value="">All positions</option>${["C", "LW", "RW", "D", "G"].map(p => `<option ${s.pos === p ? "selected" : ""}>${p}</option>`).join("")}</select>
    <input data-q type="search" placeholder="Filter by name" value="${esc(s.q)}" aria-label="Filter by name">
    <button class="chip" type="button" data-more aria-expanded="${s.more === "1"}" aria-controls="adv">More filters${advancedCount(s) ? ` (${advancedCount(s)})` : ""}</button>
    <span class="muted small" role="status">${rows.length} player${rows.length === 1 ? "" : "s"}</span>
  </div>
  <div class="filters adv" id="adv" ${s.more === "1" ? "" : "hidden"}>
    <label>Age <input data-adv="amin" type="number" min="17" max="45" placeholder="from" value="${esc(s.amin)}" aria-label="Age from"> to <input data-adv="amax" type="number" min="17" max="45" placeholder="to" value="${esc(s.amax)}" aria-label="Age to"></label>
    <label>Contract <input data-adv="yrs" type="number" min="0" max="10" placeholder="yrs" value="${esc(s.yrs)}" aria-label="Contract years at least"> yrs or more</label>
    <label>OVR <input data-adv="ovr" type="number" min="50" max="99" placeholder="min" value="${esc(s.ovr)}" aria-label="Overall at least"> or more</label>
    <label>Salary <input data-adv="sal" type="number" min="0" max="15" step="0.1" placeholder="max" value="${esc(s.sal)}" aria-label="Salary at most, millions"> $M or less</label>
    ${[1, 2, 3].map(i => `<label class="adv-attr"><select data-adv="a${i}" aria-label="Attribute ${i}"><option value="">attribute</option>${(goalieMode ? D.meta.goalie_keys : D.meta.skater_keys).map(k => `<option value="${k}" ${s["a" + i] === k ? "selected" : ""}>${esc(ATTR_LABEL[k] || k)}</option>`).join("")}</select> &ge; <input data-adv="v${i}" type="number" min="50" max="99" placeholder="50" value="${esc(s["v" + i])}" aria-label="Attribute ${i} at least"></label>`).join("")}
    <button class="chip" type="button" data-clear>Clear</button>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th scope="col" class="pick" title="Add to compare"><span class="sr-only">Compare</span></th>${th("last_name", "Player", "l")}${th("position", "Pos")}${th("age", "Age")}${th("team", "Team")}${statCols.map(([k, l]) => th(k, l)).join("")}${cols.map(k => th(k, k.replace(/_/g, ""))).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map(p => `<tr class="${p.retired ? "ret" : ""}">
      <td class="pick"><input type="checkbox" data-pick="${p.player_id}" ${picked.has(p.player_id) ? "checked" : ""} aria-label="Compare ${esc(p.first_name)} ${esc(p.last_name)}"></td>
      <td class="name l"><a href="#player/${p.player_id}">${face(p)}<span>${esc(p.first_name)} ${esc(p.last_name)}${p.rating_source === "full" ? ' <span class="tag tag-rev">revised</span>' : ""}${p.injury?.out ? ' <span class="tag tag-out">out</span>' : ""}${p.retired ? ' <span class="tag tag-ret">retired</span>' : ""}</span></a></td>
      <td>${esc(p.position)}</td><td>${p.age ?? ""}</td><td>${p.retired ? `<span class="muted">Retired${p.retired.last_team ? " · " + esc(p.retired.last_team) : ""}</span>` : esc(p.team)}</td>
      ${statCols.map(([k]) => k === "overall" ? g(p.overall) : `<td>${k === "salary" ? fmtMoney(p[k]) : (p[k] ?? "")}</td>`).join("")}
      ${cols.map(k => p.position === "G" && !goalieMode ? "<td></td>" : g((p.ratings || {})[k])).join("")}
    </tr>`).join("") : `<tr><td class="l" colspan="${ncols}"><div class="empty">No player matches. Clear a filter, or turn off Toronto only.</div></td></tr>`}</tbody>
  </table></div>`;
};
function bindRoster(root) {
  root.querySelector("[data-tor]")?.addEventListener("click", () => { const s = rosterState(); setRoster({ tor: s.tor === "1" ? "0" : "1", team: "" }); });
  root.querySelector("[data-team]")?.addEventListener("change", e => setRoster({ team: e.target.value, tor: "0" }));
  root.querySelector("[data-pos]")?.addEventListener("change", e => { const pos = e.target.value; setRoster({ pos, sort: pos === "G" ? "wins" : "points", dir: "-1" }); });
  root.querySelector("[data-q]")?.addEventListener("input", e => setRoster({ q: e.target.value }, { replace: true }));
  root.querySelector("[data-more]")?.addEventListener("click", () => setRoster({ more: rosterState().more === "1" ? "0" : "1" }, { replace: true }));
  root.querySelector("[data-clear]")?.addEventListener("click", () => { const z = {}; for (const k of Object.keys(ROSTER_DEFAULT)) if (!["team", "pos", "tor", "sort", "dir", "q", "more"].includes(k)) z[k] = ""; setRoster(z); });
  root.querySelectorAll("[data-adv]").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", e => setRoster({ [el.dataset.adv]: e.target.value }, { replace: true })));
  root.querySelectorAll("[data-pick]").forEach(cb => cb.addEventListener("change", e => {
    const ok = togglePick(Number(cb.dataset.pick), e.target.checked);
    if (!ok) { e.target.checked = false; root.querySelector("[role=status]").textContent = `The basket holds ${BASKET_MAX}; remove one on the Compare tab first.`; }
  }));
  root.querySelectorAll("button.sort").forEach(b => b.addEventListener("click", () => { const s = rosterState(), k = b.dataset.sort; if (s.sort === k) setRoster({ dir: String(-Number(s.dir)) }); else setRoster({ sort: k, dir: ["last_name", "position", "team"].includes(k) ? "1" : "-1" }); }));
}

views.player = id => {
  const p = byId.get(Number(id));
  if (!p) return `<h1>Player</h1><div class="panel"><div class="empty">No such player.</div></div>`;
  const t = teamByAbbr.get(p.team);
  const keys = p.position === "G" ? D.meta.goalie_keys : D.meta.skater_keys;
  const r = p.ratings || {};
  const rs = p.ratings_stored || {};
  const { about, passing } = mentions(p);
  const latestBy = new Map(); for (const n of about) if (!latestBy.has(n.agent)) latestBy.set(n.agent, n.date);
  const recent = about.filter(n => latestBy.get(n.agent) === n.date);
  const older = about.filter(n => latestBy.get(n.agent) !== n.date);
  const notes = about;
  const slotNames = p.slots.filter(s => !/^[HX]/.test(s.code)).map(s => ({ even_strength: "Line", power_play: "PP", penalty_kill: "PK", four_on_four: "4v4", five_on_three: "5v3", goalie: "G", shootout: "SO" }[s.unit] ?? s.unit) + (s.unit_no ?? "") + " " + (s.position || "")).join(" · ");
  const inBasket = basket().includes(p.player_id);
  const club = p.retired
    ? `Retired since ${esc(fmtDate(p.retired.since))}${p.retired.last_team ? ` · last club ${esc(teamByAbbr.get(p.retired.last_team)?.name.replace("®", "") || p.retired.last_team)}` : ""}`
    : esc(t?.name.replace("®", "") || p.team);
  return `
  <p class="cmp-cta"><button type="button" class="chip" data-pick-one="${p.player_id}" aria-pressed="${inBasket}">${inBasket ? "In the basket · remove" : "Add to compare"}</button> <a class="small muted" href="#compare">Compare tab${basket().length ? ` (${basket().length})` : ""}</a></p>
  <div class="panel${p.retired ? " ret" : ""}">${plate(p, { size: "card", eager: true, heading: true, sub: `${esc(POS_LABEL[p.position] || p.position)} · ${p.age} · ${club}${p.height_in ? ` · ${Math.floor(p.height_in / 12)}'${p.height_in % 12}"` : ""}${p.weight_lb ? ` · ${p.weight_lb} lb` : ""}${p.handedness ? ` · shoots ${esc(p.handedness)}` : ""}`, side: ovrBig(p) })}</div>
  <div class="grid-2" style="margin-top:1rem">
    <section>
      ${p.overall != null ? `<p class="small muted ovr-note"><b>Overall ${p.overall}</b> as the game shows it today${partsText(p)}</p>` : ""}
      <h2>Grades <span class="muted small">as shown today${p.rating_source === "full" ? "; revised stored grades on file" : ""}</span></h2>
      <div class="grades">${keys.map(k => r[k] == null ? "" : `<div class="grade" ${rs[k] != null && rs[k] !== r[k] ? `title="stored ${rs[k]}"` : ""}><span class="grade-k"${attrTitle(k)}>${esc(k.replace(/_/g, ""))}</span><span class="grade-bar"><i class="${r[k] >= 85 ? "hi" : ""}" style="width:${Math.max(0, Math.min(100, (r[k] - 50) * 2))}%"></i></span><span class="grade-v">${r[k]}${rs[k] != null && rs[k] !== r[k] ? `<span class="grade-d">${r[k] - rs[k] > 0 ? "+" : ""}${r[k] - rs[k]}</span>` : ""}</span></div>`).join("")}</div>
      <p class="small muted" style="margin-top:.75rem">A grade carries a small figure where today's number differs from the stored grade: form, morale, facilities and venue move it day to day.</p>
      <h2>${p.retired ? `Last season, ${esc(p.retired.last_team || "unsigned")}` : "This season"}</h2>
      <div class="facts">
        ${p.position === "G"
          ? `${fact(p.gp, "games")}${fact(`${p.wins ?? 0}-${p.losses ?? 0}`, "record")}${fact(p.gaa, "GAA")}${fact(p.sv_pct, "save %")}${fact(p.shutouts, "shutouts")}${fact(p.mpg, "min / game")}`
          : `${fact(p.gp, "games")}${fact(p.goals, "goals")}${fact(p.assists, "assists")}${fact(p.points, "points")}${fact(p.mpg, "min / game")}${fact(p.fo_pct != null ? p.fo_pct + "%" : null, "faceoffs")}${fact(p.pim, "PIM")}${fact(p.shots, "shots")}`}
      </div>
      <h2>Contract and status</h2>
      <div class="facts">
        ${fact(fmtMoney(p.salary), "salary")}${fact(p.contract_years, "years left")}${fact(p.morale, "morale")}${fact(p.is_rookie ? "yes" : "no", "rookie")}
        ${fact(p.marker ? p.marker.label : null, "form")}${(p.badges || []).length ? fact(p.badges.join(", "), "badges") : ""}${fact(p.dressed ? "dressed" : "scratched", "tonight")}${fact(p.injury ? (p.injury.out ? (p.injury.part ? p.injury.part + ", out to " : "out to ") + fmtDate(p.injury.return_date) : "fit, back " + fmtDate(p.injury.return_date)) : "fit", "health")}${p.draft_year && p.draft_pick ? fact(`${p.draft_year}, ${p.draft_pick}${ordinal(p.draft_pick)} overall (round ${Math.floor((p.draft_pick - 1) / 30) + 1})`, "drafted") : ""}${p.trophies ? fact(esc(p.trophies), "last season") : ""}
      </div>
      ${slotNames ? `<p class="small muted" style="margin-top:.75rem">Units: ${esc(slotNames)}</p>` : ""}
      ${careerHtml(p)}
    </section>
    <section>
      ${p.news?.length ? `<h2>In the news <span class="muted small">${p.news.length} stor${p.news.length === 1 ? "y" : "ies"}</span></h2>
      <ul class="newslist">${p.news.map(n => `<li><a href="${esc(n.url)}">${esc(n.headline)}</a><span class="muted small">${esc(OUTLET_LABEL[n.outlet] || n.outlet)} · ${esc(fmtDate(n.date))}</span></li>`).join("")}</ul>` : ""}
      <h2>Staff notes <span class="muted small">${notes.length ? `${notes.length} about him · one line each, open one for the reasoning` : ""}</span></h2>
      <div class="panel divide notes">${recent.length ? recent.map(x => noteHtml(x, p)).join("") : `<div class="empty">Nothing on file for him yet.</div>`}</div>
      ${older.length ? `<h3 class="notes-h">Earlier</h3><div class="panel divide notes">${older.map(x => noteHtml(x, p)).join("")}</div>` : ""}
      ${passing.length ? `<h3 class="notes-h">Mentioned in passing</h3><div class="panel divide notes">${passing.slice(0, 12).map(x => noteHtml(x, p)).join("")}</div>` : ""}
    </section>
  </div>`;
};
const fact = (v, label) => `<div class="fact"><b>${v == null || v === "" ? NA : esc(v)}</b><span>${esc(label)}</span></div>`;
const tcrest = a => a ? `<img class="tc" src="${asset(`logos/square/${a}.png`)}" alt="" title="${esc(a)}">` : "";
const season_of = d => { const y = +d.slice(0, 4), m = +d.slice(5, 7); const s = m >= 8 ? y : y - 1; return `${s}-${String(s + 1).slice(2)}`; };

// The record of a career: every season with a line (2003-04 ships with the
// game), the clubs from the stint history, and how each stint began.
function careerHtml(p) {
  const c = D.careers[p.player_id]; if (!c) return "";
  const g = p.position === "G";
  const row = s => {
    const club = s.clubs.length ? s.clubs.join(", ") : `<span class="muted" title="the save keeps a season's line, not the club it was played for; clubs are known from the first save on">not on record</span>`;
    const wl = s.moved ? `<span class="muted" title="the game resets a traded goaltender's wins and losses, so a season with a move has no record to show">–</span>` : `${s.wins ?? 0}-${s.losses ?? 0}`;
    return `<tr class="${s.is_playoffs ? "po" : ""}"><td class="l">${esc(s.label)}${s.is_playoffs ? ' <small class="muted">playoffs</small>' : ""}</td><td class="l">${club}</td>` + (g
      ? `<td>${s.gp}</td><td>${wl}</td><td>${s.gaa ?? ""}</td><td>${s.sv_pct ?? ""}</td><td>${s.shutouts ?? 0}</td><td>${s.minutes ?? ""}</td>`
      : `<td>${s.gp}</td><td>${s.goals ?? 0}</td><td>${s.assists ?? 0}</td><td>${s.points ?? 0}</td><td>${s.pim ?? 0}</td><td>${s.plus_minus_or_ppp ?? ""}</td><td>${s.pp_goals ?? 0}</td><td>${s.gw_goals ?? 0}</td><td>${s.shots ?? 0}</td><td>${s.mpg ?? ""}</td>`) + "</tr>";
  };
  const head = g ? "<th>GP</th><th>W-L</th><th>GAA</th><th>SV%</th><th>SO</th><th>MIN</th>" : "<th>GP</th><th>G</th><th>A</th><th>P</th><th>PIM</th><th>+/-</th><th>PP</th><th>GW</th><th>S</th><th>MPG</th>";
  const how = st => { const h = st.how || {}; const t = D.trades.find(x => x.txn_id === h.txn_id);
    return h.kind === "trade" ? `by trade${h.from ? " from " + esc(h.from) : ""}${t ? ` · <a href="#trade/${t.txn_id}">the deal</a>` : ""}${h.confidence !== "news" ? ' <span class="tag">read off the rosters</span>' : ""}`
      : h.kind === "move" ? `moved${h.from ? " from " + esc(h.from) : ""}` : h.kind === "draft" ? "drafted" : h.kind === "start" ? esc(h.note) : esc(h.note || ""); };
  const stints = c.stints.map(st => `<li>${tcrest(st.abbr)}<div><b>${esc(st.abbr)}</b> · ${esc(fmtDate(st.from))} to ${st.ended ? esc(fmtDate(st.to)) : "today"}<br><small class="muted">${how(st)}</small></div></li>`).join("");
  return `<h2>Career <span class="muted small">every season on record</span></h2>
  <div class="tbl-wrap career"><table class="tbl"><thead><tr><th class="l">Season</th><th class="l">Club</th>${head}</tr></thead><tbody>${c.seasons.map(row).join("") || `<tr><td colspan="12" class="l muted">No season on record.</td></tr>`}</tbody></table></div>
  <h2>Clubs <span class="muted small">since the record began</span></h2>
  <ul class="clubs">${stints || '<li class="muted">No stint on record.</li>'}</ul>`;
}

// The deals: every two-way trade on record, newest first, by season.
views.trades = () => {
  const by = new Map();
  for (const t of D.trades) { const k = season_of(String(t.window_end)); if (!by.has(k)) by.set(k, []); by.get(k).push(t); }
  const side = (t, club) => t.items.filter(i => i.to_team === club).map(i => i.item_kind === "pick" ? `${esc(i.pick_original)} ${ordinal(i.pick_round + 1)}` : `${esc(i.first_name)} ${esc(i.last_name)}`).join(", ") || "nothing on record";
  const rows = [...by.entries()].map(([k, ts]) => `<h2>${esc(k)} <span class="muted small">${ts.length} deal${ts.length === 1 ? "" : "s"}</span></h2><div class="panel divide">${ts.map(t => `
    <a class="tx" href="#trade/${t.txn_id}"><div class="tx-when">${t.filed ? esc(fmtDate(t.filed.date)) : `<span class="muted" title="read off the rosters between two saves">${esc(fmtDate(t.window_start))} to ${esc(fmtDate(t.window_end))}</span>`}</div>
      <div class="tx-side">${tcrest(t.team_a)}<b>${esc(t.team_a)}</b> get ${side(t, t.team_a)}</div>
      <div class="tx-side">${tcrest(t.team_b)}<b>${esc(t.team_b)}</b> get ${side(t, t.team_b)}</div>
      ${t.confidence !== "news" ? '<span class="tag">read off the rosters</span>' : ""}</a>`).join("")}</div>`).join("");
  return `<h1>Trades</h1><p class="muted small">Every two-way deal on record. The game's own log dates the ones it filed; the rest were read off the rosters between two saves and say so. One-way moves (signings, waivers, call-ups) are on each man's profile, not here.</p>${rows || '<div class="panel"><div class="empty">No trade on record.</div></div>'}`;
};
views.trade = id => {
  const t = D.trades.find(x => x.txn_id === Number(id));
  if (!t) return views.missing();
  const got = club => t.items.filter(i => i.to_team === club);
  const item = i => i.item_kind === "pick"
    ? `<li class="pick">${tcrest(i.pick_original)}<div><b>${esc(i.pick_original)}'s ${ordinal(i.pick_round + 1)}-round pick</b><small class="muted">a draft pick</small></div></li>`
    : `<li>${byId.get(i.player_id) ? face(byId.get(i.player_id)) : ""}<div><a href="#player/${i.player_id}"><b>${esc(i.first_name)} ${esc(i.last_name)}</b></a><small class="muted">${esc(i.position || "")}${i.age ? " · " + i.age : ""}${i.overall != null ? " · OVR " + i.overall + " at the time" : ""}</small></div></li>`;
  const col = club => `<section class="panel tx-col"><div class="panel-h"><h2>${tcrest(club)} ${esc(D.teams[club]?.name?.replace("®", "") || club)} <span class="muted small">receive</span></h2></div><ul class="tx-list">${got(club).map(item).join("") || '<li class="muted">nothing on record</li>'}</ul></section>`;
  return `<p class="small"><a href="#trades">&larr; All trades</a></p>
  <h1>${esc(t.team_a)} and ${esc(t.team_b)}${t.filed ? `, ${esc(fmtDate(t.filed.date))}` : ""}</h1>
  <p class="muted">${t.filed ? esc(t.filed.text) : `Read off the rosters between the saves of ${esc(fmtDate(t.window_start))} and ${esc(fmtDate(t.window_end))}; the game's log did not file it, so the pairing of these moves is the pipeline's, not the league's.`}</p>
  <div class="grid-2">${col(t.team_a)}${col(t.team_b)}</div>
  ${t.news?.length ? `<h2>In the news</h2><ul class="newslist">${t.news.map(n => `<li><a href="${esc(n.url)}">${esc(n.headline)}</a><span class="muted small">${esc(OUTLET_LABEL[n.outlet] || n.outlet)} · ${esc(fmtDate(n.date))}</span></li>`).join("")}</ul>` : ""}`;
};

views.proposals = () => `<h1>Proposals</h1><p class="muted">Every recommendation the staff have filed, newest first. Line changes show the current plate struck and the proposed one beside it; trades show both sides. The latest run of each is open.</p>
  <div class="runs">${D.recommendations.length ? D.recommendations.map(run => runHtml(run, { collapsible: true, open: latestRuns().includes(run) })).join("") : `<div class="panel"><div class="empty">No proposals yet. They arrive with the next report.</div></div>`}</div>`;

function runHtml(run, { collapsible = false, open = true } = {}) {
  const items = run.recommendations || [];
  const head = `<b class="agent-${esc(run.agent)}">${AGENT_LABEL[run.agent] || run.agent}</b><span class="muted small">${fmtDateLong(run.in_game_date)} · ${items.length} item${items.length === 1 ? "" : "s"}</span>`;
  const body = `<div class="divide">${items.map(x => recHtml({ ...x, agent: run.agent })).join("")}</div>`;
  if (collapsible) return `<details class="panel run" ${open ? "open" : ""}><summary class="run-h">${head}</summary>${body}</details>`;
  return `<div><div class="run-h">${head}</div>${body}</div>`;
}
function recBody(r) {
  let body = "";
  const isTrade = r.kind === "trade";
  if (["line_change", "goalie", "ice_time", "trade"].includes(r.kind) || (r.current && r.proposed)) {
    const cur = resolve(r.current, isTrade ? { preferTeam: TOR } : { onlyTeam: TOR }), pro = resolve(r.proposed, isTrade ? { avoidTeam: TOR, preferTeam: null } : { onlyTeam: TOR });
    if (cur.length || pro.length) body = `<div class="swap">
      <div class="swap-col"><h4>${isTrade ? "We give" : "Now"}</h4>${cur.length ? cur.map(p => plate(p, { state: r.proposed ? "is-struck" : "is-selected" })).join("") : `<div class="text">${esc(r.current || "")}</div>`}</div>
      <svg class="ic arrow" aria-hidden="true"><use href="#i-arrow-right"/></svg>
      <div class="swap-col"><h4>${isTrade ? "We get" : "Proposed"}</h4>${pro.length ? pro.map(p => plate(p, { state: "is-proposed" })).join("") : `<div class="text">${esc(r.proposed || "")}</div>`}</div>
    </div>`;
  } else if (r.kind === "target") {
    const pro = resolve(r.proposed || r.summary, { avoidTeam: TOR, preferTeam: null });
    if (pro.length) body = `<div class="swap-col">${pro.map(p => plate(p, { state: "is-proposed" })).join("")}</div>`;
  } else if (["renewal", "release", "development"].includes(r.kind)) {
    const who = resolve(r.current || r.summary, { onlyTeam: TOR, limit: 3 });
    if (who.length) body = `<div class="swap-col">${who.map(p => plate(p, { state: "is-selected" })).join("")}</div>`;
  } else if (["signing", "roster_gap"].includes(r.kind)) {
    const who = resolve(r.current || r.summary, { preferTeam: TOR, limit: 3 });
    if (who.length) body = `<div class="swap-col">${who.map(p => plate(p, { state: "is-selected" })).join("")}</div>`;
  }
  return body;
}
function noteHtml(x, about) {
  // One line the eye can scan: what kind of note, the decision, who and when.
  // The reasoning and the plates open on click; the plate of the man whose
  // page this is stays, so "Gaborik over Mogilny" still shows both.
  return `<details class="note"><summary>
    <span class="note-k"><span class="kind">${KIND_LABEL[x.kind] || esc(x.kind)}</span>${x.reason_class ? `<span class="reason reason-${esc(x.reason_class)}">${esc(x.reason_class)}</span>` : ""}</span>
    <span class="note-s">${esc(x.summary)}</span>
    <span class="note-m"><span class="agent-${esc(x.agent)}">${AGENT_LABEL[x.agent] || x.agent}</span> · ${esc(fmtDate(x.date))}</span>
  </summary><div class="note-b">${x.rationale ? `<p>${esc(x.rationale)}</p>` : ""}${x.slot ? `<p class="small muted">${esc(x.slot)}${x.confidence ? ` · ${esc(x.confidence)} confidence` : ""}</p>` : ""}${recBody(x)}</div></details>`;
}
function recHtml(r, { compact = false } = {}) {
  const body = compact ? "" : recBody(r);
  return `<div class="rec">
    <div class="rec-h"><span class="kind">${KIND_LABEL[r.kind] || esc(r.kind)}</span>${r.reason_class ? `<span class="reason reason-${esc(r.reason_class)}">${esc(r.reason_class)}</span>` : ""}${r.slot ? `<span>${esc(r.slot)}</span>` : ""}${r.confidence ? `<span>${esc(r.confidence)} confidence</span>` : ""}${r.agent ? `<span class="agent-${esc(r.agent)}">${AGENT_LABEL[r.agent]}</span>` : ""}</div>
    <div class="rec-summary">${esc(r.summary)}</div>
    ${r.rationale ? `<div class="rec-why">${esc(r.rationale)}</div>` : ""}
    ${body}
  </div>`;
}

views.inbox = () => {
  const groups = {};
  D.inbox.forEach((m, i) => (groups[m.agent] ||= []).push({ ...m, i }));
  return `<h1>Inbox</h1><p class="muted">Everything the staff sent, and everything you asked them, newest first.</p>
  <div class="grid-2">${Object.entries(groups).map(([a, ms]) => `<section><h2 class="agent-${esc(a)}">${AGENT_LABEL[a] || a}</h2><div class="panel divide">${ms.map(m => msgHtml(m)).join("")}</div></section>`).join("") || `<div class="panel"><div class="empty">No messages yet.</div></div>`}</div>`;
};
function msgHtml(m, { preview = false } = {}) {
  const who = m.direction === "in" ? "You" : (AGENT_LABEL[m.agent] || m.agent);
  const when = m.in_game_date ? fmtDate(m.in_game_date) : "";
  const id = `m-${m.i != null ? m.i : D.inbox.indexOf(m)}`;
  const cut = preview && m.text.length > 600;
  const text = cut ? m.text.slice(0, 600).replace(/\s+\S*$/, "") + " …" : m.text;
  return `<div class="msg ${m.direction}" id="${id}"><div class="msg-h"><b>${esc(who)}</b><span>${esc(when)}</span></div><div class="msg-t">${esc(text)}${cut ? ` <a href="#inbox/${id}">Read the whole message</a>` : ""}</div></div>`;
}

views.reports = id => {
  if (id != null) {
    const r = D.reports[Number(id)];
    if (!r) return `<h1>Report</h1><div class="panel"><div class="empty">No such report.</div></div>`;
    return `<p class="small"><a href="#reports">All reports</a></p><h1 class="sr-only">${esc(r.title)}</h1><div class="panel"><div class="run-h"><b class="agent-${esc(r.agent)}">${AGENT_LABEL[r.agent]}</b><span class="muted small">${fmtDateLong(r.in_game_date)} · run ${r.run}</span></div><div class="prose report">${reportHtml(r)}</div></div>`;
  }
  return `<h1>Reports</h1><ul class="list panel divide">${D.reports.map((r, i) => `<li><a href="#reports/${i}"><span><b class="agent-${esc(r.agent)}">${AGENT_LABEL[r.agent]}</b> · ${esc(r.title)}</span><span class="muted small">${fmtDateLong(r.in_game_date)}</span></a></li>`).join("") || `<li class="empty">No reports yet.</li>`}</ul>`;
};
views.missing = () => `<h1>Not found</h1><div class="panel"><div class="empty">There is no such page. <a href="#dashboard">Back to today</a>.</div></div>`;

// A report is the duty sections of one run. Each becomes a titled section with
// the prose, then the proposals that run filed under that duty, rendered as the
// same cards as on the Proposals page. Players named in the prose become chips.
function reportHtml(r) {
  const run = D.recommendations.find(x => x.agent === r.agent && x.in_game_date === r.in_game_date && x.run === r.run);
  const parts = [];
  let cur = { title: null, lines: [] }, first = true;
  for (const l of r.markdown.replace(/\r/g, "").split("\n")) {
    if (first && /^#\s/.test(l)) { first = false; continue; }              // the title line; the panel header carries it
    first = false;
    const m = /^#{2,3}\s+(.*)/.exec(l);
    if (m) { if (/^analysis$/i.test(m[1].trim())) continue; parts.push(cur); cur = { title: m[1].trim(), lines: [] }; continue; }
    cur.lines.push(l);
  }
  parts.push(cur);
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  return parts.filter(s => s.title || s.lines.some(l => l.trim())).map(s => {
    const recs = run && s.title ? (run.recommendations || []).filter(x => (x.duty || "").replace(/_/g, " ").toLowerCase() === s.title.toLowerCase()) : [];
    return `${s.title ? `<h2>${esc(cap(s.title))}</h2>` : ""}${md(s.lines.join("\n"), { chips: true })}${recs.length ? `<div class="report-recs"><h3>Filed under ${esc(s.title.toLowerCase())}</h3><div class="panel divide">${recs.map(x => recHtml({ ...x, agent: run.agent })).join("")}</div></div>` : ""}`;
  }).join("");
}
// Player mentions in prose become chips: face, name, overall. A full name is
// matched anywhere in the league; a bare surname only when it is unique, or
// unique on our club. The first mention in a paragraph gets the chip, later
// ones a plain link, so a paragraph about one man is not a wall of faces.
let NAMES = null;
function nameIndex() {
  if (NAMES) return NAMES;
  const full = [], sur = [];
  for (const p of D.players) full.push([`${p.first_name} ${p.last_name}`, p]);
  for (const [k, ps] of bySurname) {
    const tor = ps.filter(p => p.team === TOR);
    const pick = tor.length === 1 ? tor[0] : ps.length === 1 ? ps[0] : null;
    if (pick && k.length > 2) sur.push([pick.last_name, pick]);
  }
  full.sort((a, b) => b[0].length - a[0].length); sur.sort((a, b) => b[0].length - a[0].length);
  return NAMES = { full, sur };
}
function chipify(html) {
  const { full, sur } = nameIndex();
  const seen = new Set();
  const sub = (text, name, p) => {
    const re = new RegExp(`(^|[^\\w>#/"'])(${esc(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\w'’-])`, "g");
    let n = 0;
    return text.replace(re, (m, pre, hit) => {
      n++;
      if (n === 1 && !seen.has(p.player_id)) { seen.add(p.player_id); return `${pre}<a class="chip-p" href="#player/${p.player_id}">${face(p)}<span>${hit}</span>${p.overall != null ? `<b>${p.overall}</b>` : ""}</a>`; }
      return `${pre}<a class="chip-l" href="#player/${p.player_id}">${hit}</a>`;
    });
  };
  for (const [name, p] of full) if (html.includes(esc(name))) html = sub(html, name, p);
  for (const [name, p] of sur) if (!seen.has(p.player_id) && html.includes(name)) html = sub(html, name, p);
  return html;
}

// A small markdown renderer: headings, paragraphs, lists, tables, bold, italics, code, quotes.
function md(src, { chips = false } = {}) {
  const lines = src.replace(/\r/g, "").split("\n");
  let out = "", i = 0;
  const inline0 = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/_([^_\n]+)_/g, "<i>$1</i>");
  const inline = chips ? x => chipify(inline0(x)) : inline0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) { let j = i + 1, buf = []; while (j < lines.length && !/^```/.test(lines[j])) buf.push(lines[j++]); out += `<pre><code>${esc(buf.join("\n"))}</code></pre>`; i = j + 1; continue; }
    const h = /^(#{1,6})\s+(.*)/.exec(l);
    if (h) { const lvl = Math.min(6, h[1].length + 1); out += `<h${lvl}>${inline(h[2])}</h${lvl}>`; i++; continue; }
    if (/^\|/.test(l)) { const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]); const cells = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim()); const body = rows.filter(r => !/^\|\s*-{2,}/.test(r)); out += `<table><thead><tr>${cells(body[0]).map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`; continue; }
    if (/^\s*[-*]\s+/.test(l)) { let items = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, "")); out += `<ul>${items.map(x => `<li>${inline(x)}</li>`).join("")}</ul>`; continue; }
    if (/^\s*\d+\.\s+/.test(l)) { let items = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, "")); out += `<ol>${items.map(x => `<li>${inline(x)}</li>`).join("")}</ol>`; continue; }
    if (/^>\s?/.test(l)) { let q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, "")); out += `<blockquote>${inline(q.join(" "))}</blockquote>`; continue; }
    if (!l.trim()) { i++; continue; }
    let p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\||```|>|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) p.push(lines[i++]);
    out += `<p>${inline(p.join(" "))}</p>`;
  }
  return out;
}

// ---------------------------------------------------------------- find (combobox)
function bindFind() {
  const input = $("#q"), list = $("#find-results");
  let sel = -1, hits = [];
  const close = () => { list.hidden = true; sel = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
  const go = p => { location.hash = `#player/${p.player_id}`; input.value = ""; close(); };
  const show = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) return close();
    hits = D.players.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)).sort((a, b) => (a.retired ? 1 : 0) - (b.retired ? 1 : 0) || (a.team === TOR ? -1 : 0) - (b.team === TOR ? -1 : 0) || a.last_name.localeCompare(b.last_name)).slice(0, 12);
    list.innerHTML = hits.length
      ? hits.map((p, i) => `<li role="option" id="opt-${i}" aria-selected="${i === sel}" data-i="${i}" class="${p.retired ? "ret" : ""}">${face(p)}<span><b>${esc(p.first_name)} ${esc(p.last_name)}</b> <span class="muted small">${esc(p.position)} · ${p.retired ? "retired" + (p.retired.last_team ? ", last " + esc(p.retired.last_team) : "") : esc(p.team)} · ${p.age}</span></span></li>`).join("")
      : `<li class="empty" aria-disabled="true">No player by that name</li>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (sel >= 0) input.setAttribute("aria-activedescendant", `opt-${sel}`); else input.removeAttribute("aria-activedescendant");
  };
  input.addEventListener("input", () => { sel = -1; show(); });
  input.addEventListener("focus", show);
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") { close(); input.blur(); return; }
    if (e.key === "Enter") { e.preventDefault(); if (list.hidden) show(); const p = hits[sel >= 0 ? sel : 0]; if (p) go(p); return; }
    if (list.hidden) return;
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, hits.length - 1); show(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); show(); e.preventDefault(); }
  });
  list.addEventListener("mousedown", e => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); go(hits[Number(li.dataset.i)]); } });
  document.addEventListener("click", e => { if (!e.target.closest("#find")) close(); });
  document.addEventListener("keydown", e => { if (e.key === "/" && !/input|textarea|select/i.test(e.target.tagName)) { e.preventDefault(); input.focus(); } });
  $("#find").addEventListener("submit", e => e.preventDefault());
}

// ---------------------------------------------------------------- theme
function bindTheme() {
  const root = document.documentElement, btn = $("#theme");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const apply = t => { if (t) root.dataset.theme = t; else delete root.dataset.theme; const dark = isDark(); btn.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-${dark ? "sun" : "moon"}"/></svg>`; btn.setAttribute("aria-pressed", String(dark)); btn.setAttribute("aria-label", dark ? "Dark mode on. Switch to light" : "Light mode on. Switch to dark"); };
  let saved = null; try { saved = localStorage.getItem("theme"); } catch {}
  apply(saved);
  btn.addEventListener("click", () => { const next = isDark() ? "light" : "dark"; try { localStorage.setItem("theme", next); } catch {} apply(next); });
}

// ------------------------------------------------------------------- owed
// What each agent undertook to do, or was told to do, and whether he did it.
// The page exists for one question -- has he actually delivered? -- so the
// count and the date of the last delivery come before the description.
views.owed = () => {
  const all = D.owed || [];
  const open = all.filter(x => x.state === "open");
  const closed = all.filter(x => x.state !== "open");
  const who = a => a === "coach" ? "Coach" : "GM Assistant";
  const cadence = x => x.cadence === "every_snapshot" ? "every game"
    : x.cadence === "by_date" ? `by ${x.due || "?"}` : "one off";
  const row = x => {
    const late = x.state === "open" && x.times === 0;
    return `<tr>
      <td>#${x.id}</td>
      <td class="l">${who(x.agent)}</td>
      <td class="l job">${esc(x.what || "")}
        <div class="small">${x.origin === "promised" ? "he promised it" : "you asked for it"}
          · opened ${x.opened_on || "?"} · ${cadence(x)}</div></td>
      <td>${x.times}</td>
      <td>${x.last_on || (late ? `<strong>never</strong>` : "\u2014")}</td>
      <td class="l">${x.state}</td></tr>`;
  };
  const table = rows => rows.length ? `<div class="tbl-wrap"><table class="tbl owed">
      <thead><tr><th></th><th class="l">Who</th><th class="l">Job</th>
      <th>Delivered</th><th>Last done</th><th class="l">State</th></tr></thead>
      <tbody>${rows.map(row).join("")}</tbody></table></div>`
    : `<div class="empty">Nothing here.</div>`;
  return `<h1>Owed</h1>
    <p class="small">Work the agents took on, or you gave them. Assign one in
    Telegram with <code>/task</code>, call it off with
    <code>/drop &lt;n&gt;</code>, or ask either of them
    <code>/owed</code>.</p>
    <section class="note"><h2>Open (${open.length})</h2>${table(open)}</section>
    ${closed.length ? `<section class="note"><h2>Finished and dropped</h2>${table(closed)}</section>` : ""}`;
};

// ------------------------------------------------------------------ basket
// Players picked for comparison, across any number of searches. Kept in the
// browser (same place as the theme), so it survives reloads; the cap exists
// because a radar with more than eight polygons stops saying anything.
const BASKET_MAX = 8;
function basket() { try { return (JSON.parse(localStorage.getItem("basket") || "[]") || []).filter(id => byId.has(id)).slice(0, BASKET_MAX); } catch { return []; } }
function setBasket(ids) { try { localStorage.setItem("basket", JSON.stringify(ids)); } catch {} refreshBasketTab(); }
function togglePick(id, on) {
  const ids = basket();
  if (on) { if (ids.includes(id)) return true; if (ids.length >= BASKET_MAX) return false; setBasket([...ids, id]); return true; }
  setBasket(ids.filter(x => x !== id)); return true;
}
function refreshBasketTab() {
  const a = document.querySelector('.tabs a[data-route="compare"]'); if (!a) return;
  const n = basket().length;
  a.innerHTML = `Compare${n ? ` <span class="count">${n}</span>` : ""}`;
}

// --------------------------------------------------------------- compare
// One validated categorical palette, fixed order, never cycled: a player keeps
// his colour while he is in the basket whatever else is added or removed.
const SERIES = 8;
function seriesColor(i) { return `var(--s${(i % SERIES) + 1})`; }
// Attributes every player in the basket actually has. A skater and a goalie
// share a few; everything else would be a blank row.
function sharedKeys(ps) {
  if (!ps.length) return [];
  const allG = ps.every(p => p.position === "G"), allS = ps.every(p => p.position !== "G");
  const order = allG ? D.meta.goalie_keys : allS ? D.meta.skater_keys : D.meta.skater_keys.filter(k => D.meta.goalie_keys.includes(k));
  return order.filter(k => ps.every(p => (p.ratings || {})[k] != null));
}
const AXES_DEFAULT = { skater: ["SPEE", "SHPW", "ACCU", "PASS", "CHKG", "TOUG"], goalie: ["GSH_", "GSL_", "5HOL", "REBC", "AGIL", "SREC"] };
function axesState(ps) {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const shared = sharedKeys(ps);
  let axes = (q.get("ax") || "").split(",").filter(k => shared.includes(k));
  if (axes.length < 3) axes = (ps.every(p => p.position === "G") ? AXES_DEFAULT.goalie : AXES_DEFAULT.skater).filter(k => shared.includes(k));
  if (axes.length < 3) axes = shared.slice(0, 6);
  return axes.slice(0, 8);
}
function setAxes(axes) {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  q.set("ax", axes.join(","));
  history.replaceState(null, "", "#compare?" + q.toString()); render({ keepFocus: "[data-ax]:focus" });
}
const fullName = p => `${p.first_name} ${p.last_name}`;

function radar(ps, axes) {
  // 50..99 is the game's own scale, so 50 is the centre and 99 the rim; the
  // rings are at the grade thresholds the roster already colours by.
  const W = 420, cx = W / 2, cy = W / 2, R = 150, lo = 50, hi = 99;
  const n = axes.length, ang = i => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const rad = v => R * Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const pt = (i, v) => [cx + rad(v) * Math.cos(ang(i)), cy + rad(v) * Math.sin(ang(i))];
  const ring = v => axes.map((_, i) => pt(i, v).map(x => x.toFixed(1)).join(",")).join(" ");
  const rings = [60, 70, 80, 90, 99].map(v => `<polygon points="${ring(v)}" class="rr${v === 99 ? " rr-rim" : ""}"></polygon>`).join("");
  const spokes = axes.map((k, i) => { const [x, y] = pt(i, hi); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="rs"></line>`; }).join("");
  const labels = axes.map((k, i) => { const [x, y] = pt(i, hi + 9); const a = ang(i); const anchor = Math.abs(Math.cos(a)) < .2 ? "middle" : Math.cos(a) > 0 ? "start" : "end"; return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" class="rl">${esc(ATTR_LABEL[k] || k)}</text>`; }).join("");
  const polys = ps.map((p, i) => {
    const vals = axes.map(k => (p.ratings || {})[k] ?? lo);
    const pts = vals.map((v, j) => pt(j, v));
    const dots = pts.map(([x, y], j) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" style="fill:${seriesColor(i)}" class="rd"><title>${esc(fullName(p))} · ${esc(ATTR_LABEL[axes[j]] || axes[j])} ${vals[j]}</title></circle>`).join("");
    const j = i % n, a = ang(j), [tx, ty] = pts[j];
    const inward = Math.abs(Math.cos(a)) < .2 ? "middle" : Math.cos(a) > 0 ? "end" : "start";
    const tag = ps.length <= 4 ? `<text x="${(tx - 14 * Math.cos(a)).toFixed(1)}" y="${(ty - 14 * Math.sin(a) + 4).toFixed(1)}" text-anchor="${inward}" class="rt">${esc(p.last_name)}</text>` : "";
    return `<g class="rp"><polygon points="${pts.map(q => q.map(x => x.toFixed(1)).join(",")).join(" ")}" style="stroke:${seriesColor(i)};fill:${seriesColor(i)}"></polygon>${dots}${tag}</g>`;
  }).join("");
  const scale = [60, 70, 80, 90].map(v => { const [x, y] = pt(0, v); return `<text x="${(x + 5).toFixed(1)}" y="${(y + 3).toFixed(1)}" class="rv">${v}</text>`; }).join("");
  return `<svg class="radar" viewBox="0 0 ${W} ${W}" role="img" aria-label="Radar of ${axes.length} attributes for ${ps.length} players">${rings}${spokes}${scale}${polys}${labels}</svg>`;
}

function bars(ps, axes) {
  const lo = 50, hi = 99;
  return `<div class="strips">${axes.map(k => {
    const vals = ps.map(p => (p.ratings || {})[k]);
    const best = Math.max(...vals.filter(v => v != null));
    return `<div class="strip"><div class="strip-k">${esc(ATTR_LABEL[k] || k)}</div><div class="strip-rows">${ps.map((p, i) => {
      const v = vals[i]; const w = v == null ? 0 : Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
      return `<div class="strip-row ${v === best ? "best" : ""}" title="${esc(fullName(p))} ${v ?? "—"}"><span class="strip-n">${esc(p.last_name)}</span><span class="strip-bar"><span style="width:${w.toFixed(1)}%;background:${seriesColor(i)}"></span></span><span class="strip-v">${v ?? "—"}</span></div>`;
    }).join("")}</div></div>`;
  }).join("")}</div>`;
}

function whoWins(ps, axes) {
  const rows = ps.map((p, i) => {
    const vals = axes.map(k => (p.ratings || {})[k]).filter(v => v != null);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const leads = axes.filter(k => { const v = (p.ratings || {})[k]; return v != null && v === Math.max(...ps.map(q => (q.ratings || {})[k] ?? -1)); }).length;
    return { p, i, mean, leads };
  }).sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1));
  return `<ol class="wins">${rows.map(({ p, i, mean, leads }) => `<li><span class="sw" style="background:${seriesColor(i)}"></span><a href="#player/${p.player_id}">${esc(fullName(p))}</a><span class="muted">leads ${leads} of ${axes.length} · mean ${mean == null ? "—" : mean.toFixed(1)} · OVR ${p.overall ?? "—"}</span></li>`).join("")}</ol>`;
}

function compareTable(ps) {
  const keys = sharedKeys(ps);
  const allG = ps.every(p => p.position === "G");
  const td = (f, { best = false, money = false } = {}) => {
    const vals = ps.map(f); const nums = vals.filter(v => typeof v === "number");
    const top = best && nums.length > 1 ? Math.max(...nums) : null;
    return vals.map(v => `<td class="${top != null && v === top ? "best" : ""}">${v == null ? "—" : money ? fmtMoney(v) : esc(v)}</td>`).join("");
  };
  const row = (label, f, o) => `<tr><th scope="row">${esc(label)}</th>${td(f, o)}</tr>`;
  const group = (label, body) => `<tr class="grp"><th scope="rowgroup" colspan="${ps.length + 1}">${esc(label)}</th></tr>${body}`;
  const season = allG
    ? row("Games", p => p.gp) + row("Record", p => `${p.wins ?? 0}-${p.losses ?? 0}`) + row("GAA", p => p.gaa) + row("Save %", p => p.sv_pct) + row("Shutouts", p => p.shutouts, { best: true })
    : row("Games", p => p.gp) + row("Goals", p => p.goals, { best: true }) + row("Assists", p => p.assists, { best: true }) + row("Points", p => p.points, { best: true }) + row("Min / game", p => p.mpg, { best: true }) + row("PIM", p => p.pim);
  return `<div class="tbl-wrap cmp-wrap"><table class="tbl cmp">
    <thead><tr><th scope="col" class="l">&nbsp;</th>${ps.map((p, i) => `<th scope="col"><span class="sw" style="background:${seriesColor(i)}"></span><a href="#player/${p.player_id}">${esc(fullName(p))}</a><button type="button" class="x" data-unpick="${p.player_id}" aria-label="Remove ${esc(fullName(p))}">×</button></th>`).join("")}</tr></thead>
    <tbody>
      ${group("Profile", row("Position", p => p.position) + row("Age", p => p.age) + row("Team", p => p.team) + row("Height", p => p.height_in ? `${Math.floor(p.height_in / 12)}'${p.height_in % 12}"` : null) + row("Weight", p => p.weight_lb ? `${p.weight_lb} lb` : null) + row("Shoots", p => p.handedness))}
      ${group("Overall", row("OVR today", p => p.overall, { best: true }) + row("Potential", p => (p.ratings || {}).POTE, { best: true }))}
      ${group("Contract", row("Salary", p => p.salary, { money: true }) + row("Years left", p => p.contract_years, { best: true }) + row("Morale", p => p.morale, { best: true }))}
      ${group("This season", season)}
      ${group("Grades, as shown today", keys.map(k => row(ATTR_LABEL[k] || k, p => (p.ratings || {})[k], { best: true })).join(""))}
    </tbody></table></div>`;
}

views.compare = () => {
  const ps = basket().map(id => byId.get(id)).filter(Boolean);
  if (!ps.length) return `<h1>Compare</h1><div class="panel"><div class="empty">Nothing in the basket. Tick players on the <a href="#roster">Roster</a>, or use "Compare" on a player's page; they stay here across searches, up to ${BASKET_MAX}.</div></div>`;
  const shared = sharedKeys(ps), axes = axesState(ps);
  const mixed = ps.some(p => p.position === "G") && ps.some(p => p.position !== "G");
  return `<h1>Compare <span class="muted small">${ps.length} of ${BASKET_MAX}</span></h1>
  <div class="filters">
    ${ps.map((p, i) => `<span class="chip-p"><span class="sw" style="background:${seriesColor(i)}"></span><span>${esc(fullName(p))}</span><button type="button" class="x" data-unpick="${p.player_id}" aria-label="Remove ${esc(fullName(p))}">×</button></span>`).join("")}
    <button class="chip" type="button" data-unpick-all>Clear all</button>
    ${mixed ? `<span class="muted small">Skaters and goalies together: only the grades they share are compared.</span>` : ""}
  </div>
  <section class="cmp-viz">
    <div class="cmp-axes">
      <h2>Attributes on the chart <span class="muted small">(pick 3 to 8)</span></h2>
      <div class="axes">${shared.map(k => `<label><input type="checkbox" data-ax="${k}" ${axes.includes(k) ? "checked" : ""}> ${esc(ATTR_LABEL[k] || k)}</label>`).join("")}</div>
    </div>
    <div class="cmp-radar">${radar(ps, axes)}
      <ul class="legend">${ps.map((p, i) => `<li><span class="sw" style="background:${seriesColor(i)}"></span>${esc(fullName(p))}</li>`).join("")}</ul></div>
  </section>
  <section class="cmp-viz">
    <div><h2>Attribute by attribute</h2>${bars(ps, axes)}</div>
    <div><h2>Who wins</h2><p class="small muted">On the ${axes.length} attributes chosen above.</p>${whoWins(ps, axes)}</div>
  </section>
  <h2>Everything, side by side</h2>
  ${compareTable(ps)}`;
};
function bindCompare(root) {
  root.querySelectorAll("[data-unpick]").forEach(b => b.addEventListener("click", () => { togglePick(Number(b.dataset.unpick), false); render({ keepFocus: "h1" }); }));
  root.querySelector("[data-unpick-all]")?.addEventListener("click", () => { setBasket([]); render(); });
  root.querySelectorAll("[data-ax]").forEach(cb => cb.addEventListener("change", () => {
    const ps = basket().map(id => byId.get(id)).filter(Boolean);
    const on = [...root.querySelectorAll("[data-ax]:checked")].map(x => x.dataset.ax);
    if (on.length < 3 || on.length > 8) { cb.checked = !cb.checked; return; }
    setAxes(sharedKeys(ps).filter(k => on.includes(k)));
  }));
}

// ---------------------------------------------------------------- router
const scrollMemory = new Map();
let lastKey = null;
function render(opts = {}) {
  const raw = location.hash.slice(1) || "dashboard";
  const [path] = raw.split("?");
  const [route, arg] = path.split("/");
  const fn = views[route] || views.missing;
  if (lastKey && !opts.keepFocus) scrollMemory.set(lastKey, window.scrollY);
  const root = $("#view");
  root.innerHTML = fn(arg);
  document.querySelectorAll(".tabs a").forEach(a => a.dataset.route === route ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  if (route === "roster") bindRoster(root);
  if (route === "compare") bindCompare(root);
  if (route === "player") root.querySelector("[data-pick-one]")?.addEventListener("click", e => { const id = Number(e.currentTarget.dataset.pickOne); const on = !basket().includes(id); if (!togglePick(id, on)) { e.currentTarget.textContent = `Basket is full (${BASKET_MAX})`; return; } render({ keepFocus: "[data-pick-one]" }); });
  refreshBasketTab();
  if (opts.keepFocus) { const el = root.querySelector(opts.keepFocus); if (el) { el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); } }
  const titles = { dashboard: "Today", lines: "Lines", roster: "Roster", player: "Player", proposals: "Proposals", inbox: "Inbox", reports: "Reports", owed: "Owed", compare: "Compare", missing: "Not found" };
  document.title = `${titles[route] || "Front Office"} · Leafs Front Office`;
  const key = route === "roster" ? "roster" : route === "compare" ? "compare" : raw;
  if (!opts.keepFocus) {
    if (route === "inbox" && arg) document.getElementById(arg)?.scrollIntoView({ block: "start" });
    else if (opts.back && scrollMemory.has(key)) window.scrollTo(0, scrollMemory.get(key));
    else window.scrollTo(0, 0);
  }
  lastKey = key;
}

(async () => {
  $("#view").innerHTML = `<div class="panel"><div class="panel-b"><div class="skeleton" style="width:40%"></div><div class="skeleton" style="width:70%;margin-top:.6rem"></div><div class="skeleton" style="width:55%;margin-top:.6rem"></div></div></div>`;
  await icons();
  try { await load(); } catch (e) {
    $("#view").innerHTML = `<h1>Front Office</h1><div class="panel"><div class="empty">Could not load the data files (${esc(e.message)}). Run <code>./bin/nhl site export</code>, then reload.</div></div>`;
    return;
  }
  bindTheme(); bindFind();
  history.scrollRestoration = "manual";
  window.addEventListener("popstate", () => render({ back: true }));
  render();
})();
