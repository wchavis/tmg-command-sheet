/* Protoss card library for TMG Command Sheet.
 * Source: Archon Studio Protoss P2P card sheets (Wave 1 May 2026 v1.0; Waves 2-3 September 2026 v1.0).
 * Ability text is a short summary in our own words; the printed cards have the full wording.
 * Phases: any | move | assault | combat. Reminders use phase "assault" or "score".
 * shield: the SHIELD value. It is added to the first model's Hit Points; the unit keeps the
 * Shielded Status until its total damage exceeds the shield value (HEAL can't restore it).
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
  var CHARGE = A('Charge', 'assault', 'Active', '1 PE', 'For this unit\'s charge distance, roll 2D6 instead of D6 and add the higher result to its Speed.');
  var LEGS = A('Leg Enhancements', 'move', 'Active', '1 PE', 'Make a 2" Move. It doesn\'t count toward the action limit.');
  var SHADOWS = A('Path of Shadows', 'any', 'Active', '1 PE', 'Gains HIDDEN Status until it performs another action.');
  var TRANSFER = A('Psionic Transfer', 'move', 'Active', '1 PE', 'Set a Shade token wholly within 12" of a model in this unit. At the end of the round, you may set all its models in coherency using the Shade as the leading model. The Shade has DISPLACEMENT.');
  var TRANSFER_R = R('Psionic Transfer: Shade', 'score', 'If an Adept unit set a Shade token, you may set its models in coherency with the Shade now.', 'end of round');
  var FEEDBACK = A('Feedback', 'move', 'Active', '1 PE', 'Pick an enemy Mechanical or Psionic unit within 8". Until the end of the round, after it resolves an Active or Reaction special ability (not one from a tactical or faction card), it suffers NON-LETHAL DAMAGE (3).');
  var STORM = function (roll) {
    return 'Set a Psionic Storm token within 10" and Line of Sight (it stays if this unit is destroyed). At the end of each phase, center the Psionic Storm blast template on it. Each unit partly under it rolls 3 dice, +1 die per covered model; each ' + roll + ' = Movement phase: NON-LETHAL DAMAGE (1); Assault phase: 1 Damage.';
  };
  var QUICK = A('Quick Strikes', 'combat', 'Active', '', 'The active unit\'s first close combat weapon used gains PRECISION (2).');
  var RECALL = A('Strategic Recall', 'move', 'Active', '', 'The active, unengaged Ground unit returns to reserves instead of taking an action.');
  var STRIKE = function (roa, hit) { return W('Strike', 'combat', 'E', 'Ground', roa, hit, '-', '-', '1'); };
  var PSI_BLADES = W('Psi Blades', 'combat', 'E', 'Ground', '4', '3+', 'Light', 'D3', '1');

  var units = [
    /* ---- Wave 1 ---- */
    { id: 'adept', name: 'Adept', slot: 'Core', role: 'Damage Dealer', size: 2, shield: 2, speed: '5/8', armour: '5+', evade: '5+', hp: 3,
      brackets: [[1, 2, 0], [3, 4, 1]],
      abilities: [
        A('Psionic Presence', 'any', 'Passive', '', 'Friendly weapons targeting an enemy within 4" of this unit\'s Shade token gain PRECISION (1).'),
        TRANSFER, TRANSFER_R],
      weapons: [W('Glaive Cannon', 'assault', '8', 'All', '2', '3+', 'Light', 'D3+1', '1', 'ANTI-EVADE (1)'), STRIKE('1', '4+')],
      upgrades: [
        { id: 'resonating-glaves', name: 'Resonating Glaves', abilities: [A('Resonating Glaves', 'assault', 'Active', '1 PE', 'Its Glaive Cannon gains BUFF RoA (1).')] },
        { id: 'guidance', name: 'Guidance', abilities: [A('Guidance', 'assault', 'Passive', '', 'Its Glaive Cannon gains ANTI-EVADE (2).')] },
        { id: 'glaive-strike', name: 'Glaive Strike', replaces: 'Strike', weapons: [W('Glaive Strike', 'combat', 'E', 'Ground', '1', '4+', 'Light', 'D3', '1', 'PIERCE Light (2)')] }
      ] },
    { id: 'artanis', name: 'Artanis', unique: true, slot: 'Hero', role: 'Tank', size: 2, shield: 4, speed: '7', armour: '4+', evade: '5+', hp: 8,
      brackets: [[1, 1, 1]],
      abilities: [COMMANDER,
        A('Phase Prism', 'move', 'Passive', '', 'When deploying from reserves, may resolve PLACE (0) from another friendly unit; that unit returns to reserves. Artanis\'s activation ends.', 'from reserves'),
        A('Lightning Dash', 'assault', 'Reaction', '1 PE', 'After a successful charge, may declare a second charge against a different enemy, even while engaged. Devastating Charge doesn\'t trigger again.'),
        A('Hierarch\'s Stand', 'assault', 'Reaction', '1 PE', 'Another friendly unit within 8" is targeted by a ranged attack and this unit is a valid target: redirect the attack to this unit, which gets an Evade roll. Lasts until the end of the current activation.'),
        DEV(6, '4+')],
      weapons: [W('Twilight Blades Strike', 'combat', 'E', 'Ground', '2', '2+', 'Armoured', 'D3', '3'),
        W('Twilight Blades Sweep', 'combat', 'E', 'Ground', '6', '2+', 'Light', 'D3+1', '1')],
      upgrades: [] },
    { id: 'praetor-guard', name: 'Praetor Guard (Zealot)', unique: true, tag: 'Khalai', slot: 'Elite', role: 'Damage Dealer', size: 2, shield: 3, speed: '4/7', armour: '5+', evade: '5+', hp: 4,
      brackets: [[1, 1, 1], [2, 3, 2]],
      abilities: [
        A('Shield Overcharge', 'any', 'Passive', '', 'Gains TOUGH (2) on its first armour roll each round.'),
        LEGS, CHARGE, DEV(3, '4+'),
        A('Titan Killers', 'combat', 'Passive', '', 'Close combat attacks against a Size 3 or larger target have Damage 2.'),
        A('Precognition', 'combat', 'Passive', '', 'Gets an Evade roll against all attacks targeting it.')],
      weapons: [PSI_BLADES],
      upgrades: [] },
    { id: 'pylon', name: 'Pylon', tag: 'Khalai', slot: 'Other', role: 'Tactician', size: 3, shield: 2, speed: '-', armour: '5+', evade: '-', hp: 8,
      brackets: [[1, 1, 0]],
      abilities: [STRUCTURE,
        A('Khalai Ingenuity', 'any', 'Passive', '', 'Once per round, when a friendly unit within 4" uses a special ability that costs PE, it costs 1 PE less.'),
        A('Warp Conduit', 'move', 'Passive', '', 'Once per round, a Ground unit may deploy from reserves using this Pylon\'s base as its entry edge. Its activation ends.', 'from reserves')],
      weapons: [],
      upgrades: [] },
    { id: 'sentry', name: 'Sentry', slot: 'Support', role: 'Lifesaver', size: 1, shield: 2, speed: '4/7', armour: '5+', evade: '6+', hp: 4,
      brackets: [[1, 1, 0], [2, 2, 1]],
      abilities: [
        A('Restoration', 'any', 'Reaction', '1 PE', 'A friendly unit within 4" receives a DEBUFF: remove all its DEBUFFS.'),
        A('Guardian Shield', 'move', 'Active', '1 PE', 'Ranged attacks targeting a friendly unit within 4" (no Line of Sight needed) roll 1 fewer die.'),
        A('Force Field', 'move', 'Active', '1 PE', 'Set a Force Field token within 8" in unoccupied space. Size 2 or smaller can\'t move across it; Size 3+ can, and then it is removed.')],
      weapons: [W('Disruption Beam', 'assault', '8', 'All', '2', '2+', '-', '-', '1', 'INSTANT'), W('Beam', 'combat', 'E', 'Ground', '2', '3+', '-', '-', '1')],
      upgrades: [
        { id: 'solid-field-projectors', name: 'Solid-Field Projectors', abilities: [A('Solid-Field Projectors', 'move', 'Active', '1 PE', 'Set another Force Field token within 8" in unoccupied space. Size 2 or smaller can\'t move across it; Size 3+ can, and then it is removed.')] },
        { id: 'hallucination', name: 'Hallucination', abilities: [A('Hallucination', 'assault', 'Reaction', '0 PE', 'An enemy declares a ranged attack against a friendly unit within 4": the target gets an Evade roll against that attack.')] }
      ] },
    { id: 'stalker', name: 'Stalker', slot: 'Elite', role: 'Damage Dealer', size: 3, shield: 3, speed: '4/8', armour: '4+', evade: '6+', hp: 6,
      brackets: [[1, 1, 1], [2, 2, 2]],
      abilities: [
        A('Squadron', 'any', 'Passive', '', 'Horizontal coherency is 4".'),
        A('Blink', 'move', 'Active', '1 PE', 'Resolve PLACE (6). Models can\'t be set within an enemy\'s engagement range.')],
      weapons: [W('Particle Disruptors', 'assault', '12', 'All', '4', '3+', 'Armoured', 'D3', '2'), W('Stomp', 'combat', 'E', 'Ground', '2', '5+', '-', '-', '1')],
      upgrades: [
        { id: 'path-of-shadows', name: 'Path of Shadows', abilities: [SHADOWS] },
        { id: 'fury-of-the-nerazim', name: 'Fury of the Nerazim', abilities: [A('Fury of the Nerazim', 'assault', 'Passive', '', 'Attacking an enemy that has already activated this phase: its Particle Disruptors gain INSTANT.')] }
      ] },
    { id: 'zealot', name: 'Zealot', slot: 'Core', role: 'Damage Dealer', size: 2, shield: 3, speed: '4/7', armour: '5+', evade: '5+', hp: 4,
      brackets: [[1, 1, 1], [2, 3, 2]],
      abilities: [CHARGE, DEV(3, '4+')],
      weapons: [PSI_BLADES],
      upgrades: [
        { id: 'my-life-for-aiur', name: 'My Life for Aiur', abilities: [A('My Life for Aiur', 'any', 'Passive', '', 'When it resolves IMPACT, each eligible model rolls 1 extra IMPACT die.')] },
        { id: 'leg-enhancements', name: 'Leg Enhancements', abilities: [LEGS] },
        { id: 'zealous-round', name: 'Zealous Round', abilities: [A('Zealous Round', 'assault', 'Reaction', '0 PE', 'Not yet activated and takes damage: you may count it as activated this phase (flip its activation marker) to reduce the total damage by 2.')] },
        { id: 'we-stand-as-one', name: 'We Stand as One', abilities: [A('We Stand as One', 'combat', 'Passive', '', 'Close combat attack against a target engaged with at least 1 other friendly unit: its close combat weapon gains PRECISION (2).')] }
      ] },

    /* ---- Wave 2 ---- */
    { id: 'immortal', name: 'Immortal', slot: 'Elite', role: 'Tank', size: 3, shield: 6, speed: '7', armour: '4+', evade: '-', hp: 8,
      brackets: [[1, 1, 2]],
      abilities: [
        A('Improved Barrier', 'any', 'Reaction', '0 PE', 'When targeted by an attack while Shielded: the attacking weapon\'s Damage is at most 1 for this attack.'),
        INDOMITABLE, DEV(4, '3+')],
      weapons: [W('Left Photon Disruptor', 'assault', '12', 'Ground', '4', '3+', 'Armoured', 'D3', '2', 'CONCENTRATED FIRE (1), LONG RANGE (16)'),
        W('Right Photon Disruptor', 'assault', '12', 'Ground', '4', '3+', 'Armoured', 'D3', '2', 'CONCENTRATED FIRE (1), LONG RANGE (16), SIDEARM'),
        W('Stomp', 'combat', 'E', 'Ground', '3', '3+', '-', '-', '1')],
      upgrades: [
        { id: 'shield-overcharge', name: 'Shield Overcharge', abilities: [A('Shield Overcharge', 'any', 'Reaction', '1 PE', 'Before it makes an armour roll while Shielded: it gains TOUGH (2) for that roll.')] },
        { id: 'left-phase-disruptor', name: 'Left Phase Disruptor', replaces: 'Left Photon Disruptor', weapons: [W('Left Phase Disruptor', 'assault', '12', 'Ground', '4', '3+', 'Armoured', 'D3', '1', 'PIERCE Armoured (3)')] },
        { id: 'right-phase-disruptor', name: 'Right Phase Disruptor', replaces: 'Right Photon Disruptor', weapons: [W('Right Phase Disruptor', 'assault', '12', 'Ground', '4', '3+', 'Armoured', 'D3', '1', 'PIERCE Armoured (3), SIDEARM')] },
        { id: 'fury-unyielding', name: 'Fury Unyielding', abilities: [A('Fury Unyielding', 'assault', 'Passive', '', 'While within 3" of a mission marker, its ranged weapons gain CRITICAL HIT (1) against enemies also within 3" of that marker.')] },
        { id: 'for-the-ancients', name: 'For the Ancients', abilities: [A('For the Ancients', 'assault', 'Passive', '', 'Ranged attack against a target more than 8" away: the weapons gain PRECISION (1).')] }
      ] },
    { id: 'zeratul', name: 'Zeratul', unique: true, slot: 'Hero', role: 'Damage Dealer', size: 2, shield: 3, speed: '7', armour: '5+', evade: '5+', hp: 5,
      brackets: [[1, 1, 1]],
      abilities: [
        A('One with the Shadows', 'any', 'Passive', '', 'After it fully resolves an action, it gains HIDDEN Status.'),
        A('Prophetic Vision', 'any', 'Reaction', '1 PE', 'Repeatable. When targeted by an attack: its Evade counts as 4+ for this attack and can\'t be modified.'),
        A('Sentenced to Death', 'move', 'Active', '1 PE', 'Pick an enemy unit anywhere. Zeratul\'s close combat attacks against it gain CRITICAL HIT (2).'),
        A('Void Prison', 'move', 'Active', '1 PE', 'Set a faction indicator within 8". Enemy units within 2" of it suffer DEBUFF SPEED (2).'),
        A('Void Blink', 'assault', 'Active', '1 PE', 'If unengaged, resolve PLACE (6).'),
        DEV(4, '4+'),
        A('Shadow Strike', 'combat', 'Active', '1 PE', 'All enemy units engaged with this unit suffer HITS 4 (1).')],
      weapons: [W('Master Warp Blade', 'combat', 'E', 'Ground', '4', '3+', 'Light, Armoured', 'D3', '2', 'INSTANT')],
      upgrades: [] },
    { id: 'nerazim-watchers', name: 'Nerazim Watchers (Adept)', tag: 'Nerazim', slot: 'Core', role: 'Damage Dealer', size: 2, shield: 2, speed: '5/8', armour: '5+', evade: '5+', hp: 3,
      brackets: [[1, 2, 0], [3, 4, 1]],
      abilities: [SHADOWS,
        A('Nerazim Farsight', 'any', 'Passive', '', 'Enemy units within 6" of this unit\'s Shade token lose HIDDEN Status.'),
        TRANSFER, TRANSFER_R],
      weapons: [W('Glaive Cannon', 'assault', '8', 'All', '3', '3+', 'Light', 'D3+1', '1', 'ANTI-EVADE (1), PINPOINT'), STRIKE('1', '5+')],
      upgrades: [] },

    /* ---- Wave 3 ---- */
    { id: 'tassadar', name: 'Tassadar', unique: true, slot: 'Hero', role: 'Tactician', size: 2, shield: 3, speed: '7', armour: '5+', evade: '5+', hp: 6,
      brackets: [[1, 1, 1]],
      abilities: [COMMANDER,
        A('Force Wall', 'move', 'Active', '1 PE', 'Set two Force Wall tokens wholly within 8" in unoccupied space. Size 2 or smaller can\'t move across them; Size 3+ can, and then the token is removed.'),
        A('Khala\'s Gift', 'move', 'Active', '0 PE', 'Another friendly Biological unit within 12": until the end of the round, its first special ability costs 1 less (minimum 0).'),
        A('Executor\'s Will', 'move', 'Active', '1 PE', 'Pick two enemy units (no Line of Sight needed) and place a faction indicator by each. Next Assault phase, if either ends its activation while its indicator remains, you may activate two friendly units in a row. Remove both indicators after any enemy completes its activation in that phase.'),
        A('Psi Lightning', 'assault', 'Active', '0 PE', 'Each unit within 2" of one or more friendly Force Wall tokens suffers 1 Damage.'),
        A('Telekinetic Push', 'assault', 'Active', '1 PE', 'Move each friendly Force Wall token to a spot wholly within 6" of where it is.')],
      weapons: [W('Resonance Beam', 'assault', '12', 'All', '6', '3+', 'Armoured', 'D3', '1', 'INSTANT'), STRIKE('6', '4+')],
      upgrades: [] },
    { id: 'twilight-templar', name: 'Twilight Templar (High Templar)', unique: true, tag: 'Templar Caste', slot: 'Support', role: 'Damage Dealer', size: 2, shield: 3, speed: '4/7', armour: '5+', evade: '6+', hp: 3,
      brackets: [[1, 1, 0], [2, 2, 1]],
      abilities: [
        A('Bound by the Khala', 'any', 'Reaction', '0 PE', 'Another friendly unit within 8" loses Supply: ready one non-unique exhausted tactical card.'),
        A('Psionic Gale', 'move', 'Active', '2 PE', STORM('4+')),
        FEEDBACK,
        A('Warp-In', 'move', 'Active', '1 PE', 'Resolve PLACE (6).')],
      weapons: [W('Psi Blast', 'assault', '8', 'All', '2', '3+', 'Light', 'D3', '2', 'INSTANT'), STRIKE('1', '4+')],
      upgrades: [] },
    { id: 'high-templar', name: 'High Templar', slot: 'Support', role: 'Damage Dealer', size: 2, shield: 3, speed: '4/7', armour: '5+', evade: '6+', hp: 3,
      brackets: [[1, 1, 0], [2, 2, 1], [3, 4, 2]],
      abilities: [
        A('Our Minds as One', 'any', 'Passive', '', 'While its current Supply is 2: its first special ability each round costs 1 PE less (minimum 0), and +1 to the dice for its Psionic Storm.'),
        FEEDBACK],
      weapons: [W('Psi Blast', 'assault', '8', 'All', '1', '3+', 'Light', 'D3', '2', 'INSTANT'), STRIKE('1', '4+')],
      upgrades: [
        { id: 'psionic-storm', name: 'Psionic Storm', abilities: [A('Psionic Storm', 'move', 'Active', '2 PE', STORM('5+'))] },
        { id: 'farsight', name: 'Farsight', abilities: [A('Farsight', 'move', 'Active', '1 PE', 'A friendly unit within 12" gets an Evade roll against all attacks targeting it until the end of the round.')] }
      ] }
  ];

  var cards = [
    /* ---- Wave 1 ---- */
    { id: 'daelaam', name: 'Daelaam', type: 'faction', unique: true, bm: 1, slots: '3 Core, 1 Elite, 1 Support, 1 Air',
      abilities: [A('Dae\'uhl', 'any', 'Reaction', '', 'A friendly unit takes damage: reduce the total by 2 (minimum 1).'),
        A('Mass Recall', 'move', 'Active', '', 'Set a faction indicator anywhere. All friendly Protoss units within 6" of it return to reserves.', 'once per game')] },
    { id: 'khalai', name: 'Khalai', type: 'faction', tag: 'Khalai', unique: true, bm: 1, slots: '3 Core, 2 Elite, 1 Hero',
      abilities: [A('Pylon Warp-In', 'move', 'Active', '', 'If there is no friendly Pylon on the battlefield, set one anywhere on ground level more than 10" from enemy models. This round, it can\'t use its special abilities (except Structure).'),
        A('Bound by the Khala', 'move', 'Active', '', 'At the end of the active unit\'s activation, pick another friendly unit eligible to activate this phase and activate it right away.')] },
    { id: 'gate-chronoboosted', name: 'Gate Chronoboosted', type: 'tactical', unique: true, bm: 1, slots: '1 Core, 1 Elite',
      abilities: [A('Zealous Charge', 'move', 'Active', '', 'The active unit gains BUFF SPEED (2).'), QUICK] },
    { id: 'warp-prism', name: 'Warp Prism', type: 'tactical', unique: true, bm: 1, slots: '2 Core',
      abilities: [A('Phase', 'move', 'Active', '', 'The active unit resolves PLACE (3).'),
        A('Warp Conduit', 'move', 'Active', '', 'Set a faction indicator more than 10" from enemy models. At the end of the round, you may deploy one Ground unit from reserves touching it.', 'pays off end of round'),
        R('Warp Conduit: deploy', 'score', 'If you set the indicator, you may deploy one Ground unit from reserves touching it.', 'end of round')] },
    { id: 'gateway', name: 'Gateway', type: 'tactical', bm: 1, slots: '1 Core', abilities: [QUICK] },
    { id: 'warp-gate', name: 'Warp Gate', type: 'tactical', unique: true, bm: 1, slots: '2 Core',
      abilities: [A('Warp In', 'move', 'Active', '', 'The active Ground unit deploys from any table edge that isn\'t a player\'s entry edge, ending more than 10" from enemies. Not if another friendly Ground unit already deployed this round.', 'from reserves'), QUICK] },
    { id: 'overcharged-nexus', name: 'Overcharged Nexus', type: 'tactical', unique: true, bm: 1, slots: '1 Core, 1 Elite',
      abilities: [A('Photon Overcharge', 'any', 'Reaction', '', 'An enemy unit enters from reserves somewhere other than its own entry edge: it suffers HITS 3 (1).'), RECALL] },
    { id: 'twilight-council', name: 'Twilight Council', type: 'tactical', unique: true, bm: 1, slots: '1 Support, 1 Elite',
      abilities: [A('Veil of Shadows', 'any', 'Reaction', '', 'After a friendly unit resolves a PLACE effect: it resolves HEAL (2).'),
        A('Weapons of the Firstborn', 'assault', 'Active', '', 'The active Ground unit\'s first ranged weapon used gains BUFF RANGE (4).', 'shooting')] },
    { id: 'forge', name: 'Forge', type: 'tactical', bm: 1, slots: '1 Elite',
      abilities: [A('Ground Armor', 'any', 'Reaction', '', 'Before a friendly Ground unit makes an armour roll: it gains TOUGH (1) for that roll.'),
        A('Ground Weapons', 'assault', 'Active', '', 'The active Ground unit\'s first ranged weapon used gains CRITICAL HIT (1).', 'shooting')] },
    { id: 'nexus', name: 'Nexus', type: 'tactical', unique: true, bm: 1, slots: '2 Core',
      abilities: [A('Ancient Pride', 'any', 'Active', '', 'The active unit\'s first weapon used gains INSTANT.'), RECALL] },
    { id: 'power-field', name: 'Power Field', type: 'tactical', unique: true, bm: 1, slots: '1 Core, 1 Elite, 1 Hero',
      abilities: [A('Guardian Shell', 'any', 'Reaction', '', 'Before a friendly Ground unit makes an armour roll: it gains DODGE (2) for that roll.')] },
    { id: 'observer', name: 'Observer', type: 'tactical', unique: true, bm: 1, slots: '1 Support',
      abilities: [A('Surveillance', 'move', 'Active', '', 'Set a faction indicator anywhere. Enemy units within 6" of it lose HIDDEN Status.'),
        A('Gravitic Boosters', 'assault', 'Reaction', '', 'After a friendly unit rolls a D6 for charge distance: add 1.')] },

    /* ---- Wave 2 ---- */
    { id: 'nerazim', name: 'Nerazim', type: 'faction', tag: 'Nerazim', unique: true, bm: 1, slots: '2 Core, 3 Elite, 1 Hero',
      abilities: [A('Might of the Nerazim', 'any', 'Reaction', '', 'A friendly unit loses HIDDEN Status: it gains BUFF SPEED (2), and its first weapon used gains CRITICAL HIT (2).'),
        A('Darkness Descends', 'move', 'Active', '', 'The active Biological unit gains HIDDEN Status until the end of the round.')] },
    { id: 'robotics-facility', name: 'Robotics Facility', type: 'tactical', bm: 1, slots: '2 Elite',
      abilities: [A('Plasma Shields', 'any', 'Reaction', '', 'Before a friendly Mechanical Ground unit makes an armour roll while Shielded: it gains TOUGH (1) and DODGE (1) for that roll.')] },
    { id: 'void-seeker', name: 'Void Seeker', type: 'tactical', tag: 'Nerazim', unique: true, bm: 1, slots: '1 Core',
      abilities: [A('Personal Transport', 'move', 'Active', '', 'Instead of an action, the active unengaged Ground unit returns to reserves, then makes a Deploy action.'),
        A('Anakh Su\'n', 'move', 'Active', '', 'The active unit gains HIDDEN Status until it performs another action.')] },

    /* ---- Wave 3 ---- */
    { id: 'templar-caste', name: 'Templar Caste', type: 'faction', tag: 'Templar Caste', unique: true, bm: 1, slots: '3 Core, 2 Support, 1 Hero',
      abilities: [A('Our Duty Is Unending', 'any', 'Active', '', 'Ready up to two of your exhausted tactical cards.', 'once per game'),
        A('Khassar de Templari', 'any', 'Active', '', 'Instead of an action, pick another friendly Biological unit that already activated this phase. It performs one action available this phase, then suffers NON-LETHAL DAMAGE (3).')] },
    { id: 'templar-archives', name: 'Templar Archives', type: 'tactical', unique: true, bm: 1, slots: '2 Support',
      abilities: [A('Ancestral Wisdom', 'any', 'Reaction', '', 'Once per round, when a friendly Support unit uses a special ability that costs PE, it costs 1 PE less (minimum 0).', 'does not exhaust the card', { noExhaust: true })] }
  ];

  window.TMG_DATA = window.TMG_DATA || { factions: {} };
  window.TMG_DATA.factions.protoss = {
    id: 'protoss', name: 'Protoss',
    resource: { code: 'PE', name: 'Psionic Energy' }, creepRule: false,
    theme: { ground: '#0B1322', accent: '#EBC04F', accentRgb: '235,192,79', accentSoft: '#F2D488', upg: '#A9D1FF', card: '#A9D1FF', panelSolid: '#121D31', toastBg: '#1B2944', blurb: 'Shields, psionics and warp' },
    sources: [
      { file: 'StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf', label: 'Wave 1 card sheets', version: 'May 2026, v1.0' },
      { file: 'StarCraft-Protoss-P2P-W2-Card-Sheets-A4_EN.pdf', label: 'Wave 2 card sheets', version: 'September 2026, v1.0' },
      { file: 'StarCraft-Protoss-P2P-W3-Card-Sheets-A4_EN.pdf', label: 'Wave 3 card sheets', version: 'September 2026, v1.0' }
    ],
    units: units,
    cards: cards
  };
})();
