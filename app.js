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
// The grade strip on every plate: the three grades that say most about a man in that job.
const STRIP = { F: ["ACCU", "SHPW", "SPEE"], D: ["CHKG", "PASS", "SPEE"], G: ["GSH_", "GSL_", "REBC"] };

const D = {};
let byId = new Map(), byTeam = new Map(), bySurname = new Map(), TOR = "TOR", teamByAbbr = new Map();

// ---------------------------------------------------------------- boot
async function load() {
  const names = ["meta", "teams", "players", "schedule", "recommendations", "reports", "inbox"];
  const res = await Promise.all(names.map(n => fetch(`data/${n}.json`).then(r => { if (!r.ok) throw new Error(`${n}.json ${r.status}`); return r.json(); })));
  names.forEach((n, i) => D[n] = res[i]);
  TOR = D.meta.team;
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
function face(p, eager = false) {
  const initials = (p.first_name?.[0] || "") + (p.last_name?.[0] || "");
  return p.portrait
    ? `<span class="plate-face"><img src="assets/${esc(p.portrait)}" alt="" ${eager ? "" : 'loading="lazy"'} width="36" height="36"></span>`
    : `<span class="plate-face" aria-hidden="true">${esc(initials)}</span>`;
}
function strip(p) {
  const keys = STRIP[p.position === "G" ? "G" : p.position === "D" ? "D" : "F"];
  const r = p.ratings || {};
  return keys.map(k => r[k] == null ? "" : `<span class="gr"><span class="gr-k">${esc(k.replace(/_/g, ""))}</span> <span class="gr-v ${r[k] >= 90 ? "g90" : r[k] >= 80 ? "g80" : ""}">${r[k]}</span></span>`).join("");
}
function plate(p, { size = "row", state = "", sub, side, note, eager = false, heading = false } = {}) {
  if (!p) return `<span class="plate plate--empty">empty</span>`;
  const status = [];
  if (state.includes("is-struck")) status.push("out of this slot");
  if (state.includes("is-proposed")) status.push("proposed");
  if (state.includes("is-selected")) status.push("flagged");
  const tags = (p.injury?.out ? `<span class="tag tag-out">out to ${esc(fmtDate(p.injury.return_date))}</span>` : "")
    + (!p.dressed ? `<span class="tag tag-out">scratched</span>` : "")
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
  return `<div class="board">${units.map((u, ui) => {
    return `<div class="unit"><div class="unit-label">${u[3]}</div><div class="slots" style="--n:${u[4].length}">${u[4].map(pos => {
      const p = slotPlayer(lines, u, pos);
      const hit = props.find(x => x.curP && p && x.curP.player_id === p.player_id && (!x.slot || slotMatches(x.slot, u, pos)));
      const note = hit ? `<b>${AGENT_LABEL[hit.agent]}</b> · ${esc(hit.reason_class || "")}${shortNotes ? "" : ": " + esc(hit.summary)}` : "";
      let html;
      if (hit && hit.proP && hit.proP.player_id !== p.player_id) html = plate(p, { size: "slot", state: "is-struck", eager: ui < 2 }) + plate(hit.proP, { size: "slot", state: "is-proposed", note });
      else if (hit) html = plate(p, { size: "slot", state: "is-selected", note, eager: ui < 2 });
      else html = plate(p, { size: "slot", eager: ui < 2 });
      return `<div class="slot"><span class="slot-pos">${POS_LABEL[pos] || pos}</span>${html}</div>`;
    }).join("")}</div></div>`;
  }).join("")}</div>`;
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
        <img src="assets/${esc(tor.logo_large)}" alt="">
        <div><div class="big">${tor.w}-${tor.l}-${tor.otl}</div><div class="muted small">${tor.pts} points · ${tor.gp} games · ${tor.gf} for, ${tor.ga} against
          <span class="form" role="img" aria-label="Last ten: ${recent.map(g => g.result).join(", ")}">${recent.map(g => `<i class="${g.result === "W" ? "w" : g.result === "OTL" ? "o" : "l"}" title="${esc(g.result)} ${g.gf}-${g.ga} ${g.at_home ? "vs" : "at"} ${esc(g.opponent)}"></i>`).join("")}</span></div></div>
      </div>
      ${nx ? `<div class="vs"><span class="muted">Next</span><img src="assets/${esc(opp?.logo_large || "")}" alt=""><div><div class="big">${nx.at_home ? "vs" : "at"} ${esc(nx.opponent)}</div><div class="muted small">${fmtDateLong(nx.game_date)} · they are ${nx.opp_w}-${nx.opp_l}-${nx.opp_otl}, last ten ${esc(nx.opp_last10 || "")}</div></div></div>` : ""}
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
const ROSTER_DEFAULT = { team: "", pos: "", tor: "1", sort: "points", dir: "-1", q: "" };
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
  if (replace) { history.replaceState(null, "", h); render({ keepFocus: "[data-q]" }); }
  else location.hash = h;
}
views.roster = () => {
  const s = rosterState();
  const goalieMode = s.pos === "G";
  const cols = goalieMode ? GOALIE_COLS : SKATER_COLS;
  const val = (p, k) => k in p ? p[k] : (p.ratings || {})[k];
  const dir = Number(s.dir);
  let rows = D.players.filter(p => (s.tor !== "1" || p.team === TOR) && (!s.team || p.team === s.team) && (!s.pos || p.position === s.pos) && (!s.q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(s.q.toLowerCase())));
  rows.sort((a, b) => { const x = val(a, s.sort), y = val(b, s.sort); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * dir || a.last_name.localeCompare(b.last_name); });
  const th = (k, label, cls = "") => `<th scope="col" class="${cls}" aria-sort="${s.sort === k ? (dir < 0 ? "descending" : "ascending") : "none"}"><button type="button" class="sort" data-sort="${k}" title="Sort by ${esc(label)}">${esc(label)}</button></th>`;
  const teams = D.teams.map(t => `<option value="${t.abbr}" ${s.team === t.abbr ? "selected" : ""}>${t.abbr} · ${esc(t.name.replace("®", ""))}</option>`).join("");
  const g = v => v == null ? "<td></td>" : `<td class="g ${v >= 90 ? "g90" : v >= 80 ? "g80" : v < 65 ? "g-lo" : ""}">${v}</td>`;
  const statCols = goalieMode
    ? [["gp", "GP"], ["wins", "W"], ["losses", "L"], ["gaa", "GAA"], ["sv_pct", "SV%"], ["morale", "Morale"], ["salary", "Salary"], ["contract_years", "Yrs"]]
    : [["gp", "GP"], ["goals", "G"], ["assists", "A"], ["points", "P"], ["mpg", "MPG"], ["fo_pct", "FO%"], ["morale", "Morale"], ["salary", "Salary"], ["contract_years", "Yrs"]];
  const ncols = 4 + statCols.length + cols.length;
  return `<h1>Roster</h1>
  <div class="filters">
    <button class="chip" type="button" data-tor aria-pressed="${s.tor === "1"}">Toronto only</button>
    <select data-team aria-label="Team"><option value="">All teams</option>${teams}</select>
    <select data-pos aria-label="Position"><option value="">All positions</option>${["C", "LW", "RW", "D", "G"].map(p => `<option ${s.pos === p ? "selected" : ""}>${p}</option>`).join("")}</select>
    <input data-q type="search" placeholder="Filter by name" value="${esc(s.q)}" aria-label="Filter by name">
    <span class="muted small" role="status">${rows.length} player${rows.length === 1 ? "" : "s"}</span>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr>${th("last_name", "Player", "l")}${th("position", "Pos")}${th("age", "Age")}${th("team", "Team")}${statCols.map(([k, l]) => th(k, l)).join("")}${cols.map(k => th(k, k.replace(/_/g, ""))).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map(p => `<tr>
      <td class="name l"><a href="#player/${p.player_id}">${face(p)}<span>${esc(p.first_name)} ${esc(p.last_name)}${p.rating_source === "full" ? ' <span class="tag tag-rev">revised</span>' : ""}${p.injury?.out ? ' <span class="tag tag-out">out</span>' : ""}</span></a></td>
      <td>${esc(p.position)}</td><td>${p.age ?? ""}</td><td>${esc(p.team)}</td>
      ${statCols.map(([k]) => `<td>${k === "salary" ? fmtMoney(p[k]) : (p[k] ?? "")}</td>`).join("")}
      ${cols.map(k => p.position === "G" && !goalieMode ? "<td></td>" : g((p.ratings || {})[k])).join("")}
    </tr>`).join("") : `<tr><td class="l" colspan="${ncols}"><div class="empty">No player matches. Clear a filter, or turn off Toronto only.</div></td></tr>`}</tbody>
  </table></div>`;
};
function bindRoster(root) {
  root.querySelector("[data-tor]")?.addEventListener("click", () => { const s = rosterState(); setRoster({ tor: s.tor === "1" ? "0" : "1", team: "" }); });
  root.querySelector("[data-team]")?.addEventListener("change", e => setRoster({ team: e.target.value, tor: "0" }));
  root.querySelector("[data-pos]")?.addEventListener("change", e => { const pos = e.target.value; setRoster({ pos, sort: pos === "G" ? "wins" : "points", dir: "-1" }); });
  root.querySelector("[data-q]")?.addEventListener("input", e => setRoster({ q: e.target.value }, { replace: true }));
  root.querySelectorAll("button.sort").forEach(b => b.addEventListener("click", () => { const s = rosterState(), k = b.dataset.sort; if (s.sort === k) setRoster({ dir: String(-Number(s.dir)) }); else setRoster({ sort: k, dir: ["last_name", "position", "team"].includes(k) ? "1" : "-1" }); }));
}

views.player = id => {
  const p = byId.get(Number(id));
  if (!p) return `<h1>Player</h1><div class="panel"><div class="empty">No such player.</div></div>`;
  const t = teamByAbbr.get(p.team);
  const keys = p.position === "G" ? D.meta.goalie_keys : D.meta.skater_keys;
  const r = p.ratings || {};
  const { about, passing } = mentions(p);
  const latestBy = new Map(); for (const n of about) if (!latestBy.has(n.agent)) latestBy.set(n.agent, n.date);
  const recent = about.filter(n => latestBy.get(n.agent) === n.date);
  const older = about.filter(n => latestBy.get(n.agent) !== n.date);
  const notes = about;
  const slotNames = p.slots.filter(s => !/^[HX]/.test(s.code)).map(s => ({ even_strength: "Line", power_play: "PP", penalty_kill: "PK", four_on_four: "4v4", five_on_three: "5v3", goalie: "G", shootout: "SO" }[s.unit] ?? s.unit) + (s.unit_no ?? "") + " " + (s.position || "")).join(" · ");
  return `
  <div class="panel">${plate(p, { size: "card", eager: true, heading: true, sub: `${esc(POS_LABEL[p.position] || p.position)} · ${p.age} · ${esc(t?.name.replace("®", "") || p.team)}${p.height_in ? ` · ${Math.floor(p.height_in / 12)}'${p.height_in % 12}"` : ""}${p.weight_lb ? ` · ${p.weight_lb} lb` : ""}${p.handedness ? ` · shoots ${esc(p.handedness)}` : ""}`, side: "" })}</div>
  <div class="grid-2" style="margin-top:1rem">
    <section>
      <h2>Grades <span class="muted small">${p.rating_source === "full" ? "revised on file" : "as shipped; not re-graded"}</span></h2>
      <div class="grades">${keys.map(k => r[k] == null ? "" : `<div class="grade"><span class="grade-k">${esc(k.replace(/_/g, ""))}</span><span class="grade-bar"><i class="${r[k] >= 85 ? "hi" : ""}" style="width:${Math.max(0, Math.min(100, (r[k] - 50) * 2))}%"></i></span><span class="grade-v">${r[k]}</span></div>`).join("")}</div>
      <p class="small muted" style="margin-top:.75rem">No overall rating is shown: the game does not store one, and how it derives the number it displays is not known.</p>
      <h2>This season</h2>
      <div class="facts">
        ${p.position === "G"
          ? `${fact(p.gp, "games")}${fact(`${p.wins ?? 0}-${p.losses ?? 0}`, "record")}${fact(p.gaa, "GAA")}${fact(p.sv_pct, "save %")}${fact(p.shutouts, "shutouts")}${fact(p.mpg, "min / game")}`
          : `${fact(p.gp, "games")}${fact(p.goals, "goals")}${fact(p.assists, "assists")}${fact(p.points, "points")}${fact(p.mpg, "min / game")}${fact(p.fo_pct != null ? p.fo_pct + "%" : null, "faceoffs")}${fact(p.pim, "PIM")}${fact(p.shots, "shots")}`}
      </div>
      <h2>Contract and status</h2>
      <div class="facts">
        ${fact(fmtMoney(p.salary), "salary")}${fact(p.contract_years, "years left")}${fact(p.morale, "morale")}${fact(p.is_rookie ? "yes" : "no", "rookie")}
        ${fact(p.dressed ? "dressed" : "scratched", "tonight")}${fact(p.injury ? (p.injury.out ? "out to " + fmtDate(p.injury.return_date) : "fit, back " + fmtDate(p.injury.return_date)) : "fit", "health")}
      </div>
      ${slotNames ? `<p class="small muted" style="margin-top:.75rem">Units: ${esc(slotNames)}</p>` : ""}
    </section>
    <section>
      <h2>Staff notes <span class="muted small">${notes.length ? `${notes.length} about him` : ""}</span></h2>
      <div class="panel divide">${recent.length ? recent.map(x => recHtml(x, { compact: true })).join("") : `<div class="empty">Nothing on file for him yet.</div>`}</div>
      ${older.length ? `<details class="more"><summary>${older.length} earlier note${older.length === 1 ? "" : "s"}</summary><div class="panel divide">${older.map(x => recHtml(x, { compact: true })).join("")}</div></details>` : ""}
      ${passing.length ? `<details class="more"><summary>Mentioned in ${passing.length} other note${passing.length === 1 ? "" : "s"}</summary><div class="panel divide">${passing.slice(0, 12).map(x => recHtml(x, { compact: true })).join("")}</div></details>` : ""}
    </section>
  </div>`;
};
const fact = (v, label) => `<div class="fact"><b>${v == null || v === "" ? NA : esc(v)}</b><span>${esc(label)}</span></div>`;

views.proposals = () => `<h1>Proposals</h1><p class="muted">Every recommendation the staff have filed, newest first. Line changes show the current plate struck and the proposed one beside it; trades show both sides. The latest run of each is open.</p>
  <div class="runs">${D.recommendations.length ? D.recommendations.map(run => runHtml(run, { collapsible: true, open: latestRuns().includes(run) })).join("") : `<div class="panel"><div class="empty">No proposals yet. They arrive with the next report.</div></div>`}</div>`;

function runHtml(run, { collapsible = false, open = true } = {}) {
  const items = run.recommendations || [];
  const head = `<b class="agent-${esc(run.agent)}">${AGENT_LABEL[run.agent] || run.agent}</b><span class="muted small">${fmtDateLong(run.in_game_date)} · ${items.length} item${items.length === 1 ? "" : "s"}</span>`;
  const body = `<div class="divide">${items.map(x => recHtml({ ...x, agent: run.agent })).join("")}</div>`;
  if (collapsible) return `<details class="panel run" ${open ? "open" : ""}><summary class="run-h">${head}</summary>${body}</details>`;
  return `<div><div class="run-h">${head}</div>${body}</div>`;
}
function recHtml(r, { compact = false } = {}) {
  let body = "";
  const isTrade = r.kind === "trade";
  if (compact) { /* on a player's own page the plates are redundant */ }
  else if (["line_change", "goalie", "ice_time", "trade"].includes(r.kind) || (r.current && r.proposed)) {
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
    return `<p class="small"><a href="#reports">All reports</a></p><h1 class="sr-only">${esc(r.title)}</h1><div class="panel"><div class="run-h"><b class="agent-${esc(r.agent)}">${AGENT_LABEL[r.agent]}</b><span class="muted small">${fmtDateLong(r.in_game_date)} · run ${r.run}</span></div><div class="prose">${md(r.markdown)}</div></div>`;
  }
  return `<h1>Reports</h1><ul class="list panel divide">${D.reports.map((r, i) => `<li><a href="#reports/${i}"><span><b class="agent-${esc(r.agent)}">${AGENT_LABEL[r.agent]}</b> · ${esc(r.title)}</span><span class="muted small">${fmtDateLong(r.in_game_date)}</span></a></li>`).join("") || `<li class="empty">No reports yet.</li>`}</ul>`;
};
views.missing = () => `<h1>Not found</h1><div class="panel"><div class="empty">There is no such page. <a href="#dashboard">Back to today</a>.</div></div>`;

// A small markdown renderer: headings, paragraphs, lists, tables, bold, italics, code, quotes.
function md(src) {
  const lines = src.replace(/\r/g, "").split("\n");
  let out = "", i = 0;
  const inline = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>").replace(/_([^_\n]+)_/g, "<i>$1</i>");
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
    hits = D.players.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)).sort((a, b) => (a.team === TOR ? -1 : 0) - (b.team === TOR ? -1 : 0) || a.last_name.localeCompare(b.last_name)).slice(0, 12);
    list.innerHTML = hits.length
      ? hits.map((p, i) => `<li role="option" id="opt-${i}" aria-selected="${i === sel}" data-i="${i}">${face(p)}<span><b>${esc(p.first_name)} ${esc(p.last_name)}</b> <span class="muted small">${esc(p.position)} · ${esc(p.team)} · ${p.age}</span></span></li>`).join("")
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
  if (opts.keepFocus) { const el = root.querySelector(opts.keepFocus); if (el) { el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); } }
  const titles = { dashboard: "Today", lines: "Lines", roster: "Roster", player: "Player", proposals: "Proposals", inbox: "Inbox", reports: "Reports", missing: "Not found" };
  document.title = `${titles[route] || "Front Office"} · Leafs Front Office`;
  const key = route === "roster" ? "roster" : raw;
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
