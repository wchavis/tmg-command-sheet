/* Zerg card library for TMG Command Sheet.
 * Source: Archon Studio Zerg P2P card sheets (Wave 1 May 2026 v1.0, Wave 2 v1.06.26, Wave 3 September 2026 v1.0).
 * Ability text is a short summary in our own words; the printed cards have the full wording.
 * Phases: any | move | assault | combat. Reminders use phase "assault" or "score".
 */
(function () {
  var A = function (name, phase, kind, cost, text, note) {
    return { name: name, phase: phase, kind: kind, cost: cost || '', text: text, note: note || '' };
  };
  var W = function (name, phase, rng, tgt, roa, hit, surge, sdice, dmg, kw) {
    return { name: name, phase: phase, rng: rng, tgt: tgt, roa: roa, hit: hit, surge: surge, sdice: sdice, dmg: dmg, kw: kw || '-' };
  };
  var R = function (name, phase, text, note) {
    return { name: name, phase: phase, kind: 'Reminder', cost: '', text: text, note: note || '' };
  };

  var SQUADRON = A('Squadron', 'any', 'Passive', '', 'This unit\'s horizontal coherency is 4".');
  var BURROW_AMBUSH = A('Burrow Ambush', 'move', 'Passive', '', 'Deploying from reserves: may resolve PLACE (18) from your entry edge. No model within 10" of an enemy. Activation then ends.', 'from reserves');
  var METABOLIC = A('Metabolic Boost', 'assault', 'Active', '1 BM', 'For charge distance, roll 2D6 instead of D6 and add the higher result to Speed.', 'charging');
  var DEV = function (n, roll) { return A('Devastating Charge', 'assault', 'Passive', '', 'Right after a successful charge, resolve IMPACT (' + n + ') ' + roll + '.', 'on charge'); };
  var RECON = A('Zergling Reconstitution', 'move', 'Active', '1 BM', 'Resolve RESPAWN (2), or RESPAWN (3) if the unit is on Creep.');
  var ROACH_BURROW = A('Burrow', 'any', 'Active', '2 BM', 'If unengaged, this unit gains or loses Burrowed.');
  var REGEN = A('Regeneration', 'assault', 'Passive', '', 'When this unit activates while Burrowed, resolve HEAL (2).', 'on activation');
  var RAPTOR_STRAIN = A('Raptor Strain', 'any', 'Passive', '', 'Moves through impassable terrain of Size 4 or less and changes elevation without access points.');
  var ADRENAL_OVERLOAD = A('Adrenal Overload', 'assault', 'Active', '1 BM', '+1 to all IMPACT hit rolls.', 'charging');
  var TRANSFUSION = A('Transfusion', 'any', 'Reaction', '1 BM', 'Another friendly Biological unit (or Structure) within 4" takes damage: reduce the total by 2 before allocating.');
  var PSIONIC_LINK = A('Psionic Link', 'any', 'Passive', '', 'Once per round, with 7+ friendly models within 6", one special ability costs 1 less BM.');
  var COMMANDER = A('Commander', 'any', 'Passive', '', 'Counts as 1 more Supply for controlling and contesting markers, completing objectives, and Disengage checks.');
  var DETECTION = A('Detection', 'any', 'Passive', '', 'Enemy units within 6" of this unit lose Hidden.');
  var SOURCE_OF_CREEP = A('Source of Creep', 'any', 'Passive', '', 'Friendly or enemy Ground Zerg units within 6" count as on Creep.');
  var INDOMITABLE = A('Indomitable', 'assault', 'Passive', '', 'While engaged, may shoot and be shot by unengaged enemy units. The defender gets an Evade roll against those attacks.');
  var CREEP_REMOVAL = A('Creep Removal', 'any', 'Passive', '', 'An enemy unit that ends a Move, Deploy, Run, Charge or Disengage within 1" of a friendly Creep Tumor removes that tumor.');
  var LIVING_GLOB = A('Living Glob of Tissue', 'any', 'Passive', '', 'Creep Tumors have STAY IN PLAY and DISPLACEMENT.');
  var ZERG_CREEP = A('Zerg Creep', 'any', 'Passive', '', 'During army building, take exactly one Creep card and pay its cost.', 'army building');
  var CREEP_SPREAD = A('Creep Spread', 'move', 'Active', '', 'Place a Creep Tumor within 6" of a friendly entry edge or friendly Creep Tumor. No line of sight needed.');

  var ROACH_UPGRADES = function (glialCost, tunnelPhase) {
    return [
      { id: 'tunneling-claws', name: 'Tunneling Claws', abilities: [A('Tunneling Claws', tunnelPhase, 'Passive', '', 'While Burrowed, may Move and Run without losing Burrowed, and may move through other units\' bases.')] },
      { id: 'glial', name: 'Glial Reconstitution', abilities: [A('Glial Reconstitution', 'move', 'Active', glialCost, 'Gain BUFF SPEED (1), or BUFF SPEED (2) if on Creep.')] },
      { id: 'burrow-ambush', name: 'Burrow Ambush', abilities: [BURROW_AMBUSH] },
      { id: 'hydriodic-bile', name: 'Hydriodic Bile', mods: [{ weapon: 'Acid Saliva', surge: 'Light', sdice: 'D3+1' }] }
    ];
  };
  var LING_UPGRADES = [
    { id: 'burrow-ambush', name: 'Burrow Ambush', abilities: [BURROW_AMBUSH] },
    { id: 'shredding-claws', name: 'Shredding Claws', replaces: 'Claws', weapons: [W('Shredding Claws', 'combat', 'E', 'Ground', '2', '4+', 'Light, Armoured', 'D3', '1')] },
    { id: 'adrenal-glands', name: 'Adrenal Glands', mods: [{ weapon: 'Claws', addKw: 'PRECISION (2)' }, { weapon: 'Shredding Claws', addKw: 'PRECISION (2)' }] }
  ];

  var units = [
    { id: 'zergling', name: 'Zergling', slot: 'Core', role: 'Damage Dealer', size: 1, speed: '4/8', armour: '6+', evade: '4+', hp: 1,
      brackets: [[1, 6, 0], [7, 12, 1], [13, 18, 2]],
      abilities: [SQUADRON, METABOLIC, DEV(1, '5+')],
      weapons: [W('Claws', 'combat', 'E', 'Ground', '2', '4+', 'Light', 'D3', '1')],
      upgrades: LING_UPGRADES },
    { id: 'raptor', name: 'Raptor (Zergling)', slot: 'Elite', role: 'Damage Dealer', size: 1, speed: '5/9', armour: '6+', evade: '4+', hp: 1,
      brackets: [[1, 6, 0], [7, 12, 1], [13, 18, 2]],
      abilities: [SQUADRON, RAPTOR_STRAIN, ADRENAL_OVERLOAD, METABOLIC, DEV(1, '5+')],
      weapons: [W('Claws', 'combat', 'E', 'Ground', '2', '4+', 'Light', 'D3', '1')],
      upgrades: LING_UPGRADES },
    { id: 'swarmling', name: 'Swarmling (Zergling)', slot: 'Core', role: 'Damage Dealer', size: 1, speed: '4/8', armour: '6+', evade: '5+', hp: 1,
      brackets: [[1, 6, 0], [7, 18, 1]],
      abilities: [SQUADRON, RECON, DEV(1, '5+'), METABOLIC],
      weapons: [W('Claws', 'combat', 'E', 'Ground', '2', '5+', '-', '-', '1')],
      upgrades: [{ id: 'burrow-ambush', name: 'Burrow Ambush', abilities: [BURROW_AMBUSH] }] },
    { id: 'vileling', name: 'Vileling (Zergling)', tag: 'Zagara\'s Swarm', slot: 'Core', role: 'Damage Dealer', size: 1, speed: '4/8', armour: '6+', evade: '5+', hp: 1,
      brackets: [[1, 6, 1], [7, 18, 2]],
      abilities: [SQUADRON, RECON, BURROW_AMBUSH, DEV(1, '5+'), METABOLIC,
        A('Debilitating Claws', 'combat', 'Passive', '', 'After an enemy unit takes damage from this unit, apply DEBUFF Hit (1) to each of its weapons.')],
      weapons: [W('Claws', 'combat', 'E', 'Ground', '2', '5+', '-', '-', '1')],
      upgrades: [] },
    { id: 'ks-raptor', name: 'Kerrigan Swarm Raptor (Zergling)', tag: 'Kerrigan\'s Swarm', unique: true, slot: 'Elite', role: 'Damage Dealer', size: 1, speed: '5/9', armour: '5+', evade: '4+', hp: 2,
      brackets: [[1, 3, 0], [4, 6, 1]],
      abilities: [SQUADRON, RAPTOR_STRAIN,
        A('Leap', 'assault', 'Active', '1 BM', '+2 to this unit\'s charge distance.', 'charging'),
        DEV(2, '5+'), ADRENAL_OVERLOAD],
      weapons: [W('Claws', 'combat', 'E', 'Ground', '2', '3+', 'Light, Armoured', 'D6', '1', 'INSTANT')],
      upgrades: [] },
    { id: 'hydralisk', name: 'Hydralisk', slot: 'Elite', role: 'Damage Dealer', size: 2, speed: '4/8', armour: '5+', evade: '5+', hp: 4,
      brackets: [[1, 1, 1], [2, 2, 2], [3, 4, 3]],
      abilities: [SQUADRON,
        A('Lunge', 'assault', 'Reaction', '1 BM', 'When another friendly unit within 10" is targeted by a ranged attack: after it resolves, this unit (if unengaged) may Move directly toward the attacker.')],
      weapons: [W('Needle Spines', 'assault', '12', 'All', '3', '3+', 'Light, Armoured', 'D3+1', '2'),
        W('Scythe', 'combat', 'E', 'Ground', '2', '4+', '-', '-', '1')],
      upgrades: [
        { id: 'ancillary-carapace', name: 'Ancillary Carapace', abilities: [A('Ancillary Carapace', 'any', 'Passive', '', 'TOUGH (1) on the first armour roll of each activation.')] },
        { id: 'lurking', name: 'Lurking', abilities: [A('Lurking', 'any', 'Passive', '', 'If Stationary, may Evade the first ranged attack against it this round; +1 to that roll on Creep.')] },
        { id: 'burrow-ambush', name: 'Burrow Ambush', abilities: [BURROW_AMBUSH] },
        { id: 'grooved-spines', name: 'Grooved Spines', mods: [{ weapon: 'Needle Spines', addKw: 'LONG RANGE (16")' }] }
      ] },
    { id: 'roach', name: 'Roach', slot: 'Core', role: 'Tank', size: 2, speed: '4/7', armour: '3+', evade: '5+', hp: 4,
      brackets: [[1, 1, 0], [2, 3, 1]],
      abilities: [ROACH_BURROW, REGEN, DEV(2, '4+')],
      weapons: [W('Acid Saliva', 'assault', '8', 'Ground', '3', '3+', '-', '-', '1'),
        W('Claws', 'combat', 'E', 'Ground', '2', '4+', '-', '-', '1')],
      upgrades: ROACH_UPGRADES('1 BM', 'any') },
    { id: 'corpser', name: 'Corpser (Roach)', slot: 'Core', role: 'Tank', size: 2, speed: '4/7', armour: '3+', evade: '5+', hp: 4,
      brackets: [[1, 1, 0], [2, 3, 1]],
      abilities: [ROACH_BURROW,
        A('Roachling Infestation', 'move', 'Active', '2 BM', 'Resolve SUMMON (Roachling).', 'once per game'),
        REGEN, DEV(3, '4+')],
      weapons: [W('Acid Saliva', 'assault', '8', 'Ground', '2', '3+', '-', '-', '1'),
        W('Claws', 'combat', 'E', 'Ground', '3', '4+', 'Light', 'D3+1', '1')],
      upgrades: ROACH_UPGRADES('1 BM', 'any') },
    { id: 'vile', name: 'Vile (Roach)', slot: 'Core', role: 'Tank', size: 2, speed: '4/7', armour: '3+', evade: '5+', hp: 4,
      brackets: [[1, 1, 0], [2, 3, 1]],
      abilities: [ROACH_BURROW,
        A('Debilitating Saliva', 'any', 'Reaction', '1 BM', 'An enemy unit within 8" declares a ranged attack: apply DEBUFF Hit (1) to each of its ranged weapons.'),
        DEV(1, '4+'), REGEN],
      weapons: [W('Acid Saliva', 'assault', '8', 'Ground', '4', '3+', '-', '-', '1'),
        W('Vile Claws', 'combat', 'E', 'Ground', '2', '4+', '-', '-', '1')],
      upgrades: ROACH_UPGRADES('1 BM', 'move') },
    { id: 'roachling', name: 'Roachling', slot: 'Summoned', role: 'Tank', size: 1, speed: '4/7', armour: '6+', evade: '6+', hp: 1,
      brackets: [[1, 3, 0]],
      abilities: [A('Underdeveloped Claws', 'any', 'Passive', '', 'This unit can\'t gain Burrowed.')],
      weapons: [W('Claws', 'combat', 'E', 'Ground', '2', '4+', '-', '-', '1')],
      upgrades: [] },
    { id: 'ravager', name: 'Ravager', slot: 'Core', role: 'Tactician', size: 3, speed: '4/8', armour: '5+', evade: '5+', hp: 9,
      brackets: [[1, 1, 1], [2, 2, 2]],
      abilities: [SQUADRON,
        A('Deep Tunnel', 'move', 'Active', '1 BM', 'Place a Ravager Burrow token wholly within 12" of a model in this unit. At end of round, may set the unit around it in coherency (token as leading model). Token has DISPLACEMENT.', 'arrives end of round'),
        A('Corrosive Bile', 'move', 'Active', '1 BM', 'Per model, place a Corrosive Bile token within 14" of it. Resolves at end of the Assault phase.', 'set now, lands later'),
        DEV(2, '4+'),
        R('Corrosive Bile lands', 'assault', 'End of this phase: each unit suffers HITS 5 (1) per bile token within 1" of it. Then remove all of this unit\'s bile tokens.', 'end of assault phase'),
        R('Deep Tunnel: arrive', 'score', 'If you placed a Ravager Burrow token, you may set the Ravagers around it in coherency.', 'end of round')],
      weapons: [W('Plasma Discharge', 'assault', '12', 'Ground', '4', '3+', 'Light', 'D3+1', '1'),
        W('Claws', 'combat', 'E', 'Ground', '2', '4+', '-', '-', '1')],
      upgrades: [
        { id: 'bloated-bile-ducts', name: 'Bloated Bile Ducts', abilities: [A('Bloated Bile Ducts', 'any', 'Passive', '', 'Corrosive Bile\'s area of effect becomes 2".')] },
        { id: 'burrow-ambush', name: 'Burrow Ambush', abilities: [BURROW_AMBUSH] },
        { id: 'potent-bile', name: 'Potent Bile', abilities: [A('Potent Bile', 'assault', 'Passive', '', 'Before an enemy rolls armour against Corrosive Bile HITS, it suffers DEBUFF Armour (1).')] }
      ] },
    { id: 'queen', name: 'Queen', slot: 'Support', role: 'Lifesaver', size: 3, speed: '4', armour: '4+', evade: '-', hp: 9,
      brackets: [[1, 1, 1]],
      abilities: [
        A('Spawn Creep Tumor', 'any', 'Active', '1 BM', 'Place a Creep Tumor in base contact with this unit.'),
        TRANSFUSION,
        A('Restoration', 'any', 'Reaction', '1 BM', 'A friendly unit within 4" receives a DEBUFF: remove all its DEBUFFS.'),
        PSIONIC_LINK, DEV(4, '3+')],
      weapons: [W('Talons', 'assault', '6', 'Ground', '4', '4+', 'Light', 'D3', '2'),
        W('Acid Spines', 'assault', '12', 'Flying', '4', '4+', 'Light, Armoured', 'D3', '2'),
        W('Talons', 'combat', 'E', 'Ground', '3', '4+', '-', '-', '1')],
      upgrades: [
        { id: 'creep-speed', name: 'Creep Speed', abilities: [A('Creep Speed', 'any', 'Passive', '', '+2 Speed while on Creep.')] },
        { id: 'domineering-presence', name: 'Domineering Presence', abilities: [A('Domineering Presence', 'move', 'Active', '1 BM', 'Another friendly unit within 6" (no line of sight needed) gets +1 Supply for markers and objectives.')] }
      ] },
    { id: 'kerrigan', name: 'Kerrigan', unique: true, slot: 'Hero', role: 'Damage Dealer', size: 2, speed: '7', armour: '5+', evade: '6+', hp: 9,
      brackets: [[1, 1, 1]],
      abilities: [COMMANDER,
        A('Crushing Grip', 'move', 'Active', '1 BM', 'Pick an enemy unit within 12". It counts as activated this phase (set an activation marker by it).'),
        A('Mutating Carapace', 'move', 'Active', '1 BM', 'Pick an enemy unit within 18". Kerrigan may Evade all its attacks with +2.'),
        A('Leaping Strike', 'assault', 'Active', '1 BM', 'If unengaged, resolve PLACE (6).'),
        DEV(4, '4+')],
      weapons: [W('Energy Blast', 'assault', '8', 'All', '5', '3+', 'Light, Armoured', 'D3', '1'),
        W('Blades', 'combat', 'E', 'Ground', '6', '4+', '-', '-', '2', 'CRITICAL HIT (2)')],
      upgrades: [] },
    { id: 'zagara', name: 'Zagara', unique: true, slot: 'Hero', role: 'Tactician', size: 3, speed: '7', armour: '4+', evade: '6+', hp: 10,
      brackets: [[1, 1, 1]],
      abilities: [COMMANDER, TRANSFUSION, PSIONIC_LINK,
        A('Infested Drop', 'move', 'Passive', '', 'Zagara\'s base is an entry edge. Each round, friendly units with a combined Supply cost of 1 may deploy through it.'),
        INDOMITABLE, DEV(6, '3+')],
      weapons: [W('Zagara\'s Talons', 'assault', '8', 'Ground', '4', '3+', 'Light, Armoured', 'D3', '2'),
        W('Zagara\'s Acid Spines', 'assault', '14', 'Flying', '8', '3+', 'Light, Armoured', 'D3', '1'),
        W('Talons', 'combat', 'E', 'Ground', '4', '3+', '-', '-', '1')],
      upgrades: [
        { id: 'broodmother', name: 'Broodmother', abilities: [A('Broodmother', 'move', 'Active', '1 BM', 'All friendly units (no line of sight needed) get one effect, not the one you chose last round: Size 1 +1 to IMPACT rolls; Size 2 weapons gain CRITICAL HIT (1); Size 3+ gain TOUGH (1).')] }
      ] },
    { id: 'defiler', name: 'Defiler', slot: 'Support', role: 'Lifesaver', size: 2, speed: '7', armour: '5+', evade: '5+', hp: 8,
      brackets: [[1, 1, 1]],
      abilities: [
        A('Consume', 'any', 'Passive', '', 'When resolving a special ability that costs BM, may remove one model from a friendly unit within 4" to generate 1 BM toward it.'),
        A('Gestate Dark Swarm', 'move', 'Active', '0 BM', 'Place a Dark Swarm token in open space within 4" and line of sight. It has DISPLACEMENT.'),
        A('Dark Swarm', 'assault', 'Reaction', '1 BM', 'Repeatable. A friendly unit within 4" of a Dark Swarm token is attacked: if this unit is also within 4" of it, the target may Evade (+1 if Size 1).'),
        DEV(4, '4+')],
      weapons: [W('Claws', 'combat', 'E', 'Ground', '4', '3+', '-', '-', '1')],
      upgrades: [
        { id: 'burrow-ambush', name: 'Burrow Ambush', abilities: [BURROW_AMBUSH] },
        { id: 'plague', name: 'Plague', abilities: [A('Plague', 'assault', 'Active', '1-3 BM', 'Spend 1 to 3 BM. Place the Plague Blast template wholly within 10" and in sight. Each unit partly covered rolls 2 dice +1 per extra covered model, loses Hidden, and suffers NON-LETHAL DAMAGE (1) per 5+ (1 BM), 4+ (2 BM) or 3+ (3 BM).')] },
        { id: 'cancerous-bite', name: 'Cancerous Bite', weapons: [W('Cancerous Bite', 'combat', 'E', 'Ground', '2', '3+', '-', '-', '2', 'CRITICAL HIT (1), SIDEARM')] }
      ] },
    { id: 'bile-launcher', name: 'Bile Launcher', unique: true, slot: 'Support', role: 'Damage Dealer', size: 3, speed: '-', armour: '4+', evade: '-', hp: 10,
      brackets: [[1, 1, 1]],
      abilities: [
        A('Biological Structure', 'any', 'Passive', '', 'Can\'t gain Burrowed, can\'t return to reserves, and is immune to the IMPACT keyword.'),
        DETECTION, SOURCE_OF_CREEP, BURROW_AMBUSH,
        A('Bombard', 'move', 'Active', '1 BM', 'Place a Bile Bomb token within 24". Bile Bomb attacks this round may ignore range and hit an enemy within 3" of the token, ignoring line of sight and Hidden. Afterward the token becomes a Creep Tumor. Token has DISPLACEMENT.'),
        INDOMITABLE],
      weapons: [W('Bile Bomb', 'assault', '12', 'Ground', '6', '3+', 'Light, Armoured', 'D3', '1', 'PIERCE Armoured (2), PINPOINT')],
      upgrades: [] },
    { id: 'omega-worm', name: 'Omega Worm', tag: 'Kerrigan\'s Swarm', slot: 'Other', role: 'Tactician', size: 3, speed: '-', armour: '5+', evade: '-', hp: 10,
      brackets: [[1, 1, 0]],
      abilities: [DETECTION, SOURCE_OF_CREEP,
        A('Structure', 'any', 'Passive', '', 'Can\'t activate or take actions, counts as 0 Supply, never controls or contests markers, and can\'t be targeted by abilities unless stated.'),
        A('Omega Network', 'any', 'Passive', '', 'Its base is an entry edge: each round, friendly units with combined Supply 2 or less may deploy through it. A friendly unit ending a Move, Disengage or Run touching it may return to reserves.')],
      weapons: [],
      upgrades: [] }
  ];

  var cards = [
    { id: 'zerg-swarm', name: 'Zerg Swarm', type: 'faction', unique: true, bm: 1, slots: '3 Core, 1 Elite, 1 Support, 1 Air',
      abilities: [A('Brood Instinct', 'any', 'Reaction', '', 'Before a friendly unit makes an Evade roll, give it +1.'), ZERG_CREEP,
        A('Rapid Burrowing', 'move', 'Active', '', 'One friendly, unengaged Ground Zerg unit gains Burrowed, even if it already activated this round.')] },
    { id: 'kerrigans-swarm', name: 'Kerrigan\'s Swarm', type: 'faction', tag: 'Kerrigan\'s Swarm', unique: true, bm: 1, slots: '3 Core, 2 Elite, 1 Hero',
      abilities: [A('Wild Mutation', 'any', 'Active', '', 'If the active unit is on Creep, it gains BUFF SPEED (1) and its first weapon used gains PRECISION (1).'), ZERG_CREEP,
        A('Omega Network', 'move', 'Active', '', 'With no friendly Omega Worm on the table, set one anywhere at ground level more than 10" from enemies. It can\'t use its special abilities (except Structure) this round.')] },
    { id: 'zagaras-swarm', name: 'Zagara\'s Swarm', type: 'faction', tag: 'Zagara\'s Swarm', unique: true, bm: 1, slots: '4 Core, 1 Support, 1 Hero',
      abilities: [A('Instinctive Reaction', 'any', 'Reaction', '', 'An enemy declares a close combat attack against a friendly unit: that unit may Evade it.'), ZERG_CREEP,
        A('Scourge Queen', 'combat', 'Active', '', 'If the active unit has more models than all engaged enemy units combined, its close combat weapons gain INSTANT and PRECISION (4).')] },

    { id: 'spawning-pool', name: 'Spawning Pool', type: 'tactical', bm: 1, slots: '1 Core',
      abilities: [A('Feral Rage', 'combat', 'Active', '', 'The active unit\'s first close combat weapon used gains PRECISION (2).')] },
    { id: 'six-pool', name: 'Spawning Pool (Six Pool)', short: 'Six Pool', type: 'tactical', unique: true, bm: 2, slots: '2 Core',
      abilities: [A('Timing Push', 'move', 'Active', '', 'The active Zergling unit deploys from any table edge that isn\'t a player\'s entry edge, ending more than 10" from enemies.', 'zerglings from reserves'),
        A('Feral Rage', 'combat', 'Active', '', 'The active unit\'s first close combat weapon used gains PRECISION (2).')] },
    { id: 'hatchery', name: 'Hatchery', type: 'tactical', bm: 1, slots: '1 Support',
      abilities: [A('Lie in Wait', 'move', 'Active', '', 'The active, unengaged Ground unit gains Burrowed.'), CREEP_SPREAD] },
    { id: 'lair', name: 'Lair', type: 'tactical', unique: true, bm: 1, slots: '1 Core, 1 Elite',
      abilities: [A('Predation', 'combat', 'Active', '', 'The active unit\'s close combat weapons gain INSTANT.', 'printed: any phase'), CREEP_SPREAD] },
    { id: 'evolution-chamber', name: 'Evolution Chamber', type: 'tactical', bm: 1, slots: '1 Core',
      abilities: [A('Carapace', 'any', 'Reaction', '', 'Before a friendly unit makes an armour roll: it gains TOUGH (1) for that roll.'),
        A('Extended Claws', 'assault', 'Active', '', 'The active unit gets +1 to all IMPACT hit rolls.', 'charging')] },
    { id: 'roach-warren', name: 'Roach Warren', type: 'tactical', bm: 1, slots: '1 Core',
      abilities: [A('Nasty Surprise', 'assault', 'Active', '', 'The active Ground unit loses Burrowed.')] },
    { id: 'hydralisk-den', name: 'Hydralisk Den', type: 'tactical', bm: 1, slots: '2 Elite',
      abilities: [A('Missile Attacks', 'assault', 'Active', '', 'The active unit\'s first ranged weapon used gains PRECISION (1).', 'shooting')] },
    { id: 'overlord', name: 'Overlord', type: 'tactical', unique: true, bm: 1, slots: '1 Core, 1 Elite, 1 Hero',
      abilities: [A('Ventral Sacs', 'move', 'Active', '', 'Place a faction indicator more than 10" from enemies. At end of round, deploy one Ground unit from reserves touching it.', 'pays off end of round'),
        A('Excrete Creep', 'assault', 'Active', '', 'Place a Creep Tumor within 6" of a friendly entry edge or friendly Creep Tumor. No line of sight needed.'),
        R('Ventral Sacs: deploy', 'score', 'If you placed the indicator, deploy one Ground unit from reserves touching it.', 'end of round')] },
    { id: 'overseer', name: 'Overseer', type: 'tactical', unique: true, bm: 1, slots: '1 Support',
      abilities: [A('Oversight Mode', 'move', 'Active', '', 'Place a faction indicator anywhere. Enemy units within 6" of it lose Hidden.'),
        A('Pneumatized Carapace', 'assault', 'Reaction', '', 'After a friendly unit rolls its D6 for charge distance, roll another D6 and use the higher.', 'charging')] },
    { id: 'cocoon', name: 'Cocoon', type: 'tactical', unique: true, bm: 0, slots: '1 Elite',
      abilities: [A('Spawn Larva', 'move', 'Active', '', 'The active non-unique Biological unit of Size 1 resolves RESPAWN (2).'),
        A('Ravager Morph', 'move', 'Active', '', 'The active Roach unit performs MORPH (Ravager) 1.', 'once per game')] },
    { id: 'defiler-mound', name: 'Defiler Mound', type: 'tactical', unique: true, bm: 1, slots: '1 Elite, 1 Support',
      abilities: [A('Poisonous Essence', 'move', 'Active', '', 'Mark the active friendly unit. At end of the Assault phase, Biological enemies engaged with it suffer NON-LETHAL DAMAGE (2).', 'lands end of assault'),
        A('Tunnel Network', 'move', 'Active', '', 'The active, unengaged Ground unit returns to reserves instead of taking an action.'),
        R('Poisonous Essence lands', 'assault', 'End of this phase: Biological enemies engaged with the marked unit suffer NON-LETHAL DAMAGE (2).', 'end of assault phase')] },

    { id: 'accelerating-creep', name: 'Accelerating Creep', type: 'creep', unique: true, bm: 0, slots: '',
      abilities: [A('Speed on Creep', 'any', 'Passive', '', 'The active friendly Zerg unit gets +1 Speed while on Creep.'), LIVING_GLOB, CREEP_REMOVAL] },
    { id: 'malignant-creep', name: 'Malignant Creep', type: 'creep', tag: 'Kerrigan\'s Swarm', unique: true, bm: 0, slots: '',
      abilities: [CREEP_REMOVAL, LIVING_GLOB,
        A('Malevolent Matriarch', 'assault', 'Passive', '', 'An active friendly Zerg unit that declares a charge while on Creep gets +1 to IMPACT hit rolls.', 'charging')] },
    { id: 'reactive-creep', name: 'Reactive Creep', type: 'creep', tag: 'Zagara\'s Swarm', unique: true, bm: 0, slots: '',
      abilities: [A('Reactive Tissue', 'any', 'Passive', '', 'A friendly Zerg unit on Creep gains DODGE (1) against attacks targeting it.'), LIVING_GLOB, CREEP_REMOVAL] }
  ];

  window.TMG_DATA = window.TMG_DATA || { factions: {} };
  window.TMG_DATA.factions.zerg = {
    id: 'zerg', name: 'Zerg', accent: '#B98CF0', ground: '#140E1B',
    theme: { ground: '#140E1B', accent: '#B98CF0', accentRgb: '185,140,240', accentSoft: '#CDB2F5', upg: '#D9C7F2', card: '#D9C7F2', panelSolid: '#1C1426', toastBg: '#2A1F38', blurb: 'Swarm, creep and Biomass' },
    sources: [
      { file: 'StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf', label: 'Wave 1 card sheets', version: 'May 2026, v1.0' },
      { file: 'StarCraft-Zerg-P2P-W2-Card-Sheets-A4_EN.pdf', label: 'Wave 2 card sheets', version: 'v1.06.26' },
      { file: 'StarCraft-Zerg-P2P-W3-Card-Sheets-A4_EN.pdf', label: 'Wave 3 card sheets', version: 'September 2026, v1.0' }
    ],
    units: units,
    cards: cards
  };
})();
