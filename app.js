/* TMG Command Sheet — unofficial play aid for the StarCraft Tabletop Miniatures Game. */
(function () {
  'use strict';

  var VERSION = '1.4.3';
  var DATA = window.TMG_DATA;
  var root = document.getElementById('app');

  /* ---------- storage ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var KEY_ARMIES = 'tmg-armies', KEY_SEEDED = 'tmg-seeded';
  var armies = store.get(KEY_ARMIES, []);

  function uid() { return Math.random().toString(36).slice(2, 9); }
  function now() { return Date.now(); }
  function saveArmies() { store.set(KEY_ARMIES, armies); }
  function findArmy(id) { for (var i = 0; i < armies.length; i++) { if (armies[i].id === id) { return armies[i]; } } return null; }

  /* ---------- optional sound pack (kept on this device only; the app ships no audio) ----------
   * Pack file: JSON { name, sounds: { "<key>": ["data:audio/...;base64,...", ...] } }
   * Keys: death:<unitId> · destroyed:<unitId> · select:<unitId> · card:<cardId> · ability:<unitId> · ability:<unitId>:<abilityName>
   * A variant like "Raptor (Zergling)" falls back to the Zergling's sounds. */
  var SND = { name: '', sounds: {}, images: {}, art: {}, cache: {}, on: store.get('tmg-sound-on', true), busy: false };
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('no-idb')); return; }
      var rq = indexedDB.open('tmg-sounds', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('pack'); };
      rq.onerror = function () { rej(rq.error); };
      rq.onsuccess = function () {
        var db = rq.result, tx = db.transaction('pack', mode), st = tx.objectStore('pack'), out = fn(st);
        tx.oncomplete = function () { db.close(); res(out && out.result); };
        tx.onerror = function () { db.close(); rej(tx.error); };
      };
    });
  }
  function soundsLoaded() { return Object.keys(SND.sounds).length > 0 || Object.keys(SND.images || {}).length > 0; }
  function setPack(p) {
    Object.keys(SND.art || {}).forEach(function (k) { try { URL.revokeObjectURL(SND.art[k]); } catch (e) {} });
    SND.name = (p && p.name) || ''; SND.sounds = (p && p.sounds) || {}; SND.images = (p && p.images) || {}; SND.cache = {}; SND.art = {};
  }
  /* Portraits and icons from the pack: key portrait:<unitId> or icon:<cardId>. Data URLs become blob URLs once. */
  function artUrl(keys) {
    var im = SND.images || {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]; if (!k || !im[k]) { continue; }
      if (!SND.art[k]) {
        try {
          var m = /^data:([^;]+);base64,(.*)$/.exec(im[k]), bin = atob(m[2]), u8 = new Uint8Array(bin.length);
          for (var j = 0; j < bin.length; j++) { u8[j] = bin.charCodeAt(j); }
          SND.art[k] = URL.createObjectURL(new Blob([u8], { type: m[1] }));
        } catch (e) { SND.art[k] = im[k]; }
      }
      return SND.art[k];
    }
    return null;
  }
  function unitArt(f, def) { var b = baseUnitId(f, def); return artUrl(['portrait:' + def.id, b ? 'portrait:' + b : null]); }
  function cardArt(c) { return artUrl(['icon:' + c.id]); }
  idb('readonly', function (st) { return st.get('pack'); }).then(function (p) { if (p) { setPack(p); render(); } }).catch(function () {});
  function loadPackFile(file) {
    SND.busy = true; render();
    file.text().then(function (txt) {
      var p = JSON.parse(txt);
      if (!p || typeof p.sounds !== 'object') { throw new Error('bad'); }
      p.images = p.images && typeof p.images === 'object' ? p.images : {};
      Object.keys(p.sounds).forEach(function (k) { if (!Array.isArray(p.sounds[k])) { p.sounds[k] = [p.sounds[k]]; } });
      return idb('readwrite', function (st) { return st.put(p, 'pack'); }).then(function () { return p; });
    }).then(function (p) {
      setPack(p); SND.busy = false; toast('Pack loaded: ' + Object.keys(p.sounds).length + ' sounds' + (Object.keys(p.images).length ? ', ' + Object.keys(p.images).length + ' portraits and icons' : ''));
    }).catch(function () { SND.busy = false; toast('That file isn\'t a TMG sound pack.'); });
  }
  function removePack() { idb('readwrite', function (st) { return st.delete('pack'); }).catch(function () {}); setPack(null); toast('Sound pack removed'); }
  function playKeyed(keys) {
    if (!SND.on || !soundsLoaded()) { return false; }
    for (var i = 0; i < keys.length; i++) {
      var list = SND.sounds[keys[i]];
      if (list && list.length) {
        var j = Math.floor(Math.random() * list.length), ck = keys[i] + '#' + j;
        var au = SND.cache[ck] || (SND.cache[ck] = new Audio(list[j]));
        try { au.currentTime = 0; var pr = au.play(); if (pr && pr.catch) { pr.catch(function () {}); } } catch (e) {}
        return true;
      }
    }
    return false;
  }
  function baseUnitId(f, def) {
    var m = /\(([^)]+)\)\s*$/.exec(def.name || ''); if (!m) { return null; }
    var n = norm(m[1]), hit = f.units.filter(function (u) { return norm(u.name) === n; })[0];
    return hit ? hit.id : null;
  }
  function soundDeath(f, def, destroyed) {
    var b = baseUnitId(f, def), keys = [];
    if (destroyed) { keys.push('destroyed:' + def.id); if (b) { keys.push('destroyed:' + b); } }
    keys.push('death:' + def.id); if (b) { keys.push('death:' + b); }
    playKeyed(keys);
  }
  function soundAbility(f, def, abName) {
    var b = baseUnitId(f, def), n = norm(abName);
    playKeyed(['ability:' + def.id + ':' + n, 'ability:' + def.id].concat(b ? ['ability:' + b + ':' + n, 'ability:' + b] : []));
  }

  function U(unit, models, upgrades) { return { uid: uid(), unit: unit, models: models, upgrades: upgrades || [] }; }
  if (!store.get(KEY_SEEDED, false)) {
    armies.push({
      id: uid(), name: 'Zerg Swarm 2000 (example)', faction: 'zerg', factionCard: 'zerg-swarm', created: now(), updated: now(),
      cards: ['six-pool', 'cocoon', 'overlord', 'lair', 'hydralisk-den', 'overseer', 'reactive-creep'],
      units: [U('corpser', 3, ['hydriodic-bile']), U('ravager', 2), U('roachling', 3), U('hydralisk', 4, ['lurking', 'grooved-spines']),
        U('hydralisk', 4, ['lurking', 'grooved-spines']), U('zergling', 18, ['adrenal-glands', 'shredding-claws']), U('queen', 1),
        U('zergling', 12, ['shredding-claws']), U('queen', 1), U('corpser', 3)]
    });
    armies.push({
      id: uid(), name: 'Kerrigan\'s Swarm 1000 (example)', faction: 'zerg', factionCard: 'kerrigans-swarm', created: now(), updated: now(),
      cards: ['hydralisk-den', 'malignant-creep', 'roach-warren', 'accelerating-creep', 'lair'],
      units: [U('hydralisk', 2), U('kerrigan', 1), U('ks-raptor', 6), U('queen', 1), U('omega-worm', 1), U('swarmling', 18)]
    });
    saveArmies();
    store.set(KEY_SEEDED, true);
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fac(a) { return DATA.factions[a.faction]; }
  function unitDef(f, id) { for (var i = 0; i < f.units.length; i++) { if (f.units[i].id === id) { return f.units[i]; } } return null; }
  function cardDef(f, id) { for (var i = 0; i < f.cards.length; i++) { if (f.cards[i].id === id) { return f.cards[i]; } } return null; }
  function shortName(def) { return def.name.replace(/\s*\(.*\)$/, ''); }
  function plural(s) { return /s$/.test(s) ? s : s + 's'; }
  function minModels(def) { return def.brackets[0][0]; }
  function maxModels(def) { return def.brackets[def.brackets.length - 1][1]; }
  function supplyFor(def, n) {
    for (var i = 0; i < def.brackets.length; i++) { var b = def.brackets[i]; if (n >= b[0] && n <= b[1]) { return b[2]; } }
    return 0;
  }
  function cardShort(c) { return c.short || c.name; }
  function resCode(a) { var f = fac(a); return (f && f.resource && f.resource.code) || 'BM'; }
  function unitHp(def, ups) { var hp = def.hp; (def.upgrades || []).forEach(function (u) { if (ups && ups.indexOf(u.id) !== -1 && u.hpMod) { hp += u.hpMod; } }); return hp; }
  /* Shields add to the first model's HP. Models: all alive until damage reaches hp + shield, then hp each. */
  function unitMax(def, ups, models) { return unitHp(def, ups) * models + (def.shield || 0); }
  function healthOf(def, ups, models, dmg) {
    var hpv = unitHp(def, ups), sh = def.shield || 0, max = hpv * models + sh, d = Math.min(dmg || 0, max), rem = max - d;
    var body = hpv * models - Math.max(0, d - sh);
    return { hpv: hpv, sh: sh, max: max, d: d, rem: rem, shLeft: Math.max(0, sh - d), shielded: sh > 0 && d <= sh, body: body, alive: Math.min(models, Math.ceil(body / hpv)) };
  }
  function factionTag(a) { var fc = cardDef(fac(a), a.factionCard); return fc ? (fc.tag || null) : null; }

  function encodeArmy(a) {
    var o = { v: 1, n: a.name, f: a.faction, fc: a.factionCard, c: a.cards, u: a.units.map(function (s) { return [s.unit, s.models, s.upgrades]; }) };
    var b = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeArmy(code) {
    try {
      var b = code.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) { b += '='; }
      var o = JSON.parse(decodeURIComponent(escape(atob(b))));
      if (!o || !DATA.factions[o.f]) { return null; }
      return {
        id: uid(), name: String(o.n || 'Imported army').slice(0, 80), faction: o.f, factionCard: o.fc, created: now(), updated: now(),
        cards: (o.c || []).filter(function (id) { return !!cardDef(DATA.factions[o.f], id); }),
        units: (o.u || []).filter(function (x) { return unitDef(DATA.factions[o.f], x[0]); }).map(function (x) {
          return U(x[0], Math.max(1, parseInt(x[1], 10) || 1), Array.isArray(x[2]) ? x[2] : []);
        })
      };
    } catch (e) { return null; }
  }

  /* ---------- Command Center seed import (unofficial, read-only) ---------- */
  var SEED_URL = 'https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/shared_rosters/';
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function fsVal(v) {
    if (!v || typeof v !== 'object') { return v; }
    if ('stringValue' in v) { return v.stringValue; }
    if ('integerValue' in v) { return Number(v.integerValue); }
    if ('doubleValue' in v) { return v.doubleValue; }
    if ('booleanValue' in v) { return v.booleanValue; }
    if ('nullValue' in v) { return null; }
    if ('timestampValue' in v) { return v.timestampValue; }
    if ('arrayValue' in v) { return (v.arrayValue.values || []).map(fsVal); }
    if ('mapValue' in v) { var o = {}, f = v.mapValue.fields || {}; for (var k in f) { o[k] = fsVal(f[k]); } return o; }
    return null;
  }
  function fetchSeed(seed) {
    return fetch(SEED_URL + encodeURIComponent(seed), { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) { throw { kind: 'notfound' }; }
      if (!r.ok) { throw { kind: 'http', status: r.status }; }
      return r.json();
    }, function () { throw { kind: 'network' }; }).then(function (j) {
      var o = {}, f = j.fields || {}; for (var k in f) { o[k] = fsVal(f[k]); }
      if (!o.state) { throw { kind: 'empty' }; }
      return o.state;
    });
  }
  function armyFromSeed(seed, s) {
    var fkey = norm(s.faction), f = DATA.factions[fkey];
    if (!f) { throw { kind: 'faction', name: s.faction || 'That faction' }; }
    var skipped = [];
    function findUnit(u) {
      var a = norm(u.id), b = norm(u.name), strip = function (x) { return norm(String(x || '').replace(/\(.*?\)/g, '')); };
      for (var i = 0; i < f.units.length; i++) { var d = f.units[i]; if (norm(d.id) === a || norm(d.name) === a || norm(d.name) === b) { return d; } }
      for (var j = 0; j < f.units.length; j++) { var e = f.units[j]; if (strip(e.name) === strip(u.name) || strip(e.name) === a) { return e; } }
      return null;
    }
    function findCard(id) {
      var n = norm(id); if (!n) { return null; }
      for (var i = 0; i < f.cards.length; i++) { var c = f.cards[i]; if (norm(c.id) === n || norm(c.name) === n || (c.short && norm(c.short) === n)) { return c; } }
      return null;
    }
    var units = (s.roster || []).map(function (u) {
      var d = findUnit(u);
      if (!d) { skipped.push(u.name || u.id); return null; }
      var names = (u.activeUpgrades || []).map(function (x) {
        if (typeof x === 'number') { var au = (u.availableUpgrades || [])[x]; return au ? au.name : null; }
        return x && x.name ? x.name : x;
      }).filter(Boolean);
      var ups = d.upgrades.filter(function (up) { return names.some(function (n) { return norm(n) === norm(up.name); }); }).map(function (up) { return up.id; });
      var n = parseInt(u.models, 10) || minModels(d);
      return U(d.id, Math.max(minModels(d), Math.min(maxModels(d), n)), ups);
    }).filter(Boolean);
    var fc = findCard(s.factionCardId);
    if (!fc || fc.type !== 'faction') { skipped.push('faction card ' + (s.factionCardId || '?')); fc = f.cards.filter(function (c) { return c.type === 'faction'; })[0]; }
    var cards = [];
    (s.tacticalCardIds || []).forEach(function (id) {
      var c = findCard(id);
      if (!c) { skipped.push(String(id).replace(/_+/g, ' ').trim()); } else if (cards.indexOf(c.id) === -1) { cards.push(c.id); }
    });
    return {
      name: fc.name + ' ' + (s.mineralsUsed || '') + ' · ' + seed, faction: fkey, factionCard: fc.id, cards: cards, units: units,
      seed: seed, imported: now(), skipped: skipped,
      minerals: s.mineralsUsed != null ? { used: s.mineralsUsed, limit: s.mineralsLimit } : null,
      gas: s.gasUsed != null ? { used: s.gasUsed, limit: s.gasLimit } : null
    };
  }
  function seedError(e) {
    if (e && e.kind === 'notfound') { return 'No army was found with that seed. Check the code and try again.'; }
    if (e && e.kind === 'network') { return 'Couldn\'t reach the Command Center. Check your signal and try again.'; }
    if (e && e.kind === 'faction') { return e.name + ' isn\'t in the app yet. Only Zerg can be loaded for now.'; }
    return 'That seed couldn\'t be loaded. The Command Center may have changed how it stores armies.';
  }
  function loadSeedInto(seed, existing) {
    ui.seedBusy = true; ui.seedMsg = ''; render();
    fetchSeed(seed).then(function (state) {
      var imp = armyFromSeed(seed, state);
      ui.seedBusy = false; ui.seedValue = '';
      if (existing) {
        ['faction', 'factionCard', 'cards', 'units', 'seed', 'imported', 'skipped', 'minerals', 'gas'].forEach(function (k) { existing[k] = imp[k]; });
        existing.updated = now(); saveArmies(); store.del(playKey(existing));
        toast('Updated from seed ' + seed); render();
      } else {
        imp.id = uid(); imp.created = imp.updated = now();
        armies.push(imp); saveArmies();
        go('#/edit/' + imp.id); toast('Loaded seed ' + seed);
      }
    }).catch(function (e) { ui.seedBusy = false; ui.seedMsg = seedError(e); render(); });
  }

  /* squads with display names */
  function squadsOf(a) {
    var f = fac(a), counts = {}, seen = {};
    a.units.forEach(function (s) { counts[s.unit] = (counts[s.unit] || 0) + 1; });
    return a.units.map(function (s) {
      var def = unitDef(f, s.unit);
      seen[s.unit] = (seen[s.unit] || 0) + 1;
      var base = maxModels(def) > 1 || counts[s.unit] > 1 ? plural(shortName(def)) : shortName(def);
      var letter = counts[s.unit] > 1 ? ' ' + String.fromCharCode(64 + seen[s.unit]) : '';
      return { s: s, def: def, name: base + letter, typeCount: counts[s.unit] };
    });
  }

  function armyWarnings(a) {
    var f = fac(a), out = [], tag = factionTag(a), fcName = (cardDef(f, a.factionCard) || {}).name;
    var uniq = {};
    squadsOf(a).forEach(function (q) {
      if (q.def.tag && q.def.tag !== tag) { out.push(q.def.name + ' is tagged ' + q.def.tag + ', but your faction card is ' + fcName + '.'); }
      if (q.def.unique) { uniq[q.def.id] = (uniq[q.def.id] || 0) + 1; if (uniq[q.def.id] === 2) { out.push(q.def.name + ' is Unique but appears more than once.'); } }
    });
    var ids = squadsOf(a).map(function (q) { return q.def.id; }), shown = {};
    squadsOf(a).forEach(function (q) {
      (q.def.excludes || []).forEach(function (x) {
        if (ids.indexOf(x) !== -1 && !shown[x + q.def.id]) { shown[q.def.id + x] = true; out.push(q.def.name + ' and ' + unitDef(f, x).name + ' can\'t be in the same army.'); }
      });
    });
    var creep = 0;
    a.cards.forEach(function (id) {
      var c = cardDef(f, id); if (!c) { return; }
      if (c.type === 'creep') { creep++; }
      if (c.tag && c.tag !== tag) { out.push(c.name + ' is tagged ' + c.tag + ', but your faction card is ' + fcName + '.'); }
    });
    if (f.creepRule && creep !== 1) { out.push('Zerg Creep: the faction card asks for exactly one Creep card (you have ' + creep + ').'); }
    return out;
  }
  function armyTotals(a) {
    var f = fac(a), supply = 0, models = 0, bm = 0;
    a.units.forEach(function (s) { var d = unitDef(f, s.unit); supply += supplyFor(d, s.models); models += s.models; });
    var fc = cardDef(f, a.factionCard); if (fc) { bm += fc.bm || 0; }
    a.cards.forEach(function (id) { var c = cardDef(f, id); if (c) { bm += c.bm || 0; } });
    return { supply: supply, models: models, units: a.units.length, bm: bm };
  }

  /* ---------- routing ---------- */
  var ui = { focus: 'all', pending: null, adding: false, confirmDelete: false, toast: '', toastTimer: null, lastRoute: '' };
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    return { name: parts[0] || 'home', id: parts.slice(1).join('/') };
  }
  function go(hash) { location.hash = hash; }
  window.addEventListener('hashchange', function () { ui.pending = null; ui.adding = false; ui.confirmDelete = false; ui.focus = 'all'; ui.seedMsg = ''; render(true); });

  function toast(msg) {
    ui.toast = msg; render();
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(function () { ui.toast = ''; render(); }, 2600);
  }

  /* ---------- faction themes ---------- */
  var FACTION_ORDER = ['terran', 'zerg', 'protoss'];
  var FACTION_NAMES = { terran: 'Terran', zerg: 'Zerg', protoss: 'Protoss' };
  var THEME_FALLBACK = {
    terran: { ground: '#0F1317', accent: '#F28C28', accentRgb: '242,140,40', accentSoft: '#F7B26B', upg: '#F6D2A8', card: '#F6D2A8', panelSolid: '#1A2027', toastBg: '#26303A', blurb: 'Infantry, armour and orders' },
    zerg: { ground: '#140E1B', accent: '#B98CF0', accentRgb: '185,140,240', accentSoft: '#CDB2F5', upg: '#D9C7F2', card: '#D9C7F2', panelSolid: '#1C1426', toastBg: '#2A1F38', blurb: 'Swarm, creep and Biomass' },
    protoss: { ground: '#0B1322', accent: '#EBC04F', accentRgb: '235,192,79', accentSoft: '#F2D488', upg: '#A9D1FF', card: '#A9D1FF', panelSolid: '#121D31', toastBg: '#1B2944', blurb: 'Shields, psionics and warp' }
  };
  function themeFor(k) { var f = DATA.factions[k]; return (f && f.theme) || THEME_FALLBACK[k] || THEME_FALLBACK.zerg; }
  var currentTheme = null;
  function applyTheme(k) {
    if (currentTheme === k) { return; }
    currentTheme = k;
    var t = themeFor(k), s = document.documentElement.style;
    s.setProperty('--ground', t.ground); s.setProperty('--accent', t.accent); s.setProperty('--accent-rgb', t.accentRgb);
    s.setProperty('--accent-soft', t.accentSoft); s.setProperty('--upg', t.upg); s.setProperty('--card', t.card);
    s.setProperty('--panel-solid', t.panelSolid); s.setProperty('--toast-bg', t.toastBg);
    document.documentElement.setAttribute('data-faction', k);
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) { meta.setAttribute('content', t.ground); }
  }

  /* ---------- render ---------- */
  function render(routeChanged) {
    var r = route();
    var ra = (r.name === 'play' || r.name === 'edit') ? findArmy(r.id) : null;
    applyTheme(ra ? ra.faction : 'zerg');
    var keepScroll = !routeChanged && ui.lastRoute === r.name + '/' + r.id;
    var winY = window.scrollY;
    var rp = root.querySelector('.rpane'), pp = root.querySelector('.ppane');
    var rpY = rp ? rp.scrollTop : 0, ppY = pp ? pp.scrollTop : 0;

    var html;
    if (r.name === 'play') { html = viewPlay(findArmy(r.id)); }
    else if (r.name === 'edit') { html = viewEdit(findArmy(r.id)); }
    else if (r.name === 'import') { html = viewImport(r.id); }
    else if (r.name === 'about') { html = viewAbout(); }
    else { html = viewHome(); }
    if (ui.toast) { html += '<div class="toast" role="status">' + esc(ui.toast) + '</div>'; }

    root.className = 'app' + (r.name === 'play' ? ' play' : '');
    root.innerHTML = html;
    ui.lastRoute = r.name + '/' + r.id;

    if (keepScroll) {
      window.scrollTo(0, winY);
      rp = root.querySelector('.rpane'); pp = root.querySelector('.ppane');
      if (rp) { rp.scrollTop = rpY; } if (pp) { pp.scrollTop = ppY; }
    } else { window.scrollTo(0, 0); }
    if (routeChanged && r.name === 'about' && r.id === 'sounds') { var sc = document.getElementById('sounds'); if (sc) { sc.scrollIntoView({ block: 'start' }); } }
  }

  var ICON = {
    move: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l6 6-6 6"/><path d="M13 6l6 6-6 6"/></svg>',
    assault: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></svg>',
    combat: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11 11M15 15l-2 2M15 15l2-2M16 16l4 4"/><path d="M20 4L9 15M9 15l2 2M9 15l-2-2M8 16l-4 4"/></svg>',
    score: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    any: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/></svg>',
    list: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    cards: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="3" width="11" height="15"/><path d="M9 21h10V7"/></svg>',
    back: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
  };

  function secHead(icon, kicker, title, sub, right) {
    return '<div class="sechead"><span class="ico">' + icon + '</span><div class="t"><span class="kicker">' + esc(kicker) + '</span><h2>' + esc(title) + '</h2>' +
      (sub ? '<span class="muted" style="font-size:12px">' + esc(sub) + '</span>' : '') + '</div>' + (right || '') + '</div>';
  }

  /* ---------- home ---------- */
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; render(); });

  function viewHome() {
    var h = '<div class="inner">';
    h += '<div class="topbar"><div class="titleblock"><span class="kicker">Unofficial play aid · StarCraft TMG</span><h1>TMG Command Sheet</h1></div>' +
      '<div class="row">' + (installEvt ? '<button class="btn soft" data-act="install">Install app</button>' : '') +
      '<a class="btn" href="#/about/sounds">' + (soundsLoaded() ? (SND.on ? '🔊 Sounds' : '🔇 Sounds') : 'Sounds') + '</a><a class="btn" href="#/about">About</a></div></div>';
    h += '<p class="muted" style="font-size:14px;line-height:1.5;max-width:720px">Build an army from your Command Center roster, then play from one screen: abilities and weapons sorted by phase, health and model counts, exhausted cards and your BM pool.</p>';
    h += '<div class="row" style="align-items:stretch"><button class="btn primary" data-act="new" aria-expanded="' + !!ui.pickFaction + '">New army</button>' +
      '<form class="row" data-form="seed" style="gap:8px;flex-wrap:nowrap" autocomplete="off">' +
      '<label for="seedInput" class="label" style="position:absolute;left:-9999px">Command Center seed</label>' +
      '<input id="seedInput" class="text" data-in="seed" value="' + esc(ui.seedValue || '') + '" placeholder="SEED ID" maxlength="10" autocapitalize="characters" spellcheck="false" style="width:130px;text-transform:uppercase;font-family:var(--mono);letter-spacing:.1em">' +
      '<button class="btn soft" type="submit"' + (ui.seedBusy ? ' disabled' : '') + '>' + (ui.seedBusy ? 'Loading…' : 'Load from seed') + '</button></form></div>';
    h += '<p class="muted" style="font-size:12px;line-height:1.5;max-width:720px">Saved an army to the cloud in the Command Center? Enter its seed to bring it in with units, model counts, upgrades and cards.</p>';
    if (ui.seedMsg) { h += '<p class="warn" role="alert">' + esc(ui.seedMsg) + '</p>'; }
    if (ui.pickFaction) {
      h += '<div class="card plain stack"><div class="row" style="justify-content:space-between"><h3>Pick a faction</h3><button class="btn small" data-act="cancel-new">Cancel</button></div><div class="picker">';
      FACTION_ORDER.forEach(function (k) {
        var f = DATA.factions[k], th = themeFor(k), ready = !!f;
        h += '<button class="pick" data-act="new-faction" data-faction="' + k + '"' + (ready ? '' : ' disabled') +
          ' style="background:' + th.ground + ';border-color:' + th.accent + ';border-top-width:3px">' +
          '<span class="n" style="color:' + th.accent + '">' + esc(FACTION_NAMES[k]) + '</span>' +
          '<span class="d">' + (ready ? esc(th.blurb || '') : 'Coming soon') + '</span></button>';
      });
      h += '</div></div>';
    }
    if (!armies.length) {
      h += '<p class="empty">No armies yet. Tap New army to build one.</p>';
    } else {
      h += '<div class="armylist">';
      armies.slice().sort(function (x, y) { return (y.updated || 0) - (x.updated || 0); }).forEach(function (a) {
        var f = fac(a), t = armyTotals(a), fc = cardDef(f, a.factionCard), th = themeFor(a.faction);
        h += '<div class="card army" style="border-top:2px solid ' + th.accent + '"><div class="stack" style="gap:4px"><span class="kicker" style="color:' + th.accent + '">' + esc(f.name) + ' · ' + esc(fc ? fc.name : '') + '</span>' +
          '<h3 style="font-size:18px">' + esc(a.name) + '</h3><span class="meta">' + t.units + ' units · ' + t.models + ' models · Supply ' + t.supply + ' · ' + a.cards.length + ' cards' + (a.seed ? ' · seed ' + esc(a.seed) : '') + '</span></div>' +
          '<div class="row"><a class="btn primary" href="#/play/' + a.id + '">Play</a><a class="btn" href="#/edit/' + a.id + '">Edit</a></div></div>';
      });
      h += '</div>';
    }
    h += '<p class="foot">Fan-made and unofficial. Not affiliated with or endorsed by Archon Studio or Blizzard Entertainment. Card summaries are shorthand; your printed cards have the full wording.</p>';
    return h + '</div>';
  }

  /* ---------- about ---------- */
  function viewAbout() {
    var h = '<div class="inner" style="max-width:760px">';
    h += '<div class="topbar"><div class="left"><a class="btn small" href="#/">' + ICON.back + ' Back</a></div></div>';
    h += '<div class="titleblock"><span class="kicker">About</span><h1>TMG Command Sheet</h1></div>';
    h += '<p style="line-height:1.55">An unofficial, fan-made play aid for the StarCraft Tabletop Miniatures Game. It is not affiliated with or endorsed by Archon Studio or Blizzard Entertainment. StarCraft is a trademark of Blizzard Entertainment. Card summaries are written in shorthand; the printed cards are the rules.</p>';
    h += '<div class="card plain stack"><h3>Install it on your phone</h3><p class="muted" style="font-size:13px;line-height:1.5">In Chrome or Samsung Internet, open the browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>. It then opens full screen and works with no signal. Your armies and game tracking are saved on this device only.</p></div>';
    h += '<div class="card plain stack"><h3>Card data</h3>';
    Object.keys(DATA.factions).forEach(function (k) {
      var f = DATA.factions[k];
      h += '<span class="kicker">' + esc(f.name) + '</span>';
      f.sources.forEach(function (s) { h += '<span class="muted" style="font-size:13px">' + esc(s.label) + ': ' + esc(s.version) + '</span>'; });
    });
    var missing = FACTION_ORDER.filter(function (k) { return !DATA.factions[k]; }).map(function (k) { return FACTION_NAMES[k]; });
    h += (missing.length ? '<span class="muted" style="font-size:13px">' + esc(missing.join(' and ')) + (missing.length > 1 ? ' are' : ' is') + ' not in the app yet.</span>' : '') + '</div>';
    h += '<div class="card plain stack"><h3>Loading from a seed</h3><p class="muted" style="font-size:13px;line-height:1.5">Seed import reads the army you saved to the cloud in Archon\'s Command Center. It isn\'t an official feature, so it can stop working if the Command Center changes. Armies you\'ve already loaded stay on your device either way. BM is Zerg Biomass, PE is Protoss Psionic Energy, and CP is the Terran resource.</p></div>';
    h += '<div class="card plain stack" id="sounds"><h3>Sound pack</h3><p class="muted" style="font-size:13px;line-height:1.5">The app has no sounds of its own. Load a sound pack file to hear unit deaths, building cards and hero abilities during a game. The pack stays on this device and is never uploaded or shared.</p>' +
      (soundsLoaded() ? '<p style="font-size:13px">Loaded: <b>' + esc(SND.name || 'Sound pack') + '</b> · ' + Object.keys(SND.sounds).length + ' sounds' + (Object.keys(SND.images || {}).length ? ' · ' + Object.keys(SND.images).length + ' portraits and icons' : '') + '</p>' : '<p class="muted" style="font-size:13px">No sound pack loaded.</p>') +
      '<div class="row"><label class="btn' + (soundsLoaded() ? '' : ' primary') + '">' + (SND.busy ? 'Loading…' : (soundsLoaded() ? 'Replace sound pack' : 'Load sound pack')) +
      '<input type="file" accept=".json,application/json" data-in="soundpack" style="position:absolute;left:-9999px"></label>' +
      (soundsLoaded() ? '<button class="btn" data-act="sound-toggle">' + (SND.on ? 'Mute sounds' : 'Unmute sounds') + '</button><button class="btn" data-act="sound-remove">Remove pack</button>' : '') + '</div></div>';
    h += '<p class="muted mono">App version ' + VERSION + '</p>';
    return h + '</div>';
  }

  /* ---------- import ---------- */
  function viewImport(code) {
    var a = decodeArmy(code || '');
    var h = '<div class="inner" style="max-width:760px">';
    h += '<div class="topbar"><div class="left"><a class="btn small" href="#/">' + ICON.back + ' Home</a></div></div>';
    if (!a) {
      return h + '<p class="empty">This army link didn\'t work. Ask whoever sent it to share it again.</p></div>';
    }
    var f = fac(a), t = armyTotals(a), fc = cardDef(f, a.factionCard);
    h += '<div class="titleblock"><span class="kicker">Shared army</span><h1>' + esc(a.name) + '</h1></div>';
    h += '<div class="card plain stack"><span class="muted">' + esc(f.name) + ' · ' + esc(fc ? fc.name : '') + ' · ' + t.units + ' units · Supply ' + t.supply + '</span>';
    squadsOf(a).forEach(function (q) { h += '<span style="font-size:14px">' + esc(q.name) + ' · ' + q.s.models + (q.s.models === 1 ? ' model' : ' models') + (q.s.upgrades.length ? ' · ' + esc(q.s.upgrades.map(function (u) { return upgName(q.def, u); }).join(', ')) : '') + '</span>'; });
    h += '</div><div class="row"><button class="btn primary" data-act="import" data-code="' + esc(code) + '">Add to my armies</button><a class="btn" href="#/">Cancel</a></div>';
    return h + '</div>';
  }
  function upgName(def, id) { for (var i = 0; i < def.upgrades.length; i++) { if (def.upgrades[i].id === id) { return def.upgrades[i].name; } } return id; }

  /* ---------- editor ---------- */
  function viewEdit(a) {
    if (!a) { return '<div class="inner"><p class="empty">That army isn\'t on this device. <a href="#/">Go home</a></p></div>'; }
    var f = fac(a), t = armyTotals(a), warns = armyWarnings(a), RC = resCode(a);
    var h = '<div class="inner">';
    h += '<div class="topbar"><div class="left"><a class="btn small" href="#/">' + ICON.back + ' Armies</a></div><div class="row"><a class="btn primary" href="#/play/' + a.id + '">Play</a></div></div>';
    h += '<div class="field"><label for="armyName">Army name</label><input id="armyName" class="text" data-in="name" value="' + esc(a.name) + '" maxlength="80" autocomplete="off"></div>';
    if (a.seed) {
      h += '<div class="card plain stack"><div class="row" style="justify-content:space-between"><div class="stack" style="gap:3px"><span class="kicker">Command Center seed</span>' +
        '<span style="font-family:var(--mono);font-size:16px;letter-spacing:.1em">' + esc(a.seed) + '</span>' +
        '<span class="muted" style="font-size:12px">Loaded ' + esc(new Date(a.imported || a.created).toLocaleString()) + (a.minerals ? ' · ' + a.minerals.used + '/' + a.minerals.limit + ' minerals' : '') + (a.gas ? ' · ' + a.gas.used + '/' + a.gas.limit + ' gas' : '') + '</span></div>' +
        '</div>' +
        '<span class="muted" style="font-size:12px;line-height:1.4">Changed the list in the Command Center? Saving there gives it a new seed. Load that one from the home screen.</span>' +
        ((a.skipped || []).length ? '<span class="warn">Not in the app yet, so left out: ' + esc(a.skipped.join(', ')) + '</span>' : '') + '</div>';
    }

    h += '<div class="editlayout"><div class="col">';
    h += secHead(ICON.list, 'Units', 'Roster', 'Add units, set model counts, tick upgrades', '<span class="count">' + a.units.length + '</span>');
    var sq = squadsOf(a);
    if (!sq.length) { h += '<p class="empty">No units yet.</p>'; }
    sq.forEach(function (q) {
      var s = q.s, def = q.def;
      h += '<div class="card stack"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div class="stack" style="gap:3px;min-width:0"><span class="unit"><span class="name">' + esc(q.name) + '</span></span>' +
        '<span class="muted" style="font-size:12px">' + esc(def.slot) + ' · Supply ' + supplyFor(def, s.models) + (def.tag ? ' · ' + esc(def.tag) : '') + (def.unique ? ' · Unique' : '') + '</span></div>' +
        '<button class="btn small danger" data-act="remove-unit" data-uid="' + s.uid + '" aria-label="Remove ' + esc(q.name) + '">Remove</button></div>';
      h += '<div class="row" style="justify-content:space-between"><span class="label">Models</span><div class="stepper">' +
        '<button class="iconbtn" data-act="models" data-uid="' + s.uid + '" data-d="-1" aria-label="Fewer models"' + (s.models <= minModels(def) ? ' disabled' : '') + '>−</button>' +
        '<b>' + s.models + '</b><button class="iconbtn" data-act="models" data-uid="' + s.uid + '" data-d="1" aria-label="More models"' + (s.models >= maxModels(def) ? ' disabled' : '') + '>+</button></div></div>';
      if (def.upgrades.length) {
        h += '<span class="label">Upgrades</span><div class="grid2">';
        def.upgrades.forEach(function (u) {
          var on = s.upgrades.indexOf(u.id) !== -1;
          h += '<label class="choice' + (on ? ' on' : '') + '"><input type="checkbox" data-in="upg" data-uid="' + s.uid + '" data-upg="' + u.id + '"' + (on ? ' checked' : '') + '><span class="c"><span class="n">' + esc(u.name) + '</span><span class="d">' + esc(upgSummary(u)) + '</span></span></label>';
        });
        h += '</div>';
      }
      h += '</div>';
    });
    if (ui.adding) {
      h += '<div class="card plain stack"><div class="row" style="justify-content:space-between"><h3>Add a unit</h3><button class="btn small" data-act="cancel-add">Cancel</button></div><div class="picker">';
      f.units.forEach(function (d) {
        h += '<button class="pick" data-act="pick-unit" data-unit="' + d.id + '"><span class="n">' + esc(d.name) + '</span><span class="d">' + esc(d.slot) + ' · ' + minModels(d) + (maxModels(d) > minModels(d) ? '–' + maxModels(d) : '') + ' models' + (d.tag ? ' · ' + esc(d.tag) : '') + '</span></button>';
      });
      h += '</div></div>';
    } else {
      h += '<button class="btn soft" data-act="add-unit">+ Add unit</button>';
    }
    h += '</div><div class="col">';
    h += secHead(ICON.cards, 'Command cards', 'Faction card', '', '');
    h += '<div class="stack">';
    f.cards.filter(function (c) { return c.type === 'faction'; }).forEach(function (c) {
      var on = a.factionCard === c.id;
      h += '<label class="choice' + (on ? ' on' : '') + '"><input type="radio" name="fc" data-in="fc" value="' + c.id + '"' + (on ? ' checked' : '') + '><span class="c"><span class="n">' + esc(c.name) + '</span><span class="d">Slots: ' + esc(c.slots) + ' · ' + RC + ' ' + c.bm + '</span></span></label>';
    });
    h += '</div>';
    ['tactical', 'creep'].filter(function (type) { return f.cards.some(function (c) { return c.type === type; }); }).forEach(function (type) {
      h += secHead(ICON.cards, 'Command cards', type === 'creep' ? 'Creep card' : 'Tactical cards', '', '');
      h += '<div class="grid2">';
      f.cards.filter(function (c) { return c.type === type; }).forEach(function (c) {
        var on = a.cards.indexOf(c.id) !== -1;
        var d = (c.unique ? 'Unique · ' : '') + (c.slots ? 'Slots: ' + c.slots + ' · ' : '') + (c.bm ? RC + ' ' + c.bm + ' · ' : '') + (c.tag ? c.tag + ' · ' : '') +
          c.abilities.filter(function (x) { return x.note !== 'army building' && x.kind !== 'Reminder'; }).map(function (x) { return x.name; }).join(', ');
        h += '<label class="choice' + (on ? ' on' : '') + '"><input type="checkbox" data-in="card" value="' + c.id + '"' + (on ? ' checked' : '') + '><span class="c"><span class="n">' + esc(c.name) + '</span><span class="d">' + esc(d) + '</span></span></label>';
      });
      h += '</div>';
    });
    h += '<div class="card plain stack"><h3>Share or remove</h3><div class="row"><button class="btn soft" data-act="share" data-id="' + a.id + '">Share army link</button>' +
      '<button class="btn" data-act="duplicate" data-id="' + a.id + '">Duplicate</button>' +
      '<button class="btn danger" data-act="delete" data-id="' + a.id + '">' + (ui.confirmDelete ? 'Tap again to delete' : 'Delete army') + '</button></div></div>';
    h += '</div></div>';

    h += '<div class="summary"><span class="mono">SUPPLY ' + t.supply + ' · ' + t.units + ' UNITS · ' + t.models + ' MODELS · ' + RC + ' ' + t.bm + '</span>' +
      (warns.length ? '<span class="warn">' + warns.length + (warns.length === 1 ? ' thing' : ' things') + ' to check</span>' : '') +
      '<a class="btn primary" style="margin-left:auto" href="#/play/' + a.id + '">Play</a></div>';
    if (warns.length) {
      h += '<div class="card plain stack"><h3>Worth checking</h3>' + warns.map(function (w) { return '<span class="warn">' + esc(w) + '</span>'; }).join('') +
        '<span class="muted" style="font-size:12px">These are reminders, not blocks. Go with your rulebook and opponent.</span></div>';
    }
    return h + '</div>';
  }
  function upgSummary(u) {
    var bits = [];
    (u.abilities || []).forEach(function (x) { bits.push(x.text); });
    (u.weapons || []).forEach(function (w) { bits.push((u.replaces ? 'Replaces ' + u.replaces + ': ' : 'Weapon: ') + w.name + ' ' + w.rng + ' · RoA ' + w.roa + ' · Hit ' + w.hit + (w.kw !== '-' ? ' · ' + w.kw : '')); });
    (u.mods || []).forEach(function (m) { bits.push(m.weapon + (m.addKw ? ' gains ' + m.addKw : '') + (m.surge ? ' gets Surge type ' + m.surge : '') + (m.sdice ? ', S Dice ' + m.sdice : '')); });
    return bits.join(' ');
  }

  /* ---------- play: build the sheet ---------- */
  function playKey(a) { return 'tmg-play-' + a.id; }
  function playState(a) { var p = store.get(playKey(a), null) || {}; return { dmg: p.dmg || {}, exh: p.exh || {}, bm: p.bm || 0, sup: typeof p.sup === 'number' ? p.sup : null }; }
  function savePlay(a, p) { store.set(playKey(a), p); }

  function effectiveWeapons(def, ups) {
    var ws = def.weapons.map(function (w) { var c = {}; for (var k in w) { c[k] = w[k]; } c.notes = []; return c; });
    def.upgrades.forEach(function (u) {
      if (ups.indexOf(u.id) === -1) { return; }
      if (u.replaces) { ws = ws.filter(function (w) { return w.name !== u.replaces; }); }
      (u.weapons || []).forEach(function (w) {
        var c = {}; for (var k in w) { c[k] = w[k]; }
        c.upgraded = true; c.notes = [u.replaces ? u.name + ' upgrade (replaces ' + u.replaces + ')' : u.name + ' upgrade'];
        ws.push(c);
      });
    });
    def.upgrades.forEach(function (u) {
      if (ups.indexOf(u.id) === -1 || !u.mods) { return; }
      u.mods.forEach(function (m) {
        ws.forEach(function (w) {
          if (w.name !== m.weapon) { return; }
          if (m.surge) { w.surge = m.surge; }
          if (m.sdice) { w.sdice = m.sdice; }
          if (m.addKw) { w.kw = w.kw === '-' ? m.addKw : w.kw + ', ' + m.addKw; }
          w.upgraded = true; w.notes.push('from ' + u.name);
        });
      });
    });
    return ws;
  }

  var KIND_RANK = { Active: 0, Reaction: 1, Passive: 2, Reminder: 3 };

  function buildSheet(a, ps) {
    var f = fac(a), sq = squadsOf(a), byUid = {}, dead = {};
    sq.forEach(function (q) {
      byUid[q.s.uid] = q;
      var max = unitMax(q.def, q.s.upgrades, q.s.models), d = Math.min(ps.dmg[q.s.uid] || 0, max);
      if (d >= max) { dead[q.s.uid] = true; }
    });

    function ownerLabel(uids) {
      var types = [], groups = {};
      uids.forEach(function (u) { var t = byUid[u].def.id; if (!groups[t]) { groups[t] = []; types.push(t); } groups[t].push(u); });
      return types.map(function (t) {
        var all = sq.filter(function (q) { return q.def.id === t; });
        if (all.length === groups[t].length) {
          var def = all[0].def;
          return all.length > 1 || maxModels(def) > 1 ? plural(shortName(def)) : shortName(def);
        }
        return groups[t].map(function (u) { return byUid[u].name; }).join(' · ');
      }).join(' · ');
    }
    function ownerColor(uids) {
      var t = byUid[uids[0]].def.id;
      for (var i = 1; i < uids.length; i++) { if (byUid[uids[i]].def.id !== t) { return '#D3DAE1'; } }
      return colorFor(t);
    }

    var phases = { move: [], assault: [], combat: [], score: [], any: [] };
    var weapons = { assault: [], combat: [] };

    /* unit abilities, merged when identical */
    var amap = {}, aorder = [];
    sq.forEach(function (q) {
      var list = q.def.abilities.map(function (x) { return { x: x, upg: false }; });
      q.def.upgrades.forEach(function (u) {
        if (q.s.upgrades.indexOf(u.id) !== -1) { (u.abilities || []).forEach(function (x) { list.push({ x: x, upg: true }); }); }
      });
      list.forEach(function (it) {
        var x = it.x, k = [x.name, x.phase, x.kind, x.cost, x.text, it.upg ? 1 : 0].join('|');
        if (!amap[k]) { amap[k] = { x: x, upg: it.upg, owners: [] }; aorder.push(k); }
        if (amap[k].owners.indexOf(q.s.uid) === -1) { amap[k].owners.push(q.s.uid); }
      });
    });
    aorder.forEach(function (k, i) {
      var e = amap[k];
      phases[e.x.phase].push({ key: 'u' + i, x: e.x, upgrade: e.upg, owners: e.owners, label: ownerLabel(e.owners), color: ownerColor(e.owners) });
    });

    /* weapons, merged when identical profile on the same unit type */
    var wmap = {}, worder = [];
    sq.forEach(function (q) {
      effectiveWeapons(q.def, q.s.upgrades).forEach(function (w) {
        var k = q.def.id + '|' + JSON.stringify([w.name, w.phase, w.rng, w.tgt, w.roa, w.hit, w.surge, w.sdice, w.dmg, w.kw, w.notes]);
        if (!wmap[k]) { wmap[k] = { w: w, owners: [] }; worder.push(k); }
        wmap[k].owners.push(q.s.uid);
      });
    });
    worder.forEach(function (k) {
      var e = wmap[k];
      weapons[e.w.phase].push({ w: e.w, owners: e.owners, label: ownerLabel(e.owners), color: ownerColor(e.owners) });
    });

    /* card abilities */
    var cardList = [a.factionCard].concat(a.cards);
    cardList.forEach(function (id) {
      var c = cardDef(f, id); if (!c) { return; }
      c.abilities.forEach(function (x, i) {
        if (x.note === 'army building') { return; }
        phases[x.phase].push({ key: 'c-' + c.id + '-' + i, x: x, card: c, label: cardShort(c), color: themeFor(a.faction).card });
      });
    });

    Object.keys(phases).forEach(function (p) {
      phases[p].sort(function (m, n) { return (KIND_RANK[m.x.kind] || 0) - (KIND_RANK[n.x.kind] || 0); });
    });
    return { f: f, sq: sq, dead: dead, phases: phases, weapons: weapons, cards: cardList.map(function (id) { return cardDef(f, id); }).filter(Boolean) };
  }

  var PALETTE = ['#9FE07A', '#7DB4E6', '#F2A65A', '#5FCFB8', '#F29BD0', '#E9A6F0', '#D7B58C', '#E3C04B', '#A9C8F5', '#F5B8A0', '#B8E0D2', '#C3CBD3'];
  var colorIdx = {};
  function colorFor(typeId) {
    if (!(typeId in colorIdx)) { colorIdx[typeId] = Object.keys(colorIdx).length % PALETTE.length; }
    return PALETTE[colorIdx[typeId]];
  }

  function parseBM(cost, code) {
    var m = /^(\d+)\s*([A-Z]{2})$/.exec(cost || ''); if (m && m[2] === code) { return { n: parseInt(m[1], 10) }; }
    var r = /^(\d+)-(\d+)\s*([A-Z]{2})$/.exec(cost || ''); if (r && r[3] === code) { return { min: parseInt(r[1], 10), max: parseInt(r[2], 10) }; }
    return null;
  }

  function viewPlay(a) {
    if (!a) { return '<div class="inner"><p class="empty">That army isn\'t on this device. <a href="#/">Go home</a></p></div>'; }
    colorIdx = {};
    var ps = playState(a), S = buildSheet(a, ps), t = armyTotals(a), focus = ui.focus, RC = resCode(a);
    S.sq.forEach(function (q) { colorFor(q.def.id); });
    var fc = cardDef(S.f, a.factionCard);

    function isOff(owners, card) {
      if (focus !== 'all') {
        if (card) { if (focus !== 'cards') { return true; } }
        else if (!owners.some(function (u) { return S.sq.some(function (q) { return q.s.uid === u && q.def.id === focus; }); })) { return true; }
      }
      return !card && owners.length > 0 && owners.every(function (u) { return S.dead[u]; });
    }

    var exhCount = Object.keys(ps.exh).length;
    var cardTotal = S.cards.filter(function (c) { return c.abilities.some(function (x) { return x.kind === 'Active' || x.kind === 'Reaction'; }); }).length;

    var h = '<div class="inner">';
    h += '<div class="topbar topline"><div class="left"><a class="btn small" href="#/" aria-label="Back to armies">' + ICON.back + '</a>' +
      '<a class="btn small" href="#/edit/' + a.id + '">Edit</a>' +
      '<div class="titleblock"><span class="kicker">' + esc(S.f.name) + ' · ' + esc(fc ? fc.name : '') + '</span><h1>' + esc(a.name) + '</h1></div></div>' +
      '<div class="bmbar" aria-label="Resource pool and cards"><span class="kicker" style="color:var(--accent-soft)">' + RC + ' pool</span>' +
      '<button class="iconbtn" data-act="bm" data-d="-1" aria-label="Remove 1 ' + RC + '">−</button><span class="val" aria-live="polite">' + ps.bm + '</span>' +
      '<button class="iconbtn" data-act="bm" data-d="1" aria-label="Add 1 ' + RC + '">+</button>' +
      '<span class="supgrp"><span class="kicker" style="color:var(--accent-soft)">Supply</span>' +
      '<button class="iconbtn" data-act="sup" data-d="-1" aria-label="Remove 1 supply">−</button>' +
      '<button class="val supval" data-act="sup-reset" title="Tap to reset to your army\'s supply (' + t.supply + ')" aria-label="Supply ' + (ps.sup === null ? t.supply : ps.sup) + '. Tap to reset to ' + t.supply + '">' + (ps.sup === null ? t.supply : ps.sup) + '</button>' +
      '<button class="iconbtn" data-act="sup" data-d="1" aria-label="Add 1 supply">+</button></span>' +
      '<span class="mono exhcount" style="color:var(--text2)">' + exhCount + '/' + cardTotal + ' CARDS EXHAUSTED</span>' +
      (soundsLoaded() ? '<button class="iconbtn" data-act="sound-toggle" aria-pressed="' + SND.on + '" aria-label="' + (SND.on ? 'Mute sounds' : 'Unmute sounds') + '">' + (SND.on ? '🔊' : '🔇') + '</button>' : '') +
      '<button class="btn primary" style="margin-left:auto" data-act="readyall">Ready all cards</button></div></div>';
    h += '<div class="tiles"><div class="tile"><b>' + t.supply + '</b><span>ARMY SUPPLY</span></div><div class="tile"><b>' + t.units + '</b><span>UNITS</span></div><div class="tile"><b>' + t.models + '</b><span>MODELS</span></div><div class="tile"><b>' + t.bm + '</b><span>' + RC + ' ON CARDS</span></div>' +
      (a.minerals ? '<div class="tile"><b>' + a.minerals.used + '</b><span>MINERALS</span></div>' : '') +
      (a.gas ? '<div class="tile"><b>' + a.gas.used + '</b><span>GAS</span></div>' : '') + '</div>';

    var jumps = [['≡', 'Roster', 'sec-roster'], ['01', 'Move', 'ph-move'], ['02', 'Assault', 'ph-assault'], ['03', 'Combat', 'ph-combat'], ['04', 'Score', 'ph-score'], ['∞', 'Always', 'ph-any']];
    h += '<div class="tools"><nav class="jnav" aria-label="Jump to section">' + jumps.map(function (j) { return '<a href="#" data-act="jump" data-to="' + j[2] + '"><span>' + j[0] + '</span><span>' + j[1] + '</span></a>'; }).join('') + '</nav>';
    var types = []; S.sq.forEach(function (q) { if (types.indexOf(q.def.id) === -1) { types.push(q.def.id); } });
    h += '<section class="chips" aria-label="Focus"><span class="kicker" style="color:var(--muted);flex-shrink:0">Focus</span>';
    var chipDefs = [{ id: 'all', label: 'All', color: themeFor(a.faction).accent, n: 0 }].concat(types.map(function (tid) {
      var all = S.sq.filter(function (q) { return q.def.id === tid; }), def = all[0].def;
      return { id: tid, label: all.length > 1 || maxModels(def) > 1 ? plural(shortName(def)) : shortName(def), color: colorFor(tid), n: all.length };
    })).concat([{ id: 'cards', label: 'Cards', color: themeFor(a.faction).card, n: 0 }]);
    chipDefs.forEach(function (c) {
      var on = focus === c.id;
      h += '<button data-act="focus" data-id="' + c.id + '" aria-pressed="' + on + '" style="background:' + (on ? c.color : 'transparent') + ';color:' + (on ? '#0F1317' : c.color) + ';border-color:' + (on ? c.color : 'rgba(255,255,255,.2)') + '">' + esc(c.label) + (c.n > 1 ? '<small>×' + c.n + '</small>' : '') + '</button>';
    });
    h += '</section></div>';

    h += '<div class="main">';
    /* roster */
    h += '<section id="sec-roster" class="rpane">' + secHead(ICON.list, 'Statlines + health', 'Roster', '', '<button class="btn small" data-act="resethp">Reset HP</button>');
    S.sq.forEach(function (q) {
      var def = q.def, s = q.s, col = colorFor(def.id);
      var H = healthOf(def, s.upgrades, s.models, ps.dmg[s.uid]), hpv = H.hpv, max = H.max, rem = H.rem, alive = H.alive;
      var dim = focus !== 'all' && focus !== def.id;
      var pic = unitArt(S.f, def);
      h += '<div class="card unit stack' + (dim ? ' dim' : '') + '" data-unitcard="' + def.id + '" style="gap:10px;scroll-margin-top:12px"><div class="head">' +
        (pic ? '<img class="portrait' + (rem === 0 ? ' gone' : '') + '" src="' + pic + '" alt="" style="border-color:' + col + '">' : '') + '<div class="stack" style="gap:3px;min-width:0;flex:1">' +
        '<span class="name" style="color:' + col + '">' + esc(q.name) + '</span><span class="muted" style="font-size:12px">' +
        (def.slot === 'Summoned' ? 'Summoned · ' + s.models + ' models · Supply 0' : esc(def.slot) + ' · ' + s.models + (s.models === 1 ? ' model' : ' models') + ' · Supply ' + supplyFor(def, s.models)) + '</span>' +
        (s.upgrades.length ? '<span class="mono" style="color:var(--upg)">+ ' + esc(s.upgrades.map(function (u) { return upgName(def, u); }).join(', ')) + '</span>' : '') + '</div>' +
        (rem === 0 ? '<span class="badge dead">DESTROYED</span>' : (H.shielded ? '<span class="badge shield">SHIELDED</span>' : '')) + '</div>';
      h += '<div class="statgrid' + (H.sh ? ' six' : '') + '">' + (H.sh ? '<div><b>' + H.sh + '</b><span>SHIELD</span></div>' : '') + '<div><b>' + esc(def.speed) + '</b><span>SPEED</span></div><div><b>' + esc(def.armour) + '</b><span>ARMOUR</span></div><div><b>' + esc(def.evade) + '</b><span>EVADE</span></div><div><b>' + hpv + '</b><span>HIT POINTS</span></div><div><b>' + def.size + '</b><span>SIZE</span></div></div>';
      h += '<div class="hp"><div class="segs" aria-hidden="true">';
      if (H.sh) { h += '<i class="sh"><em style="width:' + Math.round(H.shLeft / H.sh * 100) + '%"></em></i>'; }
      for (var i = 0; i < s.models; i++) {
        var fill = i < alive - 1 ? 1 : (i === alive - 1 ? (H.body - hpv * (alive - 1)) / hpv : 0);
        h += '<i><em style="width:' + Math.round(fill * 100) + '%;background:' + col + '"></em></i>';
      }
      h += '</div><div class="hprow"><button class="hit" data-act="hit" data-uid="' + s.uid + '" aria-label="Deal 1 damage to ' + esc(q.name) + '">−</button><div class="mid">' +
        '<div class="num"><b>' + rem + '<small>/' + max + '</small></b><span>HP LEFT</span></div>' +
        (s.models > 1 ? '<div class="num"><b style="color:' + col + '">' + alive + '<small>/' + s.models + '</small></b><span>MODELS</span></div>' : '') +
        '</div><button class="heal" data-act="heal" data-uid="' + s.uid + '" aria-label="Restore 1 HP to ' + esc(q.name) + '">+</button></div></div></div>';
    });
    h += '</section>';

    /* phases */
    var P = [
      { k: 'move', kicker: 'Phase 1', title: 'Movement', sub: 'Deploy from reserves, move, or disengage.' },
      { k: 'assault', kicker: 'Phase 2', title: 'Assault', sub: 'Move, charge, hold, or shoot.' },
      { k: 'combat', kicker: 'Phase 3', title: 'Combat', sub: 'Engaged units fight in melee.' },
      { k: 'score', kicker: 'Phase 4', title: 'Scoring', sub: 'Claim objectives, then clear tokens. End-of-round reminders.' },
      { k: 'any', kicker: 'Passive · reactions · any time', title: 'Always on', sub: 'Constant effects and triggers usable in any phase.' }
    ];
    function phaseHtml(p) {
      var abs = S.phases[p.k], ws = S.weapons[p.k] || [], n = abs.length + ws.length;
      var out = '<section class="phase" id="ph-' + p.k + '">' + secHead(ICON[p.k], p.kicker, p.title, p.sub, '<span class="count">' + (n < 10 ? '0' : '') + n + '</span>');
      if (ws.length) {
        out += '<span class="kicker" style="color:var(--muted)">' + (p.k === 'assault' ? 'Ranged weapons' : 'Close combat weapons') + '</span>';
        ws.forEach(function (e) {
          var w = e.w, off = isOff(e.owners, null);
          out += '<div class="weapon' + (off ? ' dim' : '') + '"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div class="row" style="min-width:0"><h3 style="font-size:15px;font-family:var(--display);font-weight:600">' + esc(w.name) + '</h3>' +
            (w.upgraded ? '<span class="badge upg">UPGRADED</span>' : '') + '</div><span class="tag" style="color:' + e.color + ';border-color:' + e.color + '66">' + esc(e.label) + '</span></div>' +
            '<div class="wtable"><span class="h">RNG</span><span class="h">Target</span><span class="h">RoA</span><span class="h">Hit</span><span class="h">Surge type</span><span class="h">S Dice</span><span class="h">Dmg</span>' +
            '<span class="v">' + esc(w.rng) + '</span><span>' + esc(w.tgt) + '</span><span class="v">' + esc(w.roa) + '</span><span class="v">' + esc(w.hit) + '</span><span>' + esc(w.surge) + '</span><span class="v">' + esc(w.sdice) + '</span><span class="v">' + esc(w.dmg) + '</span></div>' +
            '<div class="kw"><b>Keyword</b><strong>' + esc(w.kw) + '</strong>' + (w.notes && w.notes.length ? '<em>' + esc(w.notes.join('; ')) + '</em>' : '') + '</div></div>';
        });
        out += '<span class="kicker" style="color:var(--muted);padding-top:6px">Abilities</span>';
      }
      if (!n) { out += '<p class="empty">Nothing in this army is used in this phase.</p>'; }
      abs.forEach(function (e) { out += abilityHtml(e); });
      return out + '</section>';
    }
    function abilityHtml(e) {
      var x = e.x, active = x.kind === 'Active' || x.kind === 'Reaction';
      var card = e.card || null, cardTap = !!card && active && !x.noExhaust;
      var bmc = parseBM(x.cost, RC), unitTap = !card && active && bmc && (bmc.n > 0 || bmc.max);
      var exState = card ? ps.exh[card.id] : null, exhausted = cardTap && !!exState;
      var open = ui.pending === e.key && !exhausted;
      var off = isOff(e.owners || [], card);
      var cls = 'card ab stack' + (exhausted ? ' exhausted' : '') + (open ? ' open' : '') + (off ? ' dim' : (exhausted ? ' half' : ''));
      var meta = [x.kind, x.cost, x.note].filter(Boolean).join(' · ').toUpperCase();
      var ico = card ? cardArt(card) : null;
      var out = '<div class="' + cls + '" style="gap:6px"><div class="top"><span class="nm">' + (ico ? '<img class="abicon" src="' + ico + '" alt="">' : '') + esc(x.name) + '</span><span class="tag" style="color:' + e.color + ';border-color:' + e.color + '66">' + esc(e.label) + '</span></div>' +
        '<p>' + esc(x.text) + '</p><div class="row"><span class="meta">▸ ' + esc(meta) + '</span>' +
        (e.upgrade ? '<span class="badge upg">UPGRADE</span>' : '') +
        (exhausted ? '<span class="badge exh">' + (exState === 'bm' ? 'EXHAUSTED · SPENT FOR ' + RC : 'EXHAUSTED') + '</span>' : '');
      if (cardTap) {
        out += '<button class="btn small act ' + (exhausted ? '' : (open ? 'primary' : 'soft')) + '" data-act="' + (exhausted ? 'ready' : 'tap') + '" data-key="' + e.key + '" data-card="' + card.id + '" aria-expanded="' + open + '">' + (exhausted ? 'Ready card' : 'Use') + '</button>';
      } else if (unitTap) {
        out += '<button class="btn small act ' + (open ? 'primary' : 'soft') + '" data-act="tap" data-key="' + e.key + '" aria-expanded="' + open + '">Pay ' + esc(x.cost) + '</button>';
      }
      out += '</div>';
      if (open) {
        out += '<div class="ask">';
        if (cardTap) {
          out += '<span>' + (card.bm > 0 ? 'Exhaust ' + esc(cardShort(card)) + ': use ' + esc(x.name) + ', or spend the card for ' + card.bm + ' ' + RC + '?' : 'Exhaust ' + esc(cardShort(card)) + ' to use ' + esc(x.name) + '?') + '</span><div class="row">' +
            '<button class="btn primary" data-act="exhaust" data-card="' + card.id + '" data-mode="ability">Use ' + esc(x.name) + '</button>' +
            (card.bm > 0 ? '<button class="btn" style="color:var(--good);border-color:rgba(95,207,184,.6)" data-act="exhaust" data-card="' + card.id + '" data-mode="bm">Spend for +' + card.bm + ' ' + RC + '</button>' : '');
        } else {
          var opts = bmc.n ? [bmc.n] : (function () { var o = []; for (var v = bmc.min; v <= bmc.max; v++) { o.push(v); } return o; })();
          out += '<span>' + (ps.bm >= opts[0] ? 'Pay from your ' + RC + ' pool (you have ' + ps.bm + ').' : 'Not enough ' + RC + ': your pool has ' + ps.bm + '.') + '</span><div class="row">';
          opts.forEach(function (v) { out += '<button class="btn primary" data-act="pay" data-n="' + v + '" data-owners="' + esc((e.owners || []).join(',')) + '" data-ab="' + esc(x.name) + '"' + (ps.bm < v ? ' disabled' : '') + '>Pay ' + v + ' ' + RC + '</button>'; });
        }
        out += '<button class="btn" data-act="cancel">Cancel</button></div></div>';
      }
      return out + '</div>';
    }

    h += '<div class="ppane"><div class="pcol">' + phaseHtml(P[0]) + phaseHtml(P[1]) + '</div><div class="pcol">' + phaseHtml(P[2]) + phaseHtml(P[3]) + phaseHtml(P[4]);
    /* command cards */
    h += '<section class="phase" id="sec-cards">' + secHead(ICON.cards, 'Faction + tactical', 'Command cards', '', '');
    S.cards.forEach(function (c) {
      var ex = ps.exh[c.id];
      var flippable = c.abilities.some(function (x) { return (x.kind === 'Active' || x.kind === 'Reaction') && !x.noExhaust; });
      var askOpen = ui.pending === 'flip:' + c.id && !ex;
      h += '<div class="card plain cardrow' + (flippable ? ' flippable' : '') + (ex ? ' ab exhausted' : '') + '"' + (flippable && !askOpen ? ' data-act="' + (ex ? 'ready' : 'flip') + '" data-card="' + c.id + '" role="button" tabindex="0" aria-label="' + (ex ? 'Ready ' : 'Flip ') + esc(c.name) + '"' : '') +
        ' style="' + (c.type === 'faction' ? 'border-color:var(--accent)' : '') + '"><div class="row" style="justify-content:space-between;flex-wrap:nowrap">' +
        (cardArt(c) ? '<img class="cardicon" src="' + cardArt(c) + '" alt="">' : '') + '<div class="stack" style="gap:3px;min-width:0;flex:1"><h3 style="font-size:15px;font-family:var(--display);font-weight:600">' + esc(c.name) + '</h3><span class="muted" style="font-size:12px;line-height:1.4">' +
        esc([c.type === 'faction' ? 'Faction' : (c.type === 'creep' ? 'Creep card' : null), c.unique ? 'Unique' : null, c.slots ? c.slots : null, c.tag || null].filter(Boolean).join(' · ')) + '</span></div>' +
        '<span class="mono" style="color:var(--muted)">' + (c.bm ? RC + ' ' + c.bm : '') + '</span></div>' +
        (ex ? '<div class="row" style="justify-content:space-between"><span class="badge exh">' + (ex === 'bm' ? 'EXHAUSTED · SPENT FOR +' + c.bm + ' ' + RC : 'EXHAUSTED · ABILITY USED') + '</span><span class="mono" style="color:var(--muted);font-size:11px">TAP TO READY</span></div>' : '') +
        (flippable && !ex && !askOpen ? '<span class="mono" style="color:var(--muted);font-size:11px">TAP TO FLIP</span>' : '') +
        (askOpen ? '<div class="ask"><span>Flip ' + esc(cardShort(c)) + ': used for an ability' + (c.bm > 0 ? ', or spent for ' + c.bm + ' ' + RC : '') + '?</span><div class="row">' +
          '<button class="btn primary" data-act="exhaust" data-card="' + c.id + '" data-mode="ability">Used ability</button>' +
          (c.bm > 0 ? '<button class="btn" style="color:var(--good);border-color:rgba(95,207,184,.6)" data-act="exhaust" data-card="' + c.id + '" data-mode="bm">Spend for +' + c.bm + ' ' + RC + '</button>' : '') +
          '<button class="btn" data-act="cancel">Cancel</button></div></div>' : '') +
        '</div>';
    });
    h += '</section></div>';
    h += '<p class="foot">Summaries are shorthand from the Archon card sheets; your printed cards have the full wording.</p></div>';
    h += '</div></div>';
    return h;
  }

  /* ---------- events ---------- */
  root.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]'); if (!t) { return; }
    var act = t.getAttribute('data-act'), r = route(), a = findArmy(r.id);
    var ps = a ? playState(a) : null;
    function setPlay(p) { savePlay(a, p); render(); }

    switch (act) {
      case 'install':
        if (installEvt) { installEvt.prompt(); installEvt.userChoice.then(function () { installEvt = null; render(); }); }
        break;
      case 'new': ui.pickFaction = !ui.pickFaction; render(); break;
      case 'cancel-new': ui.pickFaction = false; render(); break;
      case 'new-faction':
        var fk = t.getAttribute('data-faction'), fz = DATA.factions[fk]; if (!fz) { break; }
        var na = { id: uid(), name: 'New ' + fz.name + ' army', faction: fk, factionCard: fz.cards.filter(function (c) { return c.type === 'faction'; })[0].id, cards: [], units: [], created: now(), updated: now() };
        ui.pickFaction = false; armies.push(na); saveArmies(); go('#/edit/' + na.id);
        break;
      case 'import':
        var ia = decodeArmy(t.getAttribute('data-code'));
        if (ia) { armies.push(ia); saveArmies(); go('#/edit/' + ia.id); }
        break;
      case 'seed-update': if (a && a.seed) { loadSeedInto(a.seed, a); } break;
      case 'add-unit': ui.adding = true; render(); break;
      case 'cancel-add': ui.adding = false; render(); break;
      case 'pick-unit':
        var d = unitDef(fac(a), t.getAttribute('data-unit'));
        a.units.push(U(d.id, maxModels(d) <= 3 ? maxModels(d) : minModels(d)));
        a.updated = now(); ui.adding = false; saveArmies(); render();
        break;
      case 'remove-unit':
        a.units = a.units.filter(function (s) { return s.uid !== t.getAttribute('data-uid'); }); a.updated = now(); saveArmies(); render();
        break;
      case 'models':
        a.units.forEach(function (s) {
          if (s.uid !== t.getAttribute('data-uid')) { return; }
          var def = unitDef(fac(a), s.unit);
          s.models = Math.max(minModels(def), Math.min(maxModels(def), s.models + parseInt(t.getAttribute('data-d'), 10)));
        });
        a.updated = now(); saveArmies(); render();
        break;
      case 'share':
        var url = location.origin + location.pathname + '#/import/' + encodeArmy(a);
        if (navigator.share) {
          navigator.share({ title: a.name, text: 'My ' + fac(a).name + ' army for TMG Command Sheet', url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () { toast('Army link copied'); }, function () { window.prompt('Copy this link', url); });
        } else { window.prompt('Copy this link', url); }
        break;
      case 'duplicate':
        var dup = JSON.parse(JSON.stringify(a)); dup.id = uid(); dup.name = a.name + ' (copy)'; dup.created = dup.updated = now();
        dup.units.forEach(function (s) { s.uid = uid(); });
        armies.push(dup); saveArmies(); go('#/edit/' + dup.id);
        break;
      case 'delete':
        if (!ui.confirmDelete) { ui.confirmDelete = true; render(); break; }
        armies = armies.filter(function (x) { return x.id !== a.id; }); saveArmies(); store.del(playKey(a)); go('#/');
        break;
      case 'jump':
        ev.preventDefault();
        var el = document.getElementById(t.getAttribute('data-to'));
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        break;
      case 'sound-toggle': SND.on = !SND.on; store.set('tmg-sound-on', SND.on); render(); break;
      case 'sound-remove': removePack(); break;
      case 'focus':
        var fid = t.getAttribute('data-id'); ui.focus = fid; render();
        if (fid !== 'all' && fid !== 'cards') {
          var fdef = unitDef(fac(a), fid);
          if (fdef) { var b0 = baseUnitId(fac(a), fdef); playKeyed(['select:' + fid].concat(b0 ? ['select:' + b0] : [])); }
          var target = root.querySelector('[data-unitcard="' + fid + '"]');
          if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
        break;
      case 'bm': ps.bm = Math.max(0, ps.bm + parseInt(t.getAttribute('data-d'), 10)); setPlay(ps); break;
      case 'sup':
        var sNow = ps.sup === null ? armyTotals(a).supply : ps.sup;
        ps.sup = Math.max(0, sNow + parseInt(t.getAttribute('data-d'), 10)); setPlay(ps);
        break;
      case 'sup-reset': ps.sup = null; setPlay(ps); toast('Supply reset to ' + armyTotals(a).supply); break;
      case 'readyall': ps.exh = {}; ui.pending = null; setPlay(ps); break;
      case 'resethp': ps.dmg = {}; setPlay(ps); break;
      case 'hit':
      case 'heal':
        var su = t.getAttribute('data-uid'), sq = null;
        a.units.forEach(function (s) { if (s.uid === su) { sq = s; } });
        var sdef = unitDef(fac(a), sq.unit), max = unitMax(sdef, sq.upgrades, sq.models), cur = ps.dmg[su] || 0;
        var before = healthOf(sdef, sq.upgrades, sq.models, cur).alive;
        ps.dmg[su] = act === 'hit' ? Math.min(max, cur + 1) : Math.max(0, cur - 1);
        var after = healthOf(sdef, sq.upgrades, sq.models, ps.dmg[su]).alive;
        if (after < before) { soundDeath(fac(a), sdef, after === 0); }
        setPlay(ps);
        break;
      case 'tap': ui.pending = ui.pending === t.getAttribute('data-key') ? null : t.getAttribute('data-key'); render(); break;
      case 'cancel': ui.pending = null; render(); break;
      case 'flip': ui.pending = 'flip:' + t.getAttribute('data-card'); render(); break;
      case 'exhaust':
        var cid = t.getAttribute('data-card'), mode = t.getAttribute('data-mode'), cdef = cardDef(fac(a), cid);
        ps.exh[cid] = mode; if (mode === 'bm') { ps.bm += cdef.bm || 0; }
        if (cdef.type === 'tactical') { playKeyed(['card:' + cid]); }
        ui.pending = null; setPlay(ps);
        break;
      case 'ready':
        var rid = t.getAttribute('data-card'), prev = ps.exh[rid], rdef = cardDef(fac(a), rid);
        delete ps.exh[rid]; if (prev === 'bm') { ps.bm = Math.max(0, ps.bm - (rdef.bm || 0)); }
        ui.pending = null; setPlay(ps);
        break;
      case 'pay':
        var n = parseInt(t.getAttribute('data-n'), 10);
        if (ps.bm >= n) {
          ps.bm -= n;
          var own = (t.getAttribute('data-owners') || '').split(','), done = {};
          a.units.forEach(function (s) {
            if (own.indexOf(s.uid) === -1 || done[s.unit]) { return; }
            done[s.unit] = true; soundAbility(fac(a), unitDef(fac(a), s.unit), t.getAttribute('data-ab') || '');
          });
        }
        ui.pending = null; setPlay(ps);
        break;
    }
  });

  root.addEventListener('submit', function (ev) {
    if (ev.target.getAttribute('data-form') !== 'seed') { return; }
    ev.preventDefault();
    var v = (ui.seedValue || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,10}$/.test(v)) { ui.seedMsg = 'Enter the seed exactly as the Command Center shows it, like CVI539.'; render(); return; }
    if (!ui.seedBusy) { loadSeedInto(v, null); }
  });
  root.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.getAttribute('data-in') === 'seed') { ui.seedValue = t.value.toUpperCase(); return; }
    if (t.getAttribute('data-in') !== 'name') { return; }
    var a = findArmy(route().id); if (!a) { return; }
    a.name = t.value; a.updated = now(); saveArmies();
  });
  root.addEventListener('change', function (ev) {
    var t = ev.target, kind = t.getAttribute('data-in'); if (!kind || kind === 'name') { return; }
    if (kind === 'soundpack') { if (t.files && t.files[0]) { loadPackFile(t.files[0]); } return; }
    var a = findArmy(route().id); if (!a) { return; }
    if (kind === 'fc') { a.factionCard = t.value; }
    if (kind === 'card') {
      var i = a.cards.indexOf(t.value);
      if (t.checked && i === -1) { a.cards.push(t.value); } else if (!t.checked && i !== -1) { a.cards.splice(i, 1); }
    }
    if (kind === 'upg') {
      a.units.forEach(function (s) {
        if (s.uid !== t.getAttribute('data-uid')) { return; }
        var id = t.getAttribute('data-upg'), j = s.upgrades.indexOf(id);
        if (t.checked && j === -1) { s.upgrades.push(id); } else if (!t.checked && j !== -1) { s.upgrades.splice(j, 1); }
      });
    }
    a.updated = now(); saveArmies(); render();
  });

  render(true);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
