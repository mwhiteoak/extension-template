// D&D Beyond DM Companion — Bundled SRD Monster Data
// Source: Systems Reference Document 5.1 (Creative Commons CC-BY-4.0)
// Fields: name, cr (string), ac, hp, speed, str, dex, con, int, wis, cha, type, notes

const SRD_MONSTERS = [
  // CR 0
  { name: "Awakened Shrub", cr: "0", ac: 9, hp: 10, speed: "20 ft.", str: 3, dex: 8, con: 11, int: 10, wis: 10, cha: 6, type: "plant" },
  { name: "Baboon", cr: "0", ac: 12, hp: 3, speed: "30 ft., climb 30 ft.", str: 8, dex: 14, con: 11, int: 4, wis: 12, cha: 6, type: "beast" },
  { name: "Cat", cr: "0", ac: 12, hp: 2, speed: "40 ft., climb 30 ft.", str: 3, dex: 15, con: 10, int: 3, wis: 12, cha: 7, type: "beast" },
  { name: "Commoner", cr: "0", ac: 10, hp: 4, speed: "30 ft.", str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, type: "humanoid" },
  { name: "Rat", cr: "0", ac: 10, hp: 1, speed: "20 ft.", str: 2, dex: 11, con: 9, int: 2, wis: 10, cha: 4, type: "beast" },
  // CR 1/8
  { name: "Bandit", cr: "1/8", ac: 12, hp: 11, speed: "30 ft.", str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10, type: "humanoid" },
  { name: "Cultist", cr: "1/8", ac: 12, hp: 9, speed: "30 ft.", str: 11, dex: 12, con: 10, int: 10, wis: 11, cha: 10, type: "humanoid" },
  { name: "Guard", cr: "1/8", ac: 16, hp: 11, speed: "30 ft.", str: 13, dex: 12, con: 12, int: 10, wis: 11, cha: 10, type: "humanoid" },
  { name: "Kobold", cr: "1/8", ac: 12, hp: 5, speed: "30 ft.", str: 7, dex: 15, con: 9, int: 8, wis: 7, cha: 8, type: "humanoid" },
  { name: "Mastiff", cr: "1/8", ac: 12, hp: 5, speed: "40 ft.", str: 13, dex: 14, con: 12, int: 3, wis: 12, cha: 7, type: "beast" },
  { name: "Merfolk", cr: "1/8", ac: 11, hp: 11, speed: "10 ft., swim 40 ft.", str: 10, dex: 13, con: 12, int: 11, wis: 11, cha: 12, type: "humanoid" },
  { name: "Noble", cr: "1/8", ac: 15, hp: 9, speed: "30 ft.", str: 11, dex: 12, con: 11, int: 12, wis: 14, cha: 16, type: "humanoid" },
  { name: "Poisonous Snake", cr: "1/8", ac: 13, hp: 2, speed: "30 ft., swim 30 ft.", str: 2, dex: 16, con: 11, int: 1, wis: 10, cha: 3, type: "beast" },
  { name: "Tribal Warrior", cr: "1/8", ac: 12, hp: 11, speed: "30 ft.", str: 13, dex: 11, con: 12, int: 8, wis: 11, cha: 8, type: "humanoid" },
  // CR 1/4
  { name: "Acolyte", cr: "1/4", ac: 10, hp: 9, speed: "30 ft.", str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 11, type: "humanoid", notes: "Spellcaster (1st level)" },
  { name: "Blink Dog", cr: "1/4", ac: 13, hp: 22, speed: "40 ft.", str: 12, dex: 17, con: 12, int: 10, wis: 13, cha: 11, type: "fey", notes: "Teleport (Bonus Action)" },
  { name: "Boar", cr: "1/4", ac: 11, hp: 11, speed: "40 ft.", str: 13, dex: 11, con: 12, int: 2, wis: 9, cha: 5, type: "beast" },
  { name: "Elk", cr: "1/4", ac: 10, hp: 13, speed: "50 ft.", str: 16, dex: 10, con: 12, int: 2, wis: 10, cha: 6, type: "beast" },
  { name: "Giant Rat", cr: "1/4", ac: 12, hp: 7, speed: "30 ft.", str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4, type: "beast" },
  { name: "Goblin", cr: "1/4", ac: 15, hp: 7, speed: "30 ft.", str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, type: "humanoid", notes: "Nimble Escape, Sneak Attack 2d6" },
  { name: "Skeleton", cr: "1/4", ac: 13, hp: 13, speed: "30 ft.", str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5, type: "undead", notes: "Vulnerable to bludgeoning; Immune to poison/exhaustion" },
  { name: "Sprite", cr: "1/4", ac: 15, hp: 2, speed: "10 ft., fly 40 ft.", str: 3, dex: 18, con: 10, int: 14, wis: 13, cha: 11, type: "fey" },
  { name: "Wolf", cr: "1/4", ac: 13, hp: 11, speed: "40 ft.", str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6, type: "beast", notes: "Pack Tactics, Knockdown" },
  { name: "Zombie", cr: "1/4", ac: 8, hp: 22, speed: "20 ft.", str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5, type: "undead", notes: "Undead Fortitude; Immune to poison" },
  // CR 1/2
  { name: "Ape", cr: "1/2", ac: 12, hp: 19, speed: "30 ft., climb 30 ft.", str: 16, dex: 14, con: 14, int: 6, wis: 12, cha: 7, type: "beast" },
  { name: "Black Bear", cr: "1/2", ac: 11, hp: 19, speed: "40 ft., climb 30 ft.", str: 15, dex: 10, con: 14, int: 2, wis: 12, cha: 7, type: "beast" },
  { name: "Crocodile", cr: "1/2", ac: 12, hp: 19, speed: "20 ft., swim 30 ft.", str: 15, dex: 10, con: 13, int: 2, wis: 10, cha: 5, type: "beast" },
  { name: "Gnoll", cr: "1/2", ac: 15, hp: 22, speed: "30 ft.", str: 14, dex: 12, con: 11, int: 6, wis: 10, cha: 7, type: "humanoid", notes: "Rampage" },
  { name: "Hobgoblin", cr: "1/2", ac: 18, hp: 11, speed: "30 ft.", str: 13, dex: 12, con: 12, int: 10, wis: 10, cha: 9, type: "humanoid", notes: "Martial Advantage" },
  { name: "Lizardfolk", cr: "1/2", ac: 15, hp: 22, speed: "30 ft., swim 30 ft.", str: 15, dex: 10, con: 13, int: 7, wis: 12, cha: 7, type: "humanoid" },
  { name: "Orc", cr: "1/2", ac: 13, hp: 15, speed: "30 ft.", str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10, type: "humanoid", notes: "Aggressive" },
  { name: "Satyr", cr: "1/2", ac: 14, hp: 31, speed: "40 ft.", str: 12, dex: 16, con: 11, int: 12, wis: 10, cha: 14, type: "fey" },
  { name: "Warhorse", cr: "1/2", ac: 11, hp: 19, speed: "60 ft.", str: 18, dex: 12, con: 13, int: 2, wis: 12, cha: 7, type: "beast" },
  // CR 1
  { name: "Bugbear", cr: "1", ac: 16, hp: 27, speed: "30 ft.", str: 15, dex: 14, con: 13, int: 8, wis: 11, cha: 9, type: "humanoid", notes: "Brute, Surprise Attack" },
  { name: "Dryad", cr: "1", ac: 11, hp: 22, speed: "30 ft.", str: 10, dex: 12, con: 11, int: 14, wis: 15, cha: 18, type: "fey" },
  { name: "Ghoul", cr: "1", ac: 12, hp: 22, speed: "30 ft.", str: 13, dex: 15, con: 10, int: 7, wis: 10, cha: 6, type: "undead", notes: "Paralysing Touch, Bite; Immune to poison/charmed/exhaustion" },
  { name: "Giant Eagle", cr: "1", ac: 13, hp: 26, speed: "10 ft., fly 80 ft.", str: 16, dex: 17, con: 13, int: 8, wis: 14, cha: 10, type: "beast" },
  { name: "Giant Spider", cr: "1", ac: 14, hp: 26, speed: "30 ft., climb 30 ft.", str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4, type: "beast", notes: "Web (Recharge 5–6), Spider Climb, Web Sense" },
  { name: "Goblin Boss", cr: "1", ac: 17, hp: 21, speed: "30 ft.", str: 10, dex: 14, con: 10, int: 10, wis: 8, cha: 10, type: "humanoid", notes: "Redirect Attack, Nimble Escape" },
  { name: "Harpy", cr: "1", ac: 11, hp: 38, speed: "20 ft., fly 40 ft.", str: 12, dex: 13, con: 14, int: 7, wis: 10, cha: 13, type: "monstrosity", notes: "Luring Song" },
  { name: "Imp", cr: "1", ac: 13, hp: 10, speed: "20 ft., fly 40 ft.", str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14, type: "fiend", notes: "Shapechanger, Invisibility, Devil's Sight" },
  { name: "Specter", cr: "1", ac: 12, hp: 22, speed: "0 ft., fly 50 ft. (hover)", str: 1, dex: 14, con: 11, int: 10, wis: 10, cha: 11, type: "undead", notes: "Life Drain, Incorporeal Movement; Immune to necrotic/poison" },
  { name: "Tiger", cr: "1", ac: 12, hp: 37, speed: "40 ft.", str: 17, dex: 15, con: 14, int: 3, wis: 12, cha: 8, type: "beast", notes: "Pounce, Surprise Attack" },
  // CR 2
  { name: "Bandit Captain", cr: "2", ac: 15, hp: 65, speed: "30 ft.", str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14, type: "humanoid", notes: "Multiattack, Parry" },
  { name: "Berserker", cr: "2", ac: 13, hp: 67, speed: "30 ft.", str: 16, dex: 12, con: 17, int: 9, wis: 11, cha: 9, type: "humanoid", notes: "Reckless" },
  { name: "Brown Bear", cr: "1", ac: 11, hp: 34, speed: "40 ft., climb 30 ft.", str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7, type: "beast", notes: "Multiattack (bite + claws)" },
  { name: "Centaur", cr: "2", ac: 12, hp: 45, speed: "50 ft.", str: 18, dex: 14, con: 14, int: 9, wis: 13, cha: 11, type: "monstrosity", notes: "Charge, Multiattack" },
  { name: "Ettercap", cr: "2", ac: 13, hp: 44, speed: "30 ft., climb 30 ft.", str: 14, dex: 15, con: 13, int: 7, wis: 12, cha: 8, type: "monstrosity", notes: "Spider Climb, Web Sense, Web" },
  { name: "Gargoyle", cr: "2", ac: 15, hp: 52, speed: "30 ft., fly 60 ft.", str: 15, dex: 11, con: 16, int: 6, wis: 11, cha: 7, type: "elemental", notes: "False Appearance; Immune to poison/petrified" },
  { name: "Gelatinous Cube", cr: "2", ac: 6, hp: 84, speed: "15 ft.", str: 14, dex: 3, con: 20, int: 1, wis: 6, cha: 1, type: "ooze", notes: "Engulf, Transparent; Immune to prone/blinded" },
  { name: "Ghast", cr: "2", ac: 13, hp: 36, speed: "30 ft.", str: 16, dex: 17, con: 10, int: 11, wis: 10, cha: 8, type: "undead", notes: "Stench, Paralysing Touch; Immune to poison" },
  { name: "Ogre", cr: "2", ac: 11, hp: 59, speed: "40 ft.", str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7, type: "giant" },
  { name: "Polar Bear", cr: "2", ac: 12, hp: 42, speed: "40 ft., swim 30 ft.", str: 20, dex: 10, con: 16, int: 2, wis: 13, cha: 7, type: "beast", notes: "Multiattack" },
  { name: "Will-o'-Wisp", cr: "2", ac: 19, hp: 22, speed: "0 ft., fly 50 ft. (hover)", str: 1, dex: 28, con: 10, int: 13, wis: 14, cha: 11, type: "undead", notes: "Consume Life, Ephemeral, Incorporeal; Immune to lightning/poison" },
  // CR 3
  { name: "Doppelganger", cr: "3", ac: 14, hp: 52, speed: "30 ft.", str: 11, dex: 18, con: 14, int: 11, wis: 12, cha: 14, type: "monstrosity", notes: "Shapechanger, Surprise Attack, Read Thoughts" },
  { name: "Green Hag", cr: "3", ac: 17, hp: 82, speed: "30 ft.", str: 18, dex: 12, con: 16, int: 13, wis: 14, cha: 14, type: "fey", notes: "Claws, Illusory Appearance, Invisible Passage; innate spellcasting" },
  { name: "Knight", cr: "3", ac: 18, hp: 52, speed: "30 ft.", str: 16, dex: 11, con: 14, int: 11, wis: 11, cha: 15, type: "humanoid", notes: "Multiattack, Brave, Parry" },
  { name: "Manticore", cr: "3", ac: 14, hp: 68, speed: "30 ft., fly 50 ft.", str: 17, dex: 16, con: 17, int: 7, wis: 11, cha: 8, type: "monstrosity", notes: "Tail Spike Volley (x6)" },
  { name: "Minotaur", cr: "3", ac: 14, hp: 114, speed: "40 ft.", str: 18, dex: 11, con: 16, int: 6, wis: 16, cha: 9, type: "monstrosity", notes: "Charge (Shove + extra damage), Labyrinthine Recall" },
  { name: "Mummy", cr: "3", ac: 11, hp: 58, speed: "20 ft.", str: 16, dex: 8, con: 15, int: 6, wis: 10, cha: 12, type: "undead", notes: "Mummy Rot curse, Dreadful Glare; Immune to poison" },
  { name: "Owlbear", cr: "3", ac: 13, hp: 59, speed: "40 ft.", str: 20, dex: 12, con: 17, int: 3, wis: 12, cha: 7, type: "monstrosity", notes: "Multiattack (beak + claws)" },
  { name: "Vampire Spawn", cr: "5", ac: 15, hp: 82, speed: "30 ft.", str: 16, dex: 16, con: 16, int: 11, wis: 10, cha: 12, type: "undead", notes: "Bite, Claws, Regeneration 10 hp; Weaknesses: radiant, running water" },
  { name: "Werewolf", cr: "3", ac: 11, hp: 58, speed: "30 ft. (40 ft. in wolf form)", str: 15, dex: 13, con: 14, int: 10, wis: 11, cha: 10, type: "humanoid", notes: "Shapechanger; immune to non-magic/silver weapons" },
  { name: "Wight", cr: "3", ac: 14, hp: 45, speed: "30 ft.", str: 15, dex: 14, con: 16, int: 10, wis: 13, cha: 15, type: "undead", notes: "Life Drain, Sunlight Sensitivity; Immune to poison" },
  // CR 4
  { name: "Banshee", cr: "4", ac: 12, hp: 58, speed: "0 ft., fly 40 ft. (hover)", str: 1, dex: 14, con: 10, int: 12, wis: 11, cha: 17, type: "undead", notes: "Horrifying Visage, Wail (DC 13 save or drop to 0 hp); Immune to cold/necrotic/poison" },
  { name: "Chuul", cr: "4", ac: 16, hp: 93, speed: "30 ft., swim 30 ft.", str: 19, dex: 10, con: 16, int: 5, wis: 11, cha: 5, type: "aberration", notes: "Tentacles (paralysing poison), Multiattack" },
  { name: "Couatl", cr: "4", ac: 19, hp: 97, speed: "30 ft., fly 90 ft.", str: 16, dex: 20, con: 17, int: 18, wis: 20, cha: 18, type: "celestial", notes: "Innate spellcasting, Change Shape, Constrict, Poison Bite" },
  { name: "Ettin", cr: "4", ac: 12, hp: 85, speed: "40 ft.", str: 21, dex: 8, con: 17, int: 6, wis: 10, cha: 8, type: "giant", notes: "Two Heads (advantage on Perception, Surprise), Multiattack" },
  // CR 5
  { name: "Air Elemental", cr: "5", ac: 15, hp: 90, speed: "0 ft., fly 90 ft. (hover)", str: 14, dex: 20, con: 14, int: 6, wis: 10, cha: 6, type: "elemental", notes: "Whirlwind, Air Form; Immune to lightning/thunder/poison" },
  { name: "Cambion", cr: "5", ac: 19, hp: 82, speed: "30 ft., fly 60 ft.", str: 18, dex: 18, con: 16, int: 14, wis: 12, cha: 16, type: "fiend", notes: "Innate spellcasting, Fiendish Charm, Multiattack" },
  { name: "Earth Elemental", cr: "5", ac: 17, hp: 126, speed: "30 ft., burrow 30 ft.", str: 20, dex: 8, con: 20, int: 5, wis: 10, cha: 5, type: "elemental", notes: "Earth Glide, Siege, Multiattack; Immune to poison" },
  { name: "Fire Elemental", cr: "5", ac: 13, hp: 102, speed: "50 ft.", str: 10, dex: 17, con: 16, int: 6, wis: 10, cha: 7, type: "elemental", notes: "Fire Form, Ignite; Immune to fire/poison" },
  { name: "Gladiator", cr: "5", ac: 16, hp: 112, speed: "30 ft.", str: 20, dex: 15, con: 14, int: 10, wis: 12, cha: 15, type: "humanoid", notes: "Multiattack (3 attacks), Brave, Parry, Shield Bash" },
  { name: "Hill Giant", cr: "5", ac: 13, hp: 105, speed: "40 ft.", str: 21, dex: 8, con: 19, int: 5, wis: 9, cha: 6, type: "giant", notes: "Multiattack, Rock Throw" },
  { name: "Troll", cr: "5", ac: 15, hp: 84, speed: "30 ft.", str: 18, dex: 13, con: 20, int: 7, wis: 9, cha: 7, type: "giant", notes: "Regeneration 10 hp (disabled by acid/fire), Multiattack" },
  { name: "Water Elemental", cr: "5", ac: 14, hp: 114, speed: "30 ft., swim 90 ft.", str: 18, dex: 14, con: 18, int: 5, wis: 10, cha: 8, type: "elemental", notes: "Water Form, Whelm; Immune to acid/poison" },
  { name: "Wraith", cr: "5", ac: 13, hp: 67, speed: "0 ft., fly 60 ft. (hover)", str: 6, dex: 16, con: 16, int: 12, wis: 14, cha: 15, type: "undead", notes: "Life Drain, Create Specter; Immune to necrotic/poison" },
  // CR 6
  { name: "Chimera", cr: "6", ac: 14, hp: 114, speed: "30 ft., fly 60 ft.", str: 19, dex: 11, con: 19, int: 3, wis: 14, cha: 10, type: "monstrosity", notes: "Multiattack, Fire Breath (Recharge 5–6)" },
  { name: "Cyclops", cr: "6", ac: 14, hp: 138, speed: "30 ft.", str: 22, dex: 11, con: 20, int: 8, wis: 6, cha: 9, type: "giant", notes: "Poor Depth Perception, Multiattack, Rock Throw" },
  { name: "Drider", cr: "6", ac: 19, hp: 123, speed: "30 ft., climb 30 ft.", str: 16, dex: 16, con: 18, int: 13, wis: 14, cha: 12, type: "monstrosity", notes: "Fey Ancestry, Spider Climb, Innate spellcasting, Multiattack" },
  { name: "Hobgoblin Warlord", cr: "6", ac: 20, hp: 97, speed: "30 ft.", str: 16, dex: 14, con: 16, int: 14, wis: 11, cha: 15, type: "humanoid", notes: "Multiattack (3), Martial Advantage, Leadership" },
  { name: "Medusa", cr: "6", ac: 15, hp: 127, speed: "30 ft.", str: 10, dex: 15, con: 16, int: 12, wis: 13, cha: 15, type: "monstrosity", notes: "Petrifying Gaze, Multiattack, Snake Hair" },
  { name: "Wyvern", cr: "6", ac: 13, hp: 110, speed: "20 ft., fly 80 ft.", str: 19, dex: 10, con: 16, int: 5, wis: 12, cha: 6, type: "dragon", notes: "Multiattack (claws + tail stinger), Stinger (poison)" },
  // CR 7
  { name: "Mind Flayer", cr: "7", ac: 15, hp: 71, speed: "30 ft.", str: 11, dex: 12, con: 12, int: 19, wis: 17, cha: 17, type: "aberration", notes: "Innate spellcasting, Mind Blast (Recharge 5-6), Extract Brain, Tentacles" },
  { name: "Shield Guardian", cr: "7", ac: 17, hp: 142, speed: "30 ft.", str: 18, dex: 8, con: 18, int: 7, wis: 10, cha: 3, type: "construct", notes: "Bound, Regeneration 10, Shield, Spell Storing; Immune to poison/charm/fear" },
  { name: "Stone Giant", cr: "7", ac: 17, hp: 126, speed: "40 ft.", str: 23, dex: 15, con: 20, int: 10, wis: 12, cha: 9, type: "giant", notes: "Multiattack, Rock Throw, Rock Catching" },
  { name: "Young Black Dragon", cr: "7", ac: 18, hp: 127, speed: "40 ft., fly 80 ft., swim 40 ft.", str: 19, dex: 14, con: 17, int: 12, wis: 11, cha: 15, type: "dragon", notes: "Multiattack, Acid Breath (Recharge 5–6); Immune to acid" },
  // CR 8
  { name: "Assassin", cr: "8", ac: 15, hp: 78, speed: "30 ft.", str: 11, dex: 16, con: 14, int: 13, wis: 11, cha: 10, type: "humanoid", notes: "Multiattack, Sneak Attack 4d6, Assassinate, Evasion" },
  { name: "Hydra", cr: "8", ac: 15, hp: 172, speed: "30 ft., swim 30 ft.", str: 20, dex: 12, con: 20, int: 2, wis: 10, cha: 7, type: "monstrosity", notes: "Multiple Heads (5, regrow), Reactive Heads, Wakeful; cannot be blinded/deafened/stunned" },
  { name: "Frost Giant", cr: "8", ac: 15, hp: 138, speed: "40 ft.", str: 23, dex: 9, con: 21, int: 9, wis: 10, cha: 12, type: "giant", notes: "Multiattack, Rock Throw; Immune to cold" },
  { name: "Young Green Dragon", cr: "8", ac: 18, hp: 136, speed: "40 ft., fly 80 ft., swim 40 ft.", str: 19, dex: 12, con: 17, int: 16, wis: 13, cha: 15, type: "dragon", notes: "Multiattack, Poison Breath (Recharge 5–6); Immune to poison" },
  // CR 9
  { name: "Cloud Giant", cr: "9", ac: 14, hp: 200, speed: "40 ft., fly 60 ft.", str: 27, dex: 10, con: 22, int: 12, wis: 16, cha: 16, type: "giant", notes: "Innate spellcasting, Keen Smell, Rock Throw, Multiattack" },
  { name: "Young Red Dragon", cr: "10", ac: 18, hp: 178, speed: "40 ft., climb 40 ft., fly 80 ft.", str: 23, dex: 10, con: 21, int: 16, wis: 13, cha: 20, type: "dragon", notes: "Multiattack, Fire Breath (Recharge 5–6); Immune to fire" },
  // CR 10
  { name: "Aboleth", cr: "10", ac: 17, hp: 135, speed: "10 ft., swim 40 ft.", str: 21, dex: 9, con: 15, int: 18, wis: 15, cha: 18, type: "aberration", notes: "Tentacle (disease/enslaving), Tail Slap, Enslave (3/day), Probing Telepathy; Amphibious" },
  { name: "Guardian Naga", cr: "10", ac: 18, hp: 120, speed: "40 ft.", str: 19, dex: 18, con: 16, int: 16, wis: 19, cha: 18, type: "monstrosity", notes: "Rejuvenation, Spellcasting (7th), Spit Poison, Multiattack" },
  // CR 11
  { name: "Behir", cr: "11", ac: 17, hp: 168, speed: "50 ft., climb 40 ft.", str: 23, dex: 16, con: 18, int: 7, wis: 14, cha: 12, type: "monstrosity", notes: "Constrict, Lightning Breath (Recharge 5–6), Swallow, Multiattack; Immune to lightning" },
  { name: "Roc", cr: "11", ac: 15, hp: 248, speed: "20 ft., fly 120 ft.", str: 28, dex: 10, con: 20, int: 3, wis: 10, cha: 9, type: "monstrosity", notes: "Multiattack, Beak, Talons (Grapple)" },
  // CR 13
  { name: "Beholder", cr: "13", ac: 18, hp: 180, speed: "0 ft., fly 20 ft. (hover)", str: 10, dex: 14, con: 18, int: 17, wis: 15, cha: 17, type: "aberration", notes: "Eye Rays (10 types), Central Eye (antimagic cone), Legendary Resistance 3/day" },
  { name: "Vampire", cr: "13", ac: 16, hp: 144, speed: "30 ft.", str: 18, dex: 18, con: 18, int: 17, wis: 15, cha: 18, type: "undead", notes: "Legendary Actions 3, Charm, Misty Escape, Regen 20; Weaknesses: radiant/stake/sunlight" },
  // CR 17
  { name: "Adult Red Dragon", cr: "17", ac: 19, hp: 256, speed: "40 ft., climb 40 ft., fly 80 ft.", str: 27, dex: 10, con: 25, int: 16, wis: 13, cha: 21, type: "dragon", notes: "Legendary Actions 3, Legendary Resistance 3/day, Fire Breath; Immune to fire" },
  // CR 20
  { name: "Ancient Red Dragon", cr: "24", ac: 22, hp: 546, speed: "40 ft., climb 40 ft., fly 80 ft.", str: 30, dex: 10, con: 29, int: 18, wis: 15, cha: 23, type: "dragon", notes: "Legendary Actions 3, Legendary Resistance 3/day, Fire Breath (26d6); Immune to fire" },
  // CR 21
  { name: "Lich", cr: "21", ac: 17, hp: 135, speed: "30 ft.", str: 11, dex: 16, con: 16, int: 20, wis: 14, cha: 16, type: "undead", notes: "Legendary Actions 3, Legendary Resistance 3/day, Spellcasting (18th), Paralyzing Touch, Rejuvenation; Immune to poison" },
  // CR 30
  { name: "Tarrasque", cr: "30", ac: 25, hp: 676, speed: "40 ft.", str: 30, dex: 11, con: 30, int: 3, wis: 11, cha: 11, type: "monstrosity", notes: "Legendary Actions 5, Legendary Resistance 3/day, Reflective Carapace, Regeneration 30; Immune to fire/poison" },
];

