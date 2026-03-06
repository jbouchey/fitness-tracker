/**
 * Narrative Engine — expedition journal beats for Adventure Mode.
 * 3 archetypes × 4 expedition phases × 10 environment signals = 120 entries.
 *
 * Phases map to position in the week's journey:
 *   1 — Departure (first expedition)
 *   2 — Finding the Rhythm (expeditions 2–3)
 *   3 — Deep in the Trail (expeditions 4–5)
 *   4 — Frontier Territory (expeditions 6–7)
 */

const NARRATIVES = {
  wizard: {
    1: {
      neutral:  "The arcane traveler steps onto the road, staff in hand. Each league is a rune inscribed on the body — a spell cast against stillness.",
      rain:     "Rain soaks the cloak, but the mage walks on. Water has always been a conduit for magic, and today the storm is an ally.",
      snow:     "Soft snow muffles each step through the winter wood. The silence holds something ancient, and the wizard listens as they move.",
      thunder:  "The sky declares itself overhead as you set out. A mage reads lightning like a text — and this one says: keep moving.",
      hot:      "Desert heat shimmers off the stone road. The mage who walks through fire does not burn — they are refined.",
      cold:     "Frost laces the air, sharp as a well-cast spell. Your breath rises in a plume of silver as this week's passage begins.",
      highAlt:  "The road climbs into thin air where few dare to tread. Up here, the boundary between the mortal world and the arcane grows thin.",
      bigClimb: "The ascent is steep and the path unforgiving. You study each footfall the way you study a spell — with patience, and with intent.",
      night:    "You set out beneath stars that have guided travelers beyond counting. The night road holds its secrets, and the mage carries a lantern.",
      dawn:     "The first light finds you already in motion. A mage who moves at dawn moves with the world's own momentum at their back.",
    },
    2: {
      neutral:  "The path has grown familiar beneath your feet, but the horizon stays unwritten. Magic rewards those who do not stop at the known.",
      rain:     "Rain has been your companion since the first step. You stopped noticing the wet long ago — only the distance ahead holds your attention.",
      snow:     "The trail winds through snow-heavy branches. You pass beneath them like a thought — without disturbing, without being disturbed.",
      thunder:  "The storm has been rolling for hours and still you walk. A mage does not wait for calm. Calm waits for you.",
      hot:      "The sun is relentless and so are you. Heat that slows others fuels something old and stubborn in the arcane traveler.",
      cold:     "The cold has settled into your bones and made itself at home. You carry it now not as burden, but as ballast.",
      highAlt:  "The air thins further with each passing mile, but the world below grows larger and stranger — more worth the journey.",
      bigClimb: "Switchback follows switchback on the great slope. You map the geometry of effort, turning exertion into data, data into progress.",
      night:    "Deep in the dark hours. The ordinary world sleeps, but the mage is awake, reading the night's fine print.",
      dawn:     "Morning spills across the landscape and you are already well inside it. The day is young and already yours.",
    },
    3: {
      neutral:  "The miles have accumulated like chapters in a tome. You are deep in the narrative now, and the ending requires your feet.",
      rain:     "The storm and the mage have reached an understanding. It provides the drama; you provide the motion.",
      snow:     "Your tracks behind you are a history in white. Ahead, the page is clean and waiting to be written.",
      thunder:  "The lightning finds you unbothered. A mage who has walked through this much weather has graduated beyond it.",
      hot:      "The heat has tested your limits and found them further than expected. The road keeps giving you the chance to surprise yourself.",
      cold:     "Cold no longer registers as discomfort. It is simply the texture of the world you are moving through.",
      highAlt:  "Altitude has thinned everything — the air, the noise, the distractions. What remains is pure effort and pure sky.",
      bigClimb: "The great climb has become a conversation. You and the mountain, working out the terms of your passage.",
      night:    "The night has opened around you like a second world. You move through it with the calm of one who has learned that darkness is only the absence of light.",
      dawn:     "Dawn has become part of your rhythm. The light rises and so do you — further up the week's long road.",
    },
    4: {
      neutral:  "Frontier ground now. You have reached terrain that few see this late in the week. The road rewards those who still walk when others have rested.",
      rain:     "The storm has followed you to the edge of the known world. One final league in the rain, and the frontier is yours.",
      snow:     "The snow falls clean on unmapped ground. You press into it — the last pages of this week's long chapter.",
      thunder:  "Lightning traces the frontier sky, and you walk beneath it without flinching. The storm has been training you all week.",
      hot:      "The desert gives way to something older and stranger at the frontier's edge. The heat escorted you here — and here you are.",
      cold:     "The cold deepens at the frontier, as if the world offers one final test. You pass it the way you have passed every other: by moving.",
      highAlt:  "You have climbed into territory most never attempt. The view from this altitude is the reward for every step it took to arrive.",
      bigClimb: "The final ascent brings you to the frontier's crest. Below is the known world. Ahead is uncharted. You chose ahead.",
      night:    "The dark frontier stretches before you. Every step is into the unknown, and every step is certain. A mage navigates by inner light.",
      dawn:     "Dawn breaks over the frontier and you are already standing in it. The week ends where few others dared to begin.",
    },
  },

  archer: {
    1: {
      neutral:  "You read the trail ahead the way a hunter reads a track — with patience, purpose, and respect for what it reveals.",
      rain:     "Rain blurs the trail but not the ranger's focus. Footing adjusted, quiver dry, pace held. You move on.",
      snow:     "First steps into fresh snow. Clean tracks stretch behind you — a ranger's signature on the wilderness.",
      thunder:  "The sky cracks open and you keep pace. A ranger does not wait for perfect weather. Perfect weather comes after.",
      hot:      "Midday sun hammers the open terrain. You navigate to shade where it exists, drink when you must, hold the pace.",
      cold:     "Cold air sharpens the senses to a fine edge. Every detail of the terrain comes into focus as you breathe it in.",
      highAlt:  "High ground opens the world like a map. The ranger's eye reads it all — what is below, what is ahead, what to avoid.",
      bigClimb: "The trail pitches upward and you lean into it. A ranger knows the climb is not the enemy. It is the point.",
      night:    "You move by feel and memory in the dark, reading the trail through the soles of your boots. Night is just another terrain.",
      dawn:     "Out on the trail before the light is full, you move through the half-world of early morning where every sense is heightened.",
    },
    2: {
      neutral:  "The trail reveals itself mile by mile. You have settled into the work — steady pace, clear eye, open terrain ahead.",
      rain:     "The rain has been falling for miles and you have been moving for all of them. A ranger in the rain is a ranger at home.",
      snow:     "The snow packs beneath each footfall. You read the terrain through the white and keep the path true.",
      thunder:  "The storm rolls in the distance and you match its energy. Neither of you has any intention of stopping.",
      hot:      "Heat radiates off every surface. A ranger knows how to move through it — conserve in the shade, push on the open ground.",
      cold:     "You have been moving long enough that the cold is no longer cold. It is just the air, and the air is what a ranger breathes.",
      highAlt:  "Altitude thins the world to its essentials. You move through open sky country with the ease of one who knows this terrain.",
      bigClimb: "The great slope tests legs and patience equally. You give both what they ask for and take what the climb owes you.",
      night:    "Well into the dark hours and still reading the trail with practiced ease. A ranger at night is no different — only quieter.",
      dawn:     "The morning has fully opened around you. You have been in it long enough to feel its weight, and you carry it well.",
    },
    3: {
      neutral:  "Miles behind, miles ahead, and the ranger in between — untroubled, unhurried, fully in the work of the trail.",
      rain:     "At this point the rain is less a challenge and more a shared condition — ranger and weather, moving together.",
      snow:     "The snow has deepened on the higher trail. You read the buried ground through instinct and move true.",
      thunder:  "Days of thunder and the ranger's pace has not varied once. The storm keeps its schedule; you keep yours.",
      hot:      "The heat has stopped being something you fight. You have learned to use it — burning away everything that slows a ranger down.",
      cold:     "Cold and miles are the ranger's oldest companions. You are deep in both now, and fully at ease.",
      highAlt:  "The ridge opens and the whole world tips away below. You hold your line, eyes on the far distance, still moving.",
      bigClimb: "You have entered the part of the climb where only commitment matters. You chose to come this far — you choose to go further.",
      night:    "Deep into the night-trail now. The dark has become familiar, and the ranger moves through it like water through stone.",
      dawn:     "Dawn breaks and you are already deep in the day's work. The light confirms what the dark already told you: you are exactly where you should be.",
    },
    4: {
      neutral:  "Frontier ground — unmarked on most maps, known only to those who earn the right to walk here. You have earned it.",
      rain:     "The rain followed you all the way to the edge of the known world. A ranger always arrives — rain or no rain.",
      snow:     "The frontier is white and still and enormous. You enter it the way a good ranger enters everything: quietly, eyes open, ready.",
      thunder:  "The storm's last rumbles echo across the frontier. You crossed every lightning-split mile of it and arrived. Well done, ranger.",
      hot:      "The heat breaks at the frontier's edge, as if the world offers one moment of relief to those who crossed the hard ground. You crossed it.",
      cold:     "The cold at the frontier is elemental rather than punishing. You stand in it and feel that you belong.",
      highAlt:  "This is the high ground most rangers only see from a distance. You are standing in it, looking further still.",
      bigClimb: "The final ascent delivers you to the frontier's edge. The climb is behind you. The wide horizon is ahead. Both are yours.",
      night:    "The frontier at night holds a silence most people never hear. You hear it, because you walked here. Few do.",
      dawn:     "The frontier reveals itself in first light, and you are here to receive it. The week ends on new ground.",
    },
  },

  warrior: {
    1: {
      neutral:  "The body moves and the week begins. All battles start the same way — not with a plan, but with a decision to begin.",
      rain:     "Rain strikes like a thousand small blows, and you answer each one by moving forward. First test of the week: retreat or advance. You advance.",
      snow:     "Snow packs under each boot like resistance made physical. The warrior meets resistance the same way every time — by stepping through it.",
      thunder:  "The sky fights with itself overhead. You ignore it the way you ignore everything that is not the next step forward.",
      hot:      "The heat is an opponent without a face. You beat it the way you beat any opponent — by staying in the fight longer.",
      cold:     "Cold is the body's complaint. You hear it, acknowledge it, and move anyway. That is what discipline looks like from the inside.",
      highAlt:  "High ground is the warrior's advantage. You climbed to claim it. The thin air is the tax; the elevation is the prize.",
      bigClimb: "The hill rises and the warrior rises with it. There is no alternative. The terrain does not negotiate.",
      night:    "Night robs you of sight and gives back something more useful: the certainty that you move when others rest.",
      dawn:     "You are already in motion when most are still deciding. That is how the warrior takes the field — early, without hesitation.",
    },
    2: {
      neutral:  "The early miles are behind you, and so is the easy part. The work has become the work now, and the warrior is at home in it.",
      rain:     "The storm has kept pace with you for miles. You have kept pace with everything. This is what training is for.",
      snow:     "Miles of snow. Miles of effort. The warrior converts both into the same currency: forward motion.",
      thunder:  "Thunder has been your backdrop since the start. You have moved through enough of it that it no longer registers as threat — only atmosphere.",
      hot:      "The heat takes something from every living thing moving through it. You give what it asks and take back double in endurance.",
      cold:     "Cold and effort are old companions to the soldier. You move through both with the efficiency of one who has no other option.",
      highAlt:  "The altitude is a test of the body, and the warrior does not fail tests. Lungs burn; legs answer every demand placed on them.",
      bigClimb: "The long climb has settled into its rhythm. The warrior finds the rhythm and holds it — this is how great distances get covered.",
      night:    "Midway through the dark and the warrior does not stop. Rest can wait. Forward cannot.",
      dawn:     "The day breaks and you are already into your miles. That advantage cannot be manufactured — it must be earned by rising.",
    },
    3: {
      neutral:  "The end of the week's work comes into view. A warrior who has come this far does not look for reasons to stop — only for the finish.",
      rain:     "The rain has been constant through days of effort. Today it soaks through without slowing you. You have moved past the point where weather matters.",
      snow:     "Snow-heavy miles pile up behind you. The warrior who marches through deep snow builds legs that can march through anything.",
      thunder:  "The storm has run alongside you all week. Today it grows louder, as if urging you on. The warrior accepts all allies.",
      hot:      "The heat has reached for your limits across days of effort and come back empty-handed. You are harder for the attempt.",
      cold:     "The freeze set in early in the week and has never left. Neither have you. That is what it means to outlast something.",
      highAlt:  "This high, the air is almost more concept than substance. The warrior breathes it in and finds enough. There is always enough.",
      bigClimb: "The great ascent continues past every point where a lesser resolve would have quit. Only forward remains for those who chose it.",
      night:    "Deep in the night's long campaign. The warrior fights every battle to its conclusion — this one is nearly there.",
      dawn:     "Another dawn finds you already in motion. At this point in the week, the warrior and the road have an understanding: neither stops.",
    },
    4: {
      neutral:  "The frontier. You marched to the edge of the mapped world this week — and kept going. The warrior's victory is measured in ground taken.",
      rain:     "The rain followed you all the way here. You brought the storm with you. This is what a warrior leaves in their wake.",
      snow:     "The frontier is blanketed in snow, and you cross it with the iron certainty of one who crossed everything else this week without stopping.",
      thunder:  "Lightning at the frontier. Thunder at the frontier. Warrior at the frontier. All three arrived together. Only one was expected.",
      hot:      "The heat broke everything it could break this week. You were not among the things it broke. The frontier is yours.",
      cold:     "Cold at the start, cold at the end. The warrior who outlasts the cold wins the week. You outlasted it.",
      highAlt:  "You climbed until the terrain ran out of altitude to challenge you. Frontier ground. High ground. Warrior ground.",
      bigClimb: "The final ascent delivers you to the edge of the mapped world. Below is where you started. Ahead is what you earned.",
      night:    "You carried the battle through the dark all week and arrived at the frontier before the week gave out. The night watched. The warrior moved.",
      dawn:     "Dawn at the frontier. You made it by moving when it was hard, cold, and early. The map ends here. You don't.",
    },
  },
};

