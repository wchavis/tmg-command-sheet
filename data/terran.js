/* Terran card library for TMG Command Sheet.
 * Source: Archon Studio Terran P2P card sheets (Wave 1 May 2026 v1.0).
 * Ability text is a short summary in our own words; the printed cards have the full wording.
 * Phases: any | move | assault | combat. Reminders use phase "assault" or "score".
 */
(function () {
  var A = function (name, phase, kind, cost, text, note, extra) {
    var o = { name: name, phase: phase, kind: kind, cost: cost || '', text: text, note: note || '' };
    if (extra) { for (var k in extra) { o[k] = extra[k]; } }
    return o;
  };
  var W = function (name, phase, rng, tgt, roa, hit, surge, sdice, dmg, kw) {
    return { name: name, phase: phase, rng: rng, tgt: tgt, roa: roa, hit: hit, surge: surge, sdice: sdice, dmg: dmg, kw: kw || '-' };
  };
  var R = function (name, phase, text, note) {
    return { name: name, phase: phase, kind: 'Reminder', cost: '', text: text, note: note || '' };
  };

  var COMMANDER = A('Commander', 'any', 'Passive', '', 'Counts as 1 more Supply for controlling and contesting markers, completing objectives, and Disengage checks.');
  var STRUCTURE = A('Structure', 'any', 'Passive', '', 'Can\'t activate or take actions, counts as 0 Supply, never controls or contests markers, and can\'t be targeted by abilities unless stated.');
  var INDOMITABLE = A('Indomitable', 'assault', 'Passive', '', 'While engaged, may shoot and be shot by unengaged enemy units. The defender gets an Evade roll against those attacks.');
  var DEV = function (n, roll) { return A('Devastating Charge', 'assault', 'Passive', '', 'Right after a successful charge, resolve IMPACT (' + n + ') ' + roll + '.', 'on charge'); };
  var STIM = function (weapon, prec) {
    return A('Stimpack', 'move', 'Active', '1 CP', 'Suffer NON-LETHAL DAMAGE (2) and gain BUFF SPEED (3). The ' + weapon + ' and all close combat weapons gain PRECISION (' + prec + ').');
  };
  var SLUG = A('Slugthrower', 'assault', 'Passive', '', 'C-14 Rifle attacks against a target within 8" gain ANTI-EVADE (1).');
  var FRAG = A('Grenades - Frag', 'assault', 'Passive', '', 'C-14 Rifle attacks against a target within 8" use D6 for S Dice.');
  var GO_GO = A('Go! Go! Go!', 'move', 'Active', '', 'The active Biological unit makes a 2" Move. It doesn\'t count toward its action limit.');
  var C14 = W('C-14 Rifle', 'assault', '12', 'All', '2', '3+', 'Light', 'D3', '1');

  var units = [
    { id: 'marine', name: 'Marine', slot: 'Core', role: 'Damage Dealer', size: 2, speed: '4/7', armour: '5+', evade: '5+', hp: 2,
      brackets: [[1, 3, 0], [4, 6, 1], [7, 9, 2]],
      abilities: [STIM('C-14 Rifle', 3)],
      weapons: [C14, W('Strike', 'combat', 'E', 'Ground', '1', '5+', '-', '-', '1')],
      upgrades: [
        { id: 'combat-shield', name: 'Combat Shield', abilities: [A('Combat Shield', 'move', 'Active', '1 CP', 'This unit may always Evade close combat attacks against it and damage from enemy special abilities.')] },
        { id: 'agg-12', name: 'AGG-12', replaces: 'C-14 Rifle', weapons: [W('AGG-12', 'assault', '12', 'Ground', '2', '3+', 'Armoured', 'D3', '1', 'LONG RANGE (18"), SPECIALIST')] },
        { id: 'rocket-launcher', name: 'Rocket Launcher', weapons: [W('Rocket Launcher', 'assault', '12', 'Ground', '4', '3+', '-', '-', '1', 'INDIRECT FIRE, LONG RANGE (18"), SIDEARM, SPECIALIST')] },
        { id: 'slugthrower', name: 'Slugthrower', abilities: [SLUG] },
        { id: 'grenades-frag', name: 'Grenades - Frag', abilities: [FRAG] },
        { id: 'bayonet', name: 'Bayonet', replaces: 'Strike', weapons: [W('Bayonet', 'combat', 'E', 'Ground', '2', '5+', '-', '-', '1')] }
      ] },
    { id: 'raynors-raider', name: 'Raynor\'s Raider (Marine)', tag: 'Raynor\'s Raiders', slot: 'Core', role: 'Damage Dealer', size: 2, speed: '4/7', armour: '5+', evade: '5+', hp: 2,
      brackets: [[1, 6, 1]],
      abilities: [STIM('C-14 Rifle', 3),
        A('Raiders Roll!', 'move', 'Passive', '', 'When deploying from reserves, may resolve Stimpack for 1 CP less (minimum 0).', 'from reserves'),
        A('Rapid Reinforcements', 'move', 'Passive', '', 'When deploying from reserves, may resolve PLACE (10) from another friendly unit. No model within 8" of an enemy. Activation then ends.', 'from reserves'),
        SLUG, FRAG],
      weapons: [C14, W('Bayonet', 'combat', 'E', 'Ground', '2', '5+', '-', '-', '1')],
      upgrades: [] },
    { id: 'marauder', name: 'Marauder', slot: 'Core', role: 'Tank', size: 2, speed: '4/7', armour: '4+', evade: '6+', hp: 5,
      brackets: [[1, 1, 0], [2, 2, 1], [3, 4, 2]],
      abilities: [STIM('Quad K12', 2),
        A('Concussive Shells', 'assault', 'Reaction', '1 CP', 'An enemy declares a charge against a friendly unit within 8": that enemy gains DEBUFF SPEED (2).')],
      weapons: [W('Quad K12', 'assault', '12', 'Ground', '3', '3+', 'Armoured', 'D3', '1', 'PIERCE Armoured (2)'),
        W('Strike', 'combat', 'E', 'Ground', '2', '4+', '-', '-', '1')],
      upgrades: [
        { id: 'veteran-of-tarsonis', name: 'Veteran of Tarsonis', abilities: [A('Veteran of Tarsonis', 'any', 'Passive', '', 'While within 3" of a mission marker, this unit\'s Armour is increased by 1.')] },
        { id: 'kinetic-foam', name: 'Kinetic Foam', hpMod: 1, abilities: [A('Kinetic Foam', 'any', 'Passive', '', '+1 Hit Points (already counted in the health tracker).')] },
        { id: 'laser-targeting', name: 'Laser Targeting Systems', mods: [{ weapon: 'Quad K12', addKw: 'LONG RANGE (16")' }] }
      ] },
    { id: 'medic', name: 'Medic', slot: 'Support', role: 'Lifesaver', size: 2, speed: '4/7', armour: '5+', evade: '5+', hp: 2,
      brackets: [[1, 1, 0], [2, 3, 1]],
      abilities: [
        A('Life Support', 'any', 'Reaction', '1 CP', 'Another friendly Biological unit within 4" takes damage: reduce the total by 1 per Medic within 4" of it.'),
        A('Restoration', 'any', 'Reaction', '1 CP', 'A friendly unit within 4" receives a DEBUFF: remove all its DEBUFFS.'),
        A('Medpack', 'move', 'Active', '1 CP', 'Another friendly Biological unit within 4" resolves HEAL (X), X = Medics within 4" of it.'),
        A('Optical Flare', 'move', 'Active', '2 CP', 'Pick an enemy unit within 12". Until end of round its ranged weapons get DEBUFF RANGE (4) and it can\'t use LONG RANGE.')],
      weapons: [W('Strike', 'combat', 'E', 'Ground', '1', '5+', '-', '-', '1')],
      upgrades: [
        { id: 'advanced-medic', name: 'Advanced Medic Facilities', abilities: [A('Advanced Medic Facilities', 'any', 'Passive', '', 'This unit\'s Supply Value counts as 0 for the Supply Pool.')] },
        { id: 'a13-flash', name: 'A-13 Flash Grenade Launcher', abilities: [A('A-13 Flash Grenade Launcher', 'any', 'Passive', '', 'Optical Flare\'s range becomes 16".')] },
        { id: 'stabilizer-medpacks', name: 'Stabilizer Medpacks', abilities: [A('Stabilizer Medpacks', 'any', 'Passive', '', 'Life Support and Medpack count 1 extra Medic within range.')] }
      ] },
    { id: 'goliath', name: 'Goliath', slot: 'Elite', role: 'Damage Dealer', size: 3, speed: '7', armour: '4+', evade: '-', hp: 10,
      brackets: [[1, 1, 2]],
      abilities: [
        A('Target Lock', 'move', 'Active', '1 CP', 'Pick an enemy unit within 12". Friendly Goliath Autocannon attacks against it get Surge Light, Armoured and S Dice D3+1.'),
        INDOMITABLE, DEV(4, '3+')],
      weapons: [W('Autocannon', 'assault', '12', 'Ground', '9', '4+', '-', '-', '1', 'LONG RANGE (18")'),
        W('Underbelly Machine Gun', 'assault', '8', 'Ground', '6', '3+', 'Light', 'D3', '1', 'PINPOINT, SIDEARM'),
        W('Hellfire Missiles', 'assault', '16', 'Flying', '6', '3+', 'Light', 'D3', '1', 'ANTI-EVADE (1), SIDEARM'),
        W('Stomp', 'combat', 'E', 'Ground', '4', '5+', '-', '-', '1')],
      upgrades: [
        { id: 'ares-targeting', name: 'Ares-Class Targeting System', mods: [{ weapon: 'Autocannon', addKw: 'PRECISION (1)' }, { weapon: 'Underbelly Machine Gun', addKw: 'PRECISION (1)' }] },
        { id: 'scatter-missiles', name: 'Scatter Missiles', replaces: 'Hellfire Missiles', weapons: [W('Scatter Missiles', 'assault', '18', 'Ground', '6', '5+', 'Light', 'D3', '1', 'INDIRECT FIRE, LOCKED IN (6), LONG RANGE (24"), SIDEARM')] },
        { id: 'haywire-missiles', name: 'Haywire Missiles', replaces: 'Hellfire Missiles', weapons: [W('Haywire Missiles', 'assault', '12', 'Ground', '3', '3+', 'Armoured', 'D3', '1', 'PIERCE Armoured (3), SIDEARM')] }
      ] },
    { id: 'jim-raynor', name: 'Jim Raynor', unique: true, slot: 'Hero', role: 'Tactician', size: 2, speed: '7', armour: '4+', evade: '5+', hp: 8,
      brackets: [[1, 1, 1]],
      abilities: [COMMANDER,
        A('Freedom Fighters', 'any', 'Passive', '', 'Friendly units within 8" can\'t drop below 1 Supply for contesting markers and completing objectives.'),
        A('Orders', 'move', 'Active', '1-2 CP', 'Repeatable. Another friendly Biological unit within 8": 1 CP its first weapon used gains CRITICAL HIT (2); 1 CP it ignores the Disengage penalty this round; 2 CP remove its activation marker.')],
      weapons: [W('Commando Rifle', 'assault', '18', 'All', '3', '3+', 'Armoured', 'D3', '1', 'BULKY, PIERCE Armoured (3)'),
        W('"Justice" Revolver', 'assault', '6', 'Ground', '2', '3+', '-', '-', '2', 'ANTI-EVADE (2), SIDEARM, PINPOINT'),
        W('Bayonet', 'combat', 'E', 'Ground', '2', '4+', 'Light', 'D3', '1')],
      upgrades: [
        { id: 'c14-rifle', name: 'C-14 Rifle', replaces: 'Commando Rifle', weapons: [W('C-14 Rifle', 'assault', '12', 'All', '6', '3+', 'Light', 'D3+1', '1', 'BURST FIRE 8" (3)')] }
      ] },
    { id: 'point-defense-drone', name: 'Point Defense Drone', tag: 'Raynor\'s Raiders', slot: 'Other', role: 'Lifesaver', size: '-', speed: '-', armour: '6+', evade: '6+', hp: 3,
      brackets: [[1, 1, 0]],
      abilities: [
        A('Point Defense Laser', 'any', 'Passive', '', 'Another friendly unit within 4" is targeted by a ranged attack without INSTANT: remove up to 2 dice from the attack pool, then remove this drone.'),
        A('Gliding', 'any', 'Passive', '', 'This model has DISPLACEMENT.'),
        STRUCTURE],
      weapons: [],
      upgrades: [] }
  ];

  var cards = [
    { id: 'terran-armed-forces', name: 'Terran Armed Forces', type: 'faction', unique: true, bm: 1, slots: '3 Core, 1 Elite, 1 Support, 1 Air',
      abilities: [A('Tactical Retreat', 'move', 'Active', '', 'The active unit ignores the Disengage penalty for the rest of the round.'),
        A('Terran Tenacity', 'move', 'Active', '', 'Claim the First Player Marker. No other player may claim it for the rest of this phase.', 'once per game')] },
    { id: 'raynors-raiders', name: 'Raynor\'s Raiders', type: 'faction', tag: 'Raynor\'s Raiders', unique: true, bm: 1, slots: '3 Core, 1 Hero, 1 Support, 1 Air',
      abilities: [A('Rapid Ingress', 'move', 'Active', '', 'Set a friendly Point Defense Drone anywhere more than 1" from enemies. Remove it at end of round.'),
        A('Ready for Pickup?!', 'move', 'Active', '', 'The active unit resolves PLACE (12), not within engagement range of an enemy, instead of a standard action.', 'once per game'),
        R('Rapid Ingress: drone leaves', 'score', 'If you set a Point Defense Drone with Rapid Ingress, remove it now.', 'end of round')] },

    { id: 'academy', name: 'Academy', type: 'tactical', unique: true, bm: 1, slots: '2 Support',
      abilities: [A('Advanced Training', 'any', 'Reaction', '', 'Once per round, when a friendly Support unit uses a special ability that costs CP, it costs 1 less (minimum 0).', 'does not exhaust the card', { noExhaust: true })] },
    { id: 'barracks', name: 'Barracks', type: 'tactical', bm: 1, slots: '1 Core', abilities: [GO_GO] },
    { id: 'barracks-tech-lab', name: 'Barracks (Tech Lab)', type: 'tactical', unique: true, bm: 2, slots: '1 Core, 1 Elite',
      abilities: [GO_GO, A('Let\'s Have a Blast!', 'assault', 'Active', '', 'The active Biological unit\'s first ranged weapon used gains ANTI-EVADE (1).', 'shooting')] },
    { id: 'barracks-proxy', name: 'Barracks (Proxy)', type: 'tactical', unique: true, bm: 2, slots: '2 Core',
      abilities: [GO_GO, A('Armed and Ready', 'move', 'Active', '', 'The active Biological unit deploys from any table edge that isn\'t a player\'s entry edge, 10"+ from enemies. Not if another friendly Biological unit already deployed this round.', 'from reserves')] },
    { id: 'engineering-bay', name: 'Engineering Bay', type: 'tactical', bm: 1, slots: '1 Core',
      abilities: [A('Infantry Armor', 'any', 'Reaction', '', 'Before a friendly Biological unit makes an armour roll: it gains TOUGH (1) for that roll.'),
        A('Infantry Weapons', 'assault', 'Active', '', 'The active Biological unit\'s first ranged weapon used gains CRITICAL HIT (1).', 'shooting')] },
    { id: 'factory', name: 'Factory', type: 'tactical', bm: 1, slots: '2 Elite',
      abilities: [A('Field Repair', 'move', 'Active', '', 'The active Mechanical unit resolves HEAL (2).')] },
    { id: 'armory', name: 'Armory', type: 'tactical', bm: 1, slots: '1 Elite',
      abilities: [A('Vehicle Plating', 'any', 'Reaction', '', 'Before a friendly Mechanical unit makes an armour roll: it gains TOUGH (1) for that roll.'),
        A('Vehicle Weapons', 'assault', 'Active', '', 'The active Mechanical unit\'s first ranged weapon used gains CRITICAL HIT (1).', 'shooting')] },
    { id: 'dropship', name: 'Dropship', type: 'tactical', unique: true, bm: 1, slots: '1 Core, 1 Support',
      abilities: [A('Strap In!', 'move', 'Active', '', 'The active, unengaged Ground unit returns to reserves instead of taking an action.'),
        A('Ready for Dust-Off', 'move', 'Active', '', 'Place a faction indicator more than 10" from enemies. At end of round, deploy one Ground unit from reserves touching it.', 'pays off end of round'),
        R('Ready for Dust-Off: deploy', 'score', 'If you placed the indicator, deploy one Ground unit from reserves touching it.', 'end of round')] },
    { id: 'supply-depot', name: 'Supply Depot', type: 'tactical', unique: true, bm: 1, slots: '1 Core, 1 Elite, 1 Hero',
      abilities: [A('Additional Supply Depots', 'move', 'Active', '', 'The active unit counts 1 more Supply for controlling and contesting markers and completing objectives.')] },
    { id: 'orbital-command', name: 'Orbital Command', type: 'tactical', unique: true, bm: 1, slots: '1 Core',
      abilities: [A('Comsat Station', 'move', 'Active', '', 'Pick a table edge that isn\'t a player\'s entry edge. Until end of round, enemies can\'t deploy from it.'),
        A('Scanner Sweep', 'move', 'Active', '', 'Place a faction indicator anywhere. Enemy units within 6" of it lose Hidden.')] }
  ];

  window.TMG_DATA = window.TMG_DATA || { factions: {} };
  window.TMG_DATA.factions.terran = {
    id: 'terran', name: 'Terran',
    resource: { code: 'CP', name: 'CP' }, creepRule: false,
    theme: { ground: '#0F1317', accent: '#F28C28', accentRgb: '242,140,40', accentSoft: '#F7B26B', upg: '#F6D2A8', card: '#F6D2A8', panelSolid: '#1A2027', toastBg: '#26303A', blurb: 'Infantry, armour and orders' },
    sources: [
      { file: 'StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf', label: 'Wave 1 card sheets', version: 'May 2026, v1.0' }
    ],
    units: units,
    cards: cards
  };
})();