// CR to XP conversion (DMG)
const CR_TO_XP = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100,
  "5": 1800, "6": 2300, "7": 2900, "8": 3900,
  "9": 5000, "10": 5900, "11": 7200, "12": 8400,
  "13": 10000, "14": 11500, "15": 13000, "16": 15000,
  "17": 18000, "18": 20000, "19": 22000, "20": 25000,
  "21": 33000, "22": 41000, "23": 50000, "24": 62000,
  "30": 155000,
};

// XP thresholds per character level (DMG p.82): [Easy, Medium, Hard, Deadly]
const XP_THRESHOLDS = {
  1:  [25, 50, 75, 100],
  2:  [50, 100, 150, 200],
  3:  [75, 150, 225, 400],
  4:  [125, 250, 375, 500],
  5:  [250, 500, 750, 1100],
  6:  [300, 600, 900, 1400],
  7:  [350, 750, 1100, 1700],
  8:  [450, 900, 1400, 2100],
  9:  [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

// Encounter multipliers by monster count (DMG p.82)
const ENCOUNTER_MULTIPLIERS = [
  [1, 1.0],
  [2, 1.5],
  [3, 2.0],
  [7, 2.5],
  [11, 3.0],
  [15, 4.0],
];

function getEncounterMultiplier(monsterCount, partySize) {
  let mult = 1.0;
  for (const [threshold, m] of ENCOUNTER_MULTIPLIERS) {
    if (monsterCount >= threshold) mult = m;
  }
  // Adjust multiplier for small/large parties
  if (partySize < 3) {
    const idx = ENCOUNTER_MULTIPLIERS.findIndex(([t]) => mult === ENCOUNTER_MULTIPLIERS.find(([,m2]) => m2 === mult)?.[1]);
    mult = Math.min(mult * 1.5, 4.0);
  } else if (partySize > 5) {
    mult = Math.max(mult * 0.5, 0.5);
  }
  return mult;
}

function crToXp(cr) {
  return CR_TO_XP[cr] || 0;
}