/**
 * Determines the dominant environment signal from workout metadata and weather data.
 *
 * @param {{ avgElevationFt: number, elevationGainFt: number, startTime: Date|string }} workout
 * @param {{ weatherCode: number, temperatureC: number }|null} weather
 * @returns {string} signal key
 */
function determineSignal(workout, weather) {
  const wc = weather?.weatherCode ?? -1;
  const temp = weather?.temperatureC ?? null;
  const hour = new Date(workout.startTime).getUTCHours();

  if (wc >= 95 && wc <= 99) return 'thunder';
  if (wc >= 71 && wc <= 77) return 'snow';
  if ((wc >= 51 && wc <= 67) || (wc >= 80 && wc <= 82)) return 'rain';
  if (temp !== null && temp > 28) return 'hot';
  if (temp !== null && temp < 0) return 'cold';
  if ((workout.avgElevationFt ?? 0) > 8000) return 'highAlt';
  if ((workout.elevationGainFt ?? 0) > 2000) return 'bigClimb';
  if (hour >= 21 || hour < 4) return 'night';
  if (hour >= 5 && hour < 8) return 'dawn';
  return 'neutral';
}

/**
 * Generates a narrative story beat for a claimed expedition.
 *
 * @param {1|2|3|4} phase  — expedition phase (1=departure, 2=rhythm, 3=deep trail, 4=frontier)
 * @param {'wizard'|'archer'|'warrior'} archetype
 * @param {{ avgElevationFt: number, elevationGainFt: number, startTime: Date|string }} workout
 * @param {{ weatherCode: number, temperatureC: number }|null} weather
 * @returns {string}
 */
function generateNarrativeBeat(phase, archetype, workout, weather) {
  const signal = determineSignal(workout, weather);
  return (
    NARRATIVES[archetype]?.[phase]?.[signal] ??
    NARRATIVES[archetype]?.[phase]?.neutral ??
    NARRATIVES.wizard[phase].neutral
  );
}

module.exports = { generateNarrativeBeat, determineSignal };
