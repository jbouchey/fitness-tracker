/**
 * Narrative Engine — pre-written story beats for Adventure Mode.
 * 3 archetypes × 4 waypoints × 10 environment signals.
 */

const NARRATIVES = {
  wizard: {
    1: {
      neutral:  "The first league of your quest is behind you, arcane one. Your staff leaves its mark on the road as you stride forward into the unknown.",
      rain:     "Rain lashes your robes as you cross the first waypoint. A true mage does not shelter from storms — they walk through them.",
      snow:     "Through hushed, frozen silence you have completed the first leg. The snow remembers every step of a wizard who passes.",
      thunder:  "Lightning splits the sky above as you reach the first waypoint. Power recognises power, and the storm acknowledges your stride.",
      hot:      "The sun beats down on scorched earth, but your resolve burns hotter still. The first waypoint falls beneath your feet.",
      cold:     "Frost clings to the air as you finish the opening stretch. Your breath rises in silver curls — a mage's signature on the winter wind.",
      highAlt:  "At this altitude the stars feel impossibly close. The thin air carries ancient magic, and you pass the first waypoint among the clouds.",
      bigClimb: "The climb demanded everything, and you gave it freely. First waypoint claimed from the mountain's reluctant grip.",
      night:    "Beneath a moonlit sky you reach the first waypoint. The darkness holds no fear for one who wields their own light.",
      dawn:     "As the first light breaks the horizon, so too does your first waypoint. A new day, a new victory — the road is yours.",
    },
    2: {
      neutral:  "Halfway. The path behind is as long as the path ahead. You pause only to note the distance, then press on.",
      rain:     "The rain hasn't let up, and neither have you. Midway through the quest, your robes are soaked but your spirit is iron.",
      snow:     "Halfway through the blizzard, halfway through the quest. The cold is nothing but a reminder that you are still moving.",
      thunder:  "Thunder rolls through the valley as you cross the midpoint. The storm salutes a mage who will not be turned back.",
      hot:      "The heat shimmers on the horizon, but you have reached the halfway mark. Your willpower casts its own shade.",
      cold:     "Halfway done, and the cold has become a companion rather than an enemy. You stride on, frost and fire in equal measure.",
      highAlt:  "Halfway through the quest, halfway to the sky. The summit watches as a wizard climbs toward it with steady, purposeful steps.",
      bigClimb: "The great climb is half-conquered. Your legs are alive with effort, your mind alight with the magic of perseverance.",
      night:    "The moon is high and so is your pace. You cross the midpoint of this quest under silver light, invisible to all but the stars.",
      dawn:     "The morning is young and so is your momentum. Half the quest complete before the world has fully woken.",
    },
    3: {
      neutral:  "Three-quarters done. The finish line can almost be heard — a quiet hum of achievement just beyond the next rise.",
      rain:     "The storm has battered you for hours, yet here you stand at the third waypoint. The rain now feels like applause.",
      snow:     "Three-quarters through the frozen silence. The snow does not slow a mage who has come this far.",
      thunder:  "Lightning at your back, waypoint three beneath your feet. The storm has escorted you this far — let it see you to the end.",
      hot:      "The heat pressed hard, but you pressed harder. Three waypoints down; the final stretch awaits.",
      cold:     "The cold is a memory now — your fire has outlasted it. Third waypoint reached, final stretch ahead.",
      highAlt:  "Near the summit of this week's challenge. The air is thin, but your will fills every breath.",
      bigClimb: "Three-quarters up the mountain and you have not faltered once. The peak is within reach, arcane one.",
      night:    "Deep in the night and deep into the quest. Only one waypoint separates you from a complete week's magic.",
      dawn:     "The dawn has fully broken and so has the back of this quest. One final push awaits.",
    },
    4: {
      neutral:  "The quest is complete. The realm bows to your dedication, arcane one. Let the stars record this week in their long memory.",
      rain:     "You have crossed the finish line through rain and will. Not every mage completes their quest — you did.",
      snow:     "Through ice and silence and frozen dawn you have done it. Quest complete. The tundra yields to no one, yet it yielded to you.",
      thunder:  "Lightning and victory — you have earned both. A wizard who finishes their quest in a storm becomes the storm.",
      hot:      "The scorched earth could not hold you. Quest complete under a relentless sun. You are more relentless still.",
      cold:     "From frost to finish line. You have conquered the cold and the quest both. The winter owes you a debt.",
      highAlt:  "From the heights of this week's summit, you have stood and conquered. Quest complete, arcane one. Descend victorious.",
      bigClimb: "Mountain conquered. Quest conquered. You leave your staff's mark at the top and carry the proof in your legs.",
      night:    "You have run through the night and finished before it ended. Quest complete. The moon has witnessed everything.",
      dawn:     "A new week will dawn soon, but first — quest complete. You saw it through from the first light to the last step.",
    },
  },

  archer: {
    1: {
      neutral:  "First waypoint marked. Your trail is true and your pace steady. The forest notes the passing of a ranger who knows where they're going.",
      rain:     "Rain or shine, a ranger reads the trail. First waypoint hit through the downpour — wet boots, dry focus.",
      snow:     "Your tracks through the snow are clean and deliberate. First waypoint reached. The wilderness takes note.",
      thunder:  "Thunder cracked overhead as you crossed the first mark. No ranger worth their quiver flinches at weather.",
      hot:      "The heat bakes the open trail, but you know how to pace yourself on hard ground. First waypoint, done.",
      cold:     "Cold air sharpens every sense. You cleared the first waypoint with the precision of an arrow finding its mark.",
      highAlt:  "The elevation opens the view for miles. You pass the first waypoint with the mountains as your witness.",
      bigClimb: "The climb tested your stride, and your stride answered. First waypoint earned the hard way — the only way.",
      night:    "You navigate by feel and instinct in the dark. First waypoint reached without hesitation.",
      dawn:     "Out before the world stirred, you've already marked the first waypoint. The early ranger claims the road.",
    },
    2: {
      neutral:  "Halfway through the week. Your quiver is still full and your legs are still willing. The trail hasn't beaten you yet.",
      rain:     "The rain has soaked through, but a ranger moves regardless. Halfway done — the mud is just scenery.",
      snow:     "Halfway through the quest and the snow hasn't slowed you once. You know how to move in any terrain.",
      thunder:  "Storm raging, pace steady. Midpoint of the quest, no sign of stopping. A ranger finishes what they start.",
      hot:      "The sun at its peak, and so are you. Halfway through the quest, fully in your stride.",
      cold:     "Midpoint, cold air, burning lungs — this is what a ranger trains for. Half done, half to go.",
      highAlt:  "Halfway through the quest and halfway up the ridge. The view from here makes every step worth it.",
      bigClimb: "The climb is half-conquered. You rest only long enough to sight the next target, then move.",
      night:    "Halfway through the night, halfway through the quest. The dark is just another kind of trail.",
      dawn:     "Morning light climbing, quest progress climbing. Halfway, and the day is still young.",
    },
    3: {
      neutral:  "Three waypoints in. You've been reading the trail right all week. One more mark and the quest is yours.",
      rain:     "Three waypoints through the rain. A lesser ranger might have sheltered — you kept moving.",
      snow:     "Three of four waypoints through the snow. Your tracks lead forward, always forward.",
      thunder:  "Third waypoint hit as another rumble rolls through. The storm is a backdrop now. You're nearly done.",
      hot:      "Three-quarters through in the heat. The final stretch is yours — you've proven you have the endurance.",
      cold:     "Cold to the bone, but three waypoints in. The finish is close. You can feel it.",
      highAlt:  "High on the ridge with three waypoints behind you. The final stretch opens ahead like a gift.",
      bigClimb: "Three-quarters up the mountain. The summit is close, and so is the quest completion.",
      night:    "Three waypoints in the dark. One more, and a ranger can rest. Almost there.",
      dawn:     "Three waypoints marked by morning light. One final push and the quest is done.",
    },
    4: {
      neutral:  "Quest complete. Arrow loosed, target hit. You've covered every mile you set out to cover this week, ranger.",
      rain:     "Rain-soaked and relentless — that's how you finish a quest. Well done, ranger. The forest remembers.",
      snow:     "Through frozen trails and biting wind, you've seen this quest to the end. The wilderness bows to persistence.",
      thunder:  "Storm and all, quest complete. A ranger who finishes in a thunderstorm earns double the respect.",
      hot:      "Every mile in the heat was a mile earned. Quest complete. The open trail couldn't hold you back.",
      cold:     "Cold start, cold middle, and a hot finish. Quest complete, ranger. The cold never wins against will.",
      highAlt:  "From the heights, quest complete. You've earned the view and the finish. Descend with pride.",
      bigClimb: "Mountain, quest, done. You climbed until there was nothing left to climb. A ranger always finds the summit.",
      night:    "Through the night, every step deliberate, you've finished the quest. Sleep well, ranger — you earned it.",
      dawn:     "Dawn witness to your final step. Quest complete before the dew has dried. The early ranger takes everything.",
    },
  },

  warrior: {
    1: {
      neutral:  "The first enemy of this quest has fallen — inertia. You have risen, moved, and conquered the opening ground. The week bends to your will.",
      rain:     "Rain hammers down as you charge through the first waypoint. Warriors are not made in comfort. They are made in storms like this.",
      snow:     "Through ice and silence, the first waypoint is behind you. Cold sharpens a warrior the same way a whetstone sharpens a blade.",
      thunder:  "Thunder rolls as you crash through the first mark. The battlefield always has weather — it has never slowed a true warrior.",
      hot:      "The heat is your opponent, and you have beaten it through the first waypoint. Sweat is a warrior's proof of effort.",
      cold:     "Frost and fortitude — that is what the first waypoint demanded. You delivered both without hesitation.",
      highAlt:  "The altitude taxes the lungs of the weak. For a warrior, it is simply the price of the high ground. First waypoint taken.",
      bigClimb: "The climb was a fight, and you won it. First waypoint secured. A warrior never yields to the hill.",
      night:    "Night is just darkness, and darkness is just another enemy. First waypoint cleared without slowing once.",
      dawn:     "You struck before the day even woke up. First waypoint claimed at dawn. A warrior seizes every advantage.",
    },
    2: {
      neutral:  "Halfway. Many fall at this point — the will frays before the legs do. Yours has not. Press on.",
      rain:     "Soaked and still standing. Halfway through the quest in weather that would stop most. You are not most.",
      snow:     "Half the quest done in the snow. The cold tried to stop you and found that warriors do not stop.",
      thunder:  "Lightning at the midpoint. The storm rages and so do you. Halfway through — nothing short of completion will do.",
      hot:      "Half done under a burning sky. You've pushed through the heat that breaks lesser wills. Keep driving.",
      cold:     "Halfway through the frozen stretch. The cold has become your ally now. Forge ahead.",
      highAlt:  "Halfway up this week's mountain. Your lungs burn like a forge. A warrior uses the heat.",
      bigClimb: "The great ascent is half behind you. Your legs are iron and your spirit is steel. On to the summit.",
      night:    "Midpoint, darkness, no quarter asked. A warrior fights in the dark the same as in the light.",
      dawn:     "Halfway done by morning light. You were moving before most people thought about moving. That is the warrior's edge.",
    },
    3: {
      neutral:  "Three-quarters. The final stretch is close. A warrior who has come this far does not leave the field unfinished.",
      rain:     "Three waypoints through the storm. You are soaked, tired, and unstoppable. One more push.",
      snow:     "Three of four waypoints through the cold. The quest is nearly yours. A warrior finishes what they start.",
      thunder:  "Third waypoint in the lightning. The storm has tested you and found you unbreakable. Finish it.",
      hot:      "Three-quarters through the heat. Every drop of sweat is a medal. One final push and the quest is done.",
      cold:     "Three waypoints through the freeze. You are almost there. A warrior does not stop when the end is in sight.",
      highAlt:  "Near the summit. Three waypoints behind you, one ahead. The air is thin, but your will is not.",
      bigClimb: "You have climbed three-quarters of this mountain. The peak is within reach. Take it.",
      night:    "Deep in the night, third waypoint secured. One more and the darkness owes you a victory.",
      dawn:     "Third waypoint at first light. The day is young but the quest is nearly done. Close it out.",
    },
    4: {
      neutral:  "Quest complete. The battlefield is yours, warrior. You fought every day of this week and left nothing on the field.",
      rain:     "Rain-soaked and relentless, you have finished the quest. A warrior who conquers in a storm is twice the warrior.",
      snow:     "Through blizzard and bitter cold you have done it. Quest complete. The frozen ground yields to the warrior who refuses to stop.",
      thunder:  "Lightning and victory — you have earned both this week, warrior. The storm was your training partner and you surpassed it.",
      hot:      "The heat baked the ground and you ran on it anyway. Quest complete. The sun has a new opponent it cannot beat.",
      cold:     "From the first frozen step to the last, you did not give the cold one inch. Quest complete. The winter is yours.",
      highAlt:  "Summit reached. Quest complete. You climbed where others wouldn't, and you did not come down until you were done.",
      bigClimb: "Mountain and quest, both conquered. There are warriors who talk about the climb. You are one who finished it.",
      night:    "You ran through the night and came out the other side with the quest complete. The dark was never a match for your drive.",
      dawn:     "First light, last step, quest done. A warrior who starts early and finishes strong has mastered the week.",
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
 * Generates a narrative story beat for a quest waypoint.
 *
 * @param {1|2|3|4} waypointNum
 * @param {'wizard'|'archer'|'warrior'} archetype
 * @param {{ avgElevationFt: number, elevationGainFt: number, startTime: Date|string }} workout
 * @param {{ weatherCode: number, temperatureC: number }|null} weather
 * @returns {string}
 */
function generateNarrativeBeat(waypointNum, archetype, workout, weather) {
  const signal = determineSignal(workout, weather);
  return (
    NARRATIVES[archetype]?.[waypointNum]?.[signal] ??
    NARRATIVES[archetype]?.[waypointNum]?.neutral ??
    NARRATIVES.wizard[waypointNum].neutral
  );
}

module.exports = { generateNarrativeBeat, determineSignal };
