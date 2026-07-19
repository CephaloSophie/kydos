/* ===========================================================================
   Contrée — Mobile (HTML/TS vanilla). Surface 100% séparée du web.
   Navigation par tab bar, écrans rendus en vanilla JS, tokens partagés.
   =========================================================================== */
(() => {
  "use strict";

  /* ---- Identicon (même algo que TeamBadge web, source de vérité partagée) - */
  function hashName(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function identicon(name, size) {
    const h = hashName(name || ""), hue = h % 360, sat = 58 + ((h >> 9) % 18), lig = 52 + ((h >> 17) % 10);
    const fg = `hsl(${hue} ${sat}% ${lig}%)`, cell = size / 5;
    let r = "";
    for (let x = 0; x < 3; x++) for (let y = 0; y < 5; y++) {
      if ((h >> (x * 5 + y)) & 1) {
        const xs = x === 2 ? [2] : [x, 4 - x];
        for (const cx of xs) r += `<rect x="${cx * cell}" y="${y * cell}" width="${cell}" height="${cell}" rx="1.5" fill="${fg}"/>`;
      }
    }
    return `<svg class="identicon" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Clan ${name}">${r}</svg>`;
  }
  function teamHue(name) { return hashName(name) % 360; }

  /* ---- Icônes (line, stroke 2) -------------------------------------------- */
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 14 9-14 9V3Z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 0 12 0V4H6v5Z"/><path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 21h6M12 17v4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  };

  /* ---- Cartes ------------------------------------------------------------- */
  const SUIT = { hearts: ["♥", "red"], diamonds: ["♦", "red"], spades: ["♠", "black"], clubs: ["♣", "black"] };
  function card(rank, suit, w, opts = {}) {
    const [g, col] = SUIT[suit];
    const h = Math.round(w * 1.4);
    const cls = `pc ${col}${opts.playable ? " playable" : ""}`;
    return `<div class="${cls}" style="width:${w}px;height:${h}px">
      <span class="corner" style="font-size:${Math.round(w * 0.26)}px"><span>${rank}</span><span>${g}</span></span>
      <span class="pip" style="font-size:${Math.round(w * 0.5)}px">${g}</span></div>`;
  }
  function backCard(w, ml) {
    const h = Math.round(w * 1.4);
    return `<div class="pc back" style="width:${w}px;height:${h}px;margin-left:${ml}px"></div>`;
  }

  /* ---- Données simulées --------------------------------------------------- */
  const TEAM = { name: "Les Atouts", pts: 4820, rank: 1 };
  const LIVE = [
    { id: 214, a: "Les Atouts", b: "Capot City", round: "Manche 2/3", watchers: 7 },
    { id: 240, a: "Trèfle FC", b: "Capot City", round: "Manche 1/2", watchers: 12 },
    { id: 251, a: "Roi & Dame", b: "Belote Club", round: "Manche 3/3", watchers: 23 },
  ];
  let ROBOTS = [
    { id: 1, name: "Iznogoud", agr: 82, conc: 60, vel: 70, win: 73, active: true },
    { id: 2, name: "Roboubelot", agr: 40, conc: 85, vel: 50, win: 68, active: true },
    { id: 3, name: "Le Prudent", agr: 20, conc: 95, vel: 30, win: 61, active: false },
  ];
  const HAND = [["A", "hearts"], ["10", "hearts"], ["R", "spades"], ["9", "spades"], ["V", "clubs"], ["8", "diamonds"], ["7", "diamonds"]];

  /* ---- DOM refs ----------------------------------------------------------- */
  const $topbar = document.getElementById("topbar");
  const $content = document.getElementById("content");
  const $tabbar = document.getElementById("tabbar");
  const $overlay = document.getElementById("overlay-root");
  const $toasts = document.getElementById("toasts");

  const TABS = [
    { id: "home", label: "Accueil", icon: I.home },
    { id: "play", label: "Jouer", icon: I.play },
    { id: "watch", label: "Regarder", icon: I.eye },
    { id: "robots", label: "Robots", icon: I.bot },
    { id: "profile", label: "Profil", icon: I.user },
  ];

  let current = "home";

  /* ---- Status bar + topbar ------------------------------------------------ */
  function statusbar() {
    return `<div class="m-statusbar"><span>9:41</span><span class="right">5G ▪ ▰▰▰▱</span></div>`;
  }
  function topbar(title, opts = {}) {
    const left = opts.back
      ? `<button class="btn btn--ghost" style="height:36px;padding:0 6px" onclick="__nav('${opts.back}')">${I.back}</button>`
      : `<h1>Contr<span class="accent">é</span>e</h1>`;
    const right = opts.right || identicon(TEAM.name, 30);
    $topbar.innerHTML = statusbar() + `<div class="m-topbar__bar">${opts.back ? `${left}<h1 style="font-size:19px">${title}</h1><span style="width:36px"></span>` : `${left}${right}`}</div>`;
  }

  /* ---- Screens ------------------------------------------------------------ */
  const screens = {
    home() {
      topbar();
      const rail = LIVE.map((g, i) => gameCard(g, i)).join("");
      $content.innerHTML = `
        <div class="hero">
          ${identicon(TEAM.name, 64)}
          <div style="flex:1;min-width:0">
            <div class="between"><span class="t1" style="font-family:var(--font-display);font-weight:700;font-size:18px">${TEAM.name}</span><span class="badge badge--rank">#${TEAM.rank}</span></div>
            <div class="pts" style="margin-top:4px"><span class="big">${TEAM.pts.toLocaleString("fr-FR")}</span><span class="u">pts récompense</span></div>
          </div>
        </div>

        <div class="card between">
          <div><div class="lab" style="margin:0 0 4px">Reprendre</div><div class="t1" style="font-weight:600">Table #214 · Manche 2/3</div></div>
          <button class="btn btn--primary" onclick="__nav('play')">${I.play}</button>
        </div>

        <div>
          <div class="between" style="margin-bottom:10px"><span class="section-title">Parties en direct</span><span class="badge badge--spark"><span class="dot"></span>Live</span></div>
          <div class="m-cardrail">${rail}</div>
        </div>

        <div class="shortcuts">
          ${shortcut("play", I.play, "Jouer", "Partie rapide")}
          ${shortcut("watch", I.eye, "Regarder", "3 en direct")}
          ${shortcut("robots", I.bot, "Mes robots", "3 robots")}
          ${shortcut("team", I.trophy, "Mon équipe", "1er au classement")}
        </div>`;
    },

    play() {
      topbar("Partie", { right: `<button class="btn btn--ghost" style="height:36px" onclick="__sheet('quick')">Quitter</button>` });
      const seats = `
        <div class="seat north"><div class="chip">${identicon("Capot City", 22)}<b>Roboubelot <span class="bot">BOT</span></b></div>${backRow(6)}</div>
        <div class="seat west"><div class="chip">${identicon("Capot City", 22)}<b>Iznog. <span class="bot">BOT</span></b></div></div>
        <div class="seat east"><div class="chip">${identicon("Les Atouts", 22)}<b>Partenaire</b></div></div>
        <div class="seat south"><div class="chip active">${identicon("Les Atouts", 22)}<b>Vous</b></div></div>`;
      const trick = `
        <div class="trick north">${card("7", "hearts", 46)}</div>
        <div class="trick west">${card("9", "hearts", 46)}</div>`;
      const hand = HAND.map(([r, s]) => `<div onclick="__play(this)">${card(r, s, 56, { playable: true })}</div>`).join("");
      $content.style.padding = "0";
      $content.innerHTML = `
        <div class="m-layout-game" style="height:100%">
          <div class="m-score-band" style="position:static">
            <div class="team-mini">${identicon("Les Atouts", 26)}<b>1240</b></div>
            <span class="mono muted" style="font-size:12px">MANCHE 2/3 · →1500 · ♥</span>
            <div class="team-mini"><b>980</b>${identicon("Capot City", 26)}</div>
          </div>
          <div class="felt-portrait">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:120px;height:120px;border-radius:50%;border:1px dashed var(--felt-line)"></div>
            ${seats}${trick}
          </div>
          <div class="m-hand-drawer" id="drawer">${hand}</div>
        </div>`;
    },

    watch() {
      topbar("Regarder");
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      $content.innerHTML = `<div class="m-list">${LIVE.map((g, i) => gameCard(g, i, true)).join("")}</div>`;
    },

    robots() {
      topbar("Mes robots");
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      $content.innerHTML = `
        <p class="muted" style="font-size:13px;margin:0">Glissez une ligne vers la gauche pour supprimer, touchez pour éditer.</p>
        <div class="m-list" id="robotlist">${ROBOTS.map(robotRow).join("")}</div>`;
      const fab = document.createElement("button");
      fab.className = "m-fab"; fab.style.position = "absolute"; fab.innerHTML = I.plus;
      fab.onclick = () => __sheet("newbot");
      // FAB ancré dans le device
      const host = document.querySelector(".device .app-mobile");
      const old = host.querySelector(".m-fab"); if (old) old.remove();
      host.appendChild(fab);
      bindSwipe();
    },

    team() {
      topbar("Mon équipe", { back: "home" });
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      const members = ["Vous", "Marlène", "Tonio", "K. Belote"].map((m) =>
        `<div class="list-item"><div class="row">${identicon(m, 30)}<span class="t1" style="font-weight:600">${m}</span></div><span class="mono muted" style="font-size:12px">${(900 + hashName(m) % 800)} pts</span></div>`).join("");
      $content.innerHTML = `
        <div class="profile-head">
          ${identicon(TEAM.name, 96)}
          <div class="name">${TEAM.name}</div>
          <div class="row"><span class="badge badge--rank">#${TEAM.rank}</span><span class="badge badge--accent">${TEAM.pts.toLocaleString("fr-FR")} pts</span></div>
        </div>
        <div class="card"><div class="lab">Membres</div>${members}</div>
        <div class="card"><div class="lab">Dernières parties</div>
          <div class="list-item"><span class="t1">vs Capot City</span><span class="badge badge--accent">+240</span></div>
          <div class="list-item"><span class="t1">vs Trèfle FC</span><span class="badge" style="background:var(--error-ghost);color:var(--error)">−90</span></div>
          <div class="list-item"><span class="t1">vs Belote Club</span><span class="badge badge--accent">+180</span></div>
        </div>`;
    },

    profile() {
      topbar("Profil");
      $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
      $content.innerHTML = `
        <div class="profile-head">
          ${identicon("Vous", 80)}
          <div class="name">Vous</div>
          <div class="row" onclick="__nav('team')" style="cursor:pointer">${identicon(TEAM.name, 24)}<span class="muted">${TEAM.name} · #${TEAM.rank}</span></div>
        </div>
        <div class="card">
          <div class="lab">Timings</div>
          <div class="list-item"><span class="t1">Animations automatiques</span>${toggle(true)}</div>
          <div class="list-item"><span class="t1">Confirmer chaque carte</span>${toggle(false)}</div>
        </div>
        <div class="card">
          <div class="lab">Partie</div>
          <div class="field"><div class="between"><span class="t1">Manches par défaut</span></div>
            <div class="segment"><button>1</button><button class="on">2</button><button>4</button></div></div>
        </div>
        <button class="btn btn--danger btn--full btn--lg">Se déconnecter</button>`;
    },
  };

  /* ---- Fragments ---------------------------------------------------------- */
  function shortcut(nav, icon, title, sub) {
    return `<button class="shortcut" onclick="__nav('${nav}')">${icon}<div><span>${title}</span><br><small>${sub}</small></div></button>`;
  }
  function gameCard(g, i, full) {
    return `<div class="gcard" style="${full ? "" : "width:100%"}" onclick="__sheet('join', ${g.id})">
      <div class="between"><span class="badge badge--spark"><span class="dot"></span>Live · #${g.id}</span><span class="mono muted" style="font-size:12px">${g.watchers} 👁</span></div>
      <div class="teams">
        <div class="team-mini">${identicon(g.a, 30)}<b>${g.a}</b></div>
        <span class="vs">vs</span>
        <div class="team-mini"><b>${g.b}</b>${identicon(g.b, 30)}</div>
      </div>
      <div class="between"><span class="muted" style="font-size:13px">${g.round}</span><span class="muted" style="font-size:13px">Touchez pour rejoindre</span></div>
    </div>`;
  }
  function robotRow(r) {
    return `<div class="swipe-wrap" data-id="${r.id}">
      <div class="swipe-bg">Supprimer</div>
      <div class="swipe-row" data-row onclick="__sheet('editbot', ${r.id})">
        <div class="row">${identicon(r.name, 34)}
          <div><div class="t1" style="font-weight:600">${r.name} ${r.active ? "" : '<span class="muted" style="font-size:11px">· off</span>'}</div>
          <div class="mono muted" style="font-size:12px">${r.win}% réussite · agr ${r.agr}</div></div>
        </div>
        <span class="badge badge--accent">${r.win > 70 ? "Pro" : "Rookie"}</span>
      </div></div>`;
  }
  function toggle(on) {
    return `<span class="m-toggle" data-on="${on}" onclick="__toggle(this)" style="width:44px;height:26px;border-radius:999px;background:${on ? "var(--accent)" : "var(--bg-4)"};position:relative;display:inline-block;cursor:pointer">
      <span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:20px;height:20px;border-radius:50%;background:${on ? "var(--text-on-accent)" : "var(--text-1)"};transition:left .15s"></span></span>`;
  }
  function backRow(n) {
    let s = '<div style="display:flex;margin-top:4px">';
    for (let i = 0; i < Math.min(n, 5); i++) s += backCard(26, i ? -16 : 0);
    return s + "</div>";
  }

  /* ---- Tab bar ------------------------------------------------------------ */
  function renderTabs() {
    $tabbar.innerHTML = TABS.map((t) =>
      `<button class="m-tab" role="tab" aria-selected="${current === t.id}" onclick="__nav('${t.id}')">${t.icon}<span>${t.label}</span></button>`).join("");
  }

  /* ---- Navigation --------------------------------------------------------- */
  function nav(id) {
    current = id;
    $content.style.padding = "var(--sp-screen-y) var(--sp-screen-x)";
    const host = document.querySelector(".device .app-mobile");
    const fab = host.querySelector(".m-fab"); if (fab && id !== "robots") fab.remove();
    (screens[id] || screens.home)();
    renderTabs();
    $content.scrollTop = 0;
  }
  window.__nav = nav;

  /* ---- Sheets ------------------------------------------------------------- */
  const SHEETS = {
    join: (id) => `<div class="grip"></div>
      <div class="section-title" style="margin-bottom:14px">Table #${id}</div>
      <button class="btn btn--primary btn--full btn--lg" style="margin-bottom:10px" onclick="__closeSheet();__toast('Vous avez rejoint la table')">Rejoindre la partie</button>
      <button class="btn btn--full" onclick="__closeSheet();__nav('play')">Observer en spectateur</button>`,
    quick: () => `<div class="grip"></div>
      <div class="section-title" style="margin-bottom:14px">Quitter la partie ?</div>
      <button class="btn btn--danger btn--full btn--lg" style="margin-bottom:10px" onclick="__closeSheet();__nav('home')">Quitter</button>
      <button class="btn btn--full" onclick="__closeSheet()">Rester</button>`,
    newbot: () => botForm({ name: "Nouveau robot", agr: 50, conc: 50, vel: 50 }, true),
    editbot: (id) => botForm(ROBOTS.find((r) => r.id === id), false),
  };
  function botForm(r, isNew) {
    const slider = (key, label, v) => `<div class="field"><div class="between"><span class="t1">${label}</span><span id="v-${key}">${v}</span></div>
      <input class="m-range" type="range" min="0" max="100" value="${v}" oninput="document.getElementById('v-${key}').textContent=this.value"></div>`;
    return `<div class="grip"></div>
      <div class="between" style="margin-bottom:14px"><span class="section-title">${isNew ? "Nouveau robot" : r.name}</span>
        ${isNew ? "" : '<span class="badge badge--accent">' + r.win + '%</span>'}</div>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${slider("agr", "Agressivité", r.agr)}
        ${slider("conc", "Concentration", r.conc)}
        ${slider("vel", "Vélocité", r.vel)}
      </div>
      <button class="btn btn--primary btn--full btn--lg" style="margin-top:18px" onclick="__closeSheet();__toast('${isNew ? "Robot créé" : "Robot enregistré"}')">${isNew ? "Créer le robot" : "Enregistrer"}</button>`;
  }
  function openSheet(kind, arg) {
    $overlay.innerHTML = `<div class="scrim m-anim-scrim-in" onclick="__closeSheet()"></div><div class="sheet m-anim-sheet-in">${SHEETS[kind](arg)}</div>`;
  }
  function closeSheet() { $overlay.innerHTML = ""; }
  window.__sheet = openSheet;
  window.__closeSheet = closeSheet;

  /* ---- Toast -------------------------------------------------------------- */
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast m-anim-toast-in";
    el.innerHTML = `<span style="color:var(--spark)">●</span><b>${msg}</b>`;
    $toasts.appendChild(el);
    setTimeout(() => { el.classList.add("m-anim-toast-out"); setTimeout(() => el.remove(), 250); }, 2200);
  }
  window.__toast = toast;

  /* ---- Interactions ------------------------------------------------------- */
  window.__play = (el) => {
    el.style.transition = "transform .18s var(--ease-out), opacity .18s";
    el.style.transform = "translateY(-40px)"; el.style.opacity = "0";
    setTimeout(() => { el.remove(); toast("Carte jouée"); }, 160);
  };
  window.__toggle = (el) => {
    const on = el.dataset.on === "true"; el.dataset.on = String(!on);
    const knob = el.firstElementChild;
    el.style.background = !on ? "var(--accent)" : "var(--bg-4)";
    knob.style.left = !on ? "21px" : "3px";
    knob.style.background = !on ? "var(--text-on-accent)" : "var(--text-1)";
  };

  /* ---- Swipe-to-delete ---------------------------------------------------- */
  function bindSwipe() {
    document.querySelectorAll(".swipe-wrap").forEach((wrap) => {
      const row = wrap.querySelector("[data-row]");
      let startX = 0, dx = 0, open = false;
      const onDown = (e) => { startX = (e.touches ? e.touches[0].clientX : e.clientX); row.style.transition = "none"; };
      const onMove = (e) => {
        if (!startX) return;
        dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
        dx = Math.max(-96, Math.min(0, dx + (open ? -96 : 0)));
        row.style.transform = `translateX(${dx}px)`;
      };
      const onUp = () => {
        row.style.transition = "transform .2s var(--ease-out)";
        open = dx < -48;
        row.style.transform = `translateX(${open ? -96 : 0}px)`;
        startX = 0;
        if (open) {
          const bg = wrap.querySelector(".swipe-bg");
          bg.onclick = () => { wrap.style.transition = "opacity .2s,transform .2s"; wrap.style.opacity = "0"; wrap.style.transform = "translateX(-100%)"; setTimeout(() => { wrap.remove(); toast("Robot supprimé"); }, 200); };
        }
      };
      row.addEventListener("touchstart", onDown); row.addEventListener("touchmove", onMove); row.addEventListener("touchend", onUp);
      row.addEventListener("mousedown", (e) => { onDown(e); const mm = (ev) => onMove(ev); const mu = () => { onUp(); document.removeEventListener("mousemove", mm); document.removeEventListener("mouseup", mu); }; document.addEventListener("mousemove", mm); document.addEventListener("mouseup", mu); });
    });
  }

  /* ---- Boot --------------------------------------------------------------- */
  nav("home");
})();
