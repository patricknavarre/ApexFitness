export type ExerciseGuide = {
  summary: string;
  cues: string[];
};

type GuideEntry = ExerciseGuide & { aliases: string[] };

const GUIDE_ENTRIES: GuideEntry[] = [
  {
    aliases: [
      'flat bench press',
      'flat db bench press',
      'db bench',
      'push-ups or db bench',
      'bench or push-up',
      'push-up or db bench',
    ],
    summary: 'Press weight from chest level to full arm extension to train chest, shoulders, and triceps.',
    cues: [
      'Retract shoulder blades and keep feet planted.',
      'Lower with control to chest or floor; elbows ~45° from torso.',
      'Drive up without flaring elbows or bouncing.',
    ],
  },
  {
    aliases: ['bench press', 'close-grip bench'],
    summary: 'Barbell press from the chest emphasizing chest, shoulders, and triceps.',
    cues: [
      'Grip slightly wider than shoulders; wrists stacked over elbows.',
      'Touch the bar to mid-chest with a slight arch in the upper back.',
      'Press straight up, keeping shoulder blades pinned.',
    ],
  },
  {
    aliases: ['incline db press', 'incline barbell press'],
    summary: 'Press upward on an inclined bench to target upper chest and front delts.',
    cues: [
      'Set bench ~30–45°; feet flat on the floor.',
      'Lower dumbbells or bar to upper chest with control.',
      'Press up without bouncing at the bottom.',
    ],
  },
  {
    aliases: [
      'overhead press',
      'overhead db press',
      'db overhead press',
      'db shoulder press',
      'seated db shoulder press',
    ],
    summary: 'Press weight overhead from shoulder height to build delts and triceps.',
    cues: [
      'Brace core; avoid excessive lower-back arch.',
      'Press in a straight line, finishing with biceps near ears.',
      'Lower to chin or upper chest with control.',
    ],
  },
  {
    aliases: [
      'lateral raises',
      'db lateral raises',
      'band lateral raises',
      'seated db lateral raise',
      'band lateral raise',
    ],
    summary: 'Raise arms out to the sides to isolate the side deltoids.',
    cues: [
      'Lead with elbows, not hands; slight bend in elbows.',
      'Raise to shoulder height without shrugging.',
      'Lower slowly — no swinging.',
    ],
  },
  {
    aliases: [
      'tricep pushdown',
      'band tricep pushdowns',
      'band tricep pushdown',
    ],
    summary: 'Extend elbows to straighten arms against resistance, targeting triceps.',
    cues: [
      'Pin elbows at your sides throughout the movement.',
      'Fully extend at the bottom and squeeze triceps.',
      'Return with control; don\'t let shoulders roll forward.',
    ],
  },
  {
    aliases: [
      'chest fly',
      'band chest flyes',
      'flat db fly',
      'cable fly',
      'cable or db fly',
      'incline db fly',
    ],
    summary: 'Open and close the arms in an arc to stretch and contract the chest.',
    cues: [
      'Keep a soft bend in elbows — imagine hugging a barrel.',
      'Lower until you feel a chest stretch without shoulder pain.',
      'Squeeze chest to bring weights together at the top.',
    ],
  },
  {
    aliases: [
      'romanian deadlift',
      'db romanian deadlifts',
      'romanian deadlift (light)',
      'romanian deadlift (bodyweight or light)',
      'single-leg db romanian deadlift',
    ],
    summary: 'Hinge at the hips with a flat back to train hamstrings and glutes.',
    cues: [
      'Push hips back; knees stay slightly bent, not locked.',
      'Keep the weight close to your legs throughout.',
      'Stop when you feel a hamstring stretch, then drive hips forward.',
    ],
  },
  {
    aliases: [
      'goblet squat',
      'goblet squat (pause)',
      'bodyweight or goblet squat',
      'goblet or back squat',
      'db goblet squats / split squats',
    ],
    summary: 'Squat holding a weight at chest height to train quads, glutes, and core.',
    cues: [
      'Hold weight at chest; elbows point down inside knees.',
      'Sit hips back and down; knees track over toes.',
      'Keep chest up and drive through mid-foot to stand.',
    ],
  },
  {
    aliases: ['leg curl', 'leg curls', 'seated single-leg curl', 'leg curl or nordic'],
    summary: 'Curl heels toward glutes to isolate the hamstrings.',
    cues: [
      'Keep hips pressed into the pad (machine) or stable (floor).',
      'Curl through full range without lifting hips.',
      'Lower slowly to full extension.',
    ],
  },
  {
    aliases: [
      'walking lunge',
      'db walking lunges',
      'bodyweight lunge',
      'split squat or lunge',
    ],
    summary: 'Step forward into a lunge to train quads, glutes, and balance.',
    cues: [
      'Take a long step; front knee tracks over ankle.',
      'Lower until back knee nearly touches the floor.',
      'Push through front heel to stand and step forward.',
    ],
  },
  {
    aliases: [
      'calf raises',
      'standing calf raises',
      'seated calf raises',
      'seated calf raise',
      'single-leg calf raise',
    ],
    summary: 'Rise onto the balls of your feet to strengthen calves.',
    cues: [
      'Full stretch at the bottom — heels below toe level if possible.',
      'Pause briefly at the top squeeze.',
      'Lower with control; avoid bouncing.',
    ],
  },
  {
    aliases: [
      'row',
      'db rows',
      'db row',
      'barbell or db row',
      'barbell row',
      'db or band row',
      'band or db row',
      'cable row',
    ],
    summary: 'Pull weight toward your torso to train lats, rhomboids, and biceps.',
    cues: [
      'Hinge slightly; keep spine neutral.',
      'Drive elbows back toward hips, not flared wide.',
      'Squeeze shoulder blades at the top; lower with control.',
    ],
  },
  {
    aliases: ['face pull', 'band face pulls', 'band face pull'],
    summary: 'Pull a band or cable toward your face to strengthen rear delts and rotator cuff.',
    cues: [
      'Pull toward forehead or upper cheeks, elbows high.',
      'Externally rotate at the end — think "pull apart."',
      'Control the return; don\'t let shoulders round forward.',
    ],
  },
  {
    aliases: ['db pullovers'],
    summary: 'Arc a dumbbell overhead and back to stretch lats and train chest.',
    cues: [
      'Lie on bench; hold one dumbbell with both hands overhead.',
      'Lower behind head with a slight elbow bend.',
      'Pull back over chest using lats, not just arms.',
    ],
  },
  {
    aliases: [
      'lat pulldown',
      'band lat pulldowns',
      'band lat pulldown',
      'lat pulldown or pull-ups',
      'band lat pulldown or pull-up',
    ],
    summary: 'Pull resistance down to your upper chest to train the lats.',
    cues: [
      'Lean back slightly; chest up.',
      'Pull elbows down and back, not just with hands.',
      'Squeeze lats at the bottom; control the return.',
    ],
  },
  {
    aliases: ['db shrugs'],
    summary: 'Elevate shoulders straight up to train the upper traps.',
    cues: [
      'Arms hang straight; no bending elbows.',
      'Shrug straight up toward ears, not rolling.',
      'Hold briefly at top; lower slowly.',
    ],
  },
  {
    aliases: [
      'bicep curl',
      'db bicep curls',
      'db curls',
      'db curl',
      'band curls',
      'band or db curl',
      'barbell curl',
      'seated db curl',
      'band curl',
      'cable curl',
      'incline db curls',
      'seated incline db curl',
      'incline db curl',
    ],
    summary: 'Curl weight toward shoulders to isolate the biceps.',
    cues: [
      'Keep elbows pinned at your sides.',
      'Curl without swinging hips or shoulders.',
      'Squeeze at the top; lower under control.',
    ],
  },
  {
    aliases: ['bulgarian split squat', 'bulgarian split squats', 'split squat'],
    summary: 'Single-leg squat with rear foot elevated to train quads and glutes.',
    cues: [
      'Rear foot on bench; front foot far enough for balance.',
      'Lower straight down — front knee over ankle.',
      'Drive through front heel; keep torso upright.',
    ],
  },
  {
    aliases: ['db step-ups'],
    summary: 'Step onto a box or bench driving through one leg at a time.',
    cues: [
      'Place entire foot on the box; don\'t push off back foot.',
      'Drive through the working heel to stand tall.',
      'Step down with control; alternate or complete one side.',
    ],
  },
  {
    aliases: ['db stiff-leg deadlifts', 'stiff-leg deadlift'],
    summary: 'Hinge with straighter legs to emphasize hamstring stretch and strength.',
    cues: [
      'Knees nearly straight but not locked.',
      'Hinge until you feel hamstrings stretch; back stays flat.',
      'Squeeze glutes to return to standing.',
    ],
  },
  {
    aliases: ['close-grip db press', 'close-grip press'],
    summary: 'Press with a narrow grip to emphasize triceps and inner chest.',
    cues: [
      'Hands shoulder-width or slightly narrower.',
      'Keep elbows tucked closer to the body than a standard press.',
      'Lower with control; press to full extension.',
    ],
  },
  {
    aliases: [
      'overhead tricep extension',
      'db overhead extension',
      'seated overhead db extension',
      'tricep extension',
      'overhead extension',
      'lying db tricep extension',
    ],
    summary: 'Extend elbows overhead or behind the head to isolate triceps.',
    cues: [
      'Keep upper arms fixed — only forearms move.',
      'Lower behind head until you feel a tricep stretch.',
      'Extend fully without flaring elbows out.',
    ],
  },
  {
    aliases: ['band tricep kickbacks', 'tricep kickback'],
    summary: 'Extend the arm back against resistance to hit the triceps.',
    cues: [
      'Hinge forward; upper arm parallel to the floor.',
      'Extend elbow fully; squeeze tricep at the top.',
      'Don\'t swing — keep upper arm still.',
    ],
  },
  {
    aliases: ['hammer curls', 'hammer curl', 'seated hammer curl'],
    summary: 'Curl with a neutral (palms-in) grip to train biceps and forearms.',
    cues: [
      'Palms face each other throughout.',
      'Curl without swinging; elbows stay at sides.',
      'Lower slowly to full extension.',
    ],
  },
  {
    aliases: [
      'push-ups',
      'push-up',
      'push-ups (or knee push-ups)',
      'incline push-up',
      'diamond push-up',
      'tricep pushdown or diamond push-up',
    ],
    summary: 'Lower and press your body to train chest, shoulders, and triceps.',
    cues: [
      'Body in a straight line from head to heels.',
      'Lower until chest nearly touches floor or bench.',
      'Press up without sagging hips or flaring elbows.',
    ],
  },
  {
    aliases: ['pike push-up', 'push-up or pike push-up'],
    summary: 'Push-up with hips high to emphasize shoulders.',
    cues: [
      'Hips up; body forms an inverted V.',
      'Lower head between hands, elbows at ~45°.',
      'Press back up; keep core tight.',
    ],
  },
  {
    aliases: ['plank'],
    summary: 'Hold a rigid body position to build core stability.',
    cues: [
      'Elbows under shoulders; body in one straight line.',
      'Brace abs and glutes; don\'t let hips sag or pike.',
      'Breathe steadily throughout the hold.',
    ],
  },
  {
    aliases: ['pull-ups', 'pull-up'],
    summary: 'Pull your body up to a bar to train lats, biceps, and grip.',
    cues: [
      'Hang with shoulders engaged — don\'t shrug up to ears.',
      'Pull elbows down and back; chin over bar.',
      'Lower with control to full hang.',
    ],
  },
  {
    aliases: ['hip thrust', 'hip thrust or glute bridge', 'glute bridge'],
    summary: 'Drive hips upward to squeeze glutes at the top.',
    cues: [
      'Upper back on bench (hip thrust) or floor (bridge).',
      'Drive through heels; squeeze glutes hard at top.',
      'Lower hips without rounding lower back.',
    ],
  },
  {
    aliases: ['dead bug', 'dead bug or hollow hold'],
    summary: 'Extend opposite arm and leg while keeping lower back pressed to the floor.',
    cues: [
      'Start with knees at 90° and arms toward ceiling.',
      'Lower opposite arm and leg slowly; back stays flat.',
      'Return to start; alternate sides with control.',
    ],
  },
  {
    aliases: ['hollow hold'],
    summary: 'Hold a curved body position with lower back pressed to the floor.',
    cues: [
      'Arms overhead, legs extended slightly off floor.',
      'Press lower back into the ground.',
      'Hold position; breathe without losing tension.',
    ],
  },
  {
    aliases: ['squat', 'back squat'],
    summary: 'Sit hips back and down, then stand to train quads, glutes, and core.',
    cues: [
      'Feet shoulder-width; toes slightly out.',
      'Break at hips and knees together; chest up.',
      'Drive through mid-foot; knees track over toes.',
    ],
  },
  {
    aliases: ['leg press', 'front squat or leg press'],
    summary: 'Press weight away with your legs on a sled or machine.',
    cues: [
      'Feet shoulder-width on platform; back flat on pad.',
      'Lower until knees reach ~90° without butt lifting.',
      'Press through full foot; don\'t lock knees aggressively.',
    ],
  },
  {
    aliases: ['front squat'],
    summary: 'Squat with the bar in front rack position to emphasize quads and core.',
    cues: [
      'Elbows high; bar rests on front delts.',
      'Stay upright; knees travel forward more than back squat.',
      'Drive up through mid-foot keeping chest tall.',
    ],
  },
  {
    aliases: ['deadlift'],
    summary: 'Lift weight from the floor by hinging and extending hips and knees.',
    cues: [
      'Bar over mid-foot; flat back, chest up at setup.',
      'Push floor away; bar stays close to legs.',
      'Lock out by squeezing glutes — don\'t hyperextend back.',
    ],
  },
  {
    aliases: ['skull crushers'],
    summary: 'Lower weight toward forehead with elbows fixed, then extend to hit triceps.',
    cues: [
      'Upper arms stay perpendicular to the floor.',
      'Lower to forehead or just behind head.',
      'Extend elbows fully without flaring arms.',
    ],
  },
  {
    aliases: ['bird dog'],
    summary: 'Extend opposite arm and leg from all fours to train core stability.',
    cues: [
      'Start on hands and knees; spine neutral.',
      'Extend arm and opposite leg to body height.',
      'Hold briefly; avoid rotating hips or arching back.',
    ],
  },
  {
    aliases: ['leg raise', 'leg raise or knee tuck', 'lying leg raise'],
    summary: 'Raise legs toward ceiling to train lower abs and hip flexors.',
    cues: [
      'Press lower back into floor or bench.',
      'Lift legs with control; don\'t swing.',
      'Lower slowly without arching lower back.',
    ],
  },
  {
    aliases: ['band or inverted row', 'inverted row'],
    summary: 'Pull your chest to a bar or rings at an angle to train upper back.',
    cues: [
      'Body straight from heels to shoulders.',
      'Pull chest to bar; squeeze shoulder blades.',
      'Lower with control to full arm extension.',
    ],
  },
  {
    aliases: ['leg extension', 'seated single-leg extension'],
    summary: 'Extend knees against resistance to isolate the quadriceps.',
    cues: [
      'Align knee with machine pivot point.',
      'Extend fully without locking aggressively.',
      'Lower with control to ~90°.',
    ],
  },
  {
    aliases: ['preacher curl'],
    summary: 'Curl with upper arms braced on a pad to isolate biceps.',
    cues: [
      'Armpits snug against pad; arms fully extended at start.',
      'Curl without lifting elbows off pad.',
      'Lower slowly to full stretch.',
    ],
  },
  {
    aliases: ['seated db front raise'],
    summary: 'Raise arms forward to shoulder height to target front delts.',
    cues: [
      'Arms straight or slightly bent; thumbs up or neutral.',
      'Raise to shoulder height without swinging.',
      'Lower with control.',
    ],
  },
  {
    aliases: ['prone incline db row'],
    summary: 'Row dumbbells chest-down on an incline bench to target upper back.',
    cues: [
      'Chest on bench; neck neutral.',
      'Row elbows back toward hips.',
      'Squeeze at top; lower without rounding shoulders.',
    ],
  },
  {
    aliases: ['single-arm db row', 'single-arm row'],
    summary: 'Row one dumbbell at a time with a hand-supported hinge.',
    cues: [
      'One knee and hand on bench; back flat.',
      'Pull elbow to hip, not flared wide.',
      'Squeeze lat at top; lower with control.',
    ],
  },
  {
    aliases: ['seated band row'],
    summary: 'Pull a band toward your torso while seated to train mid-back.',
    cues: [
      'Sit tall; band at chest height.',
      'Pull elbows back; squeeze shoulder blades.',
      'Return with control without rounding forward.',
    ],
  },
  {
    aliases: ['band straight-arm pulldown'],
    summary: 'Pull a band down with straight arms to isolate the lats.',
    cues: [
      'Arms stay straight with a slight elbow bend.',
      'Pull from shoulders down to thighs.',
      'Squeeze lats; return slowly overhead.',
    ],
  },
  {
    aliases: ['incline db rear delt fly'],
    summary: 'Raise arms out on an incline to target rear deltoids.',
    cues: [
      'Chest on incline bench; arms hang down.',
      'Raise arms out to sides leading with elbows.',
      'Squeeze rear delts; lower with control.',
    ],
  },
  {
    aliases: ['band external rotation'],
    summary: 'Rotate forearm outward against band resistance for rotator cuff health.',
    cues: [
      'Elbow pinned at 90° against your side.',
      'Rotate hand outward without moving elbow.',
      'Return slowly; use light resistance.',
    ],
  },
  {
    aliases: ['quad sets'],
    summary: 'Tighten the quadriceps isometrically without moving the knee.',
    cues: [
      'Leg straight; press knee down into the floor or towel.',
      'Squeeze quad hard for 5–10 seconds.',
      'Relax fully between reps.',
    ],
  },
  {
    aliases: ['straight-leg raise'],
    summary: 'Raise a straight leg from the floor to strengthen hip flexors and quads.',
    cues: [
      'Lie on back; one knee bent, one leg straight.',
      'Lift straight leg to ~45° without bending knee.',
      'Lower slowly without arching lower back.',
    ],
  },
  {
    aliases: ['seated terminal knee extension'],
    summary: 'Extend the knee from a bent position to activate the quad without load.',
    cues: [
      'Sit with knee bent over edge of chair.',
      'Extend knee fully; squeeze quad at top.',
      'Lower slowly to bent position.',
    ],
  },
  {
    aliases: ['ankle pumps + circles', 'ankle pumps'],
    summary: 'Move the ankle through flexion and circles to improve mobility and circulation.',
    cues: [
      'Point toes away, then pull toward shin.',
      'Make slow circles in both directions.',
      'Keep movements pain-free and controlled.',
    ],
  },
  {
    aliases: ['band hip abduction'],
    summary: 'Push knee outward against a band to strengthen outer hip muscles.',
    cues: [
      'Band above knees or around thighs while seated.',
      'Push knees apart against resistance.',
      'Control the return without letting band snap back.',
    ],
  },
  {
    aliases: ['db rollout'],
    summary: 'Roll a dumbbell or wheel forward from knees to challenge core stability.',
    cues: [
      'Kneel; hands on dumbbell or ab wheel.',
      'Roll forward keeping core braced and hips extended.',
      'Roll back using abs — don\'t collapse lower back.',
    ],
  },
  {
    aliases: ['seated russian twist'],
    summary: 'Rotate torso side to side to train obliques and core rotation.',
    cues: [
      'Sit with feet off floor or anchored; chest tall.',
      'Rotate shoulders, not just arms.',
      'Move with control; avoid jerking.',
    ],
  },
  {
    aliases: ['band pallof press'],
    summary: 'Press a band straight out while resisting rotation to build anti-rotation core strength.',
    cues: [
      'Stand or sit perpendicular to anchor; band at chest.',
      'Press arms straight out; resist the pull sideways.',
      'Hold briefly; return to chest with control.',
    ],
  },
];

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const aliasLookup = new Map<string, ExerciseGuide>();

for (const entry of GUIDE_ENTRIES) {
  for (const alias of entry.aliases) {
    aliasLookup.set(normalizeExerciseName(alias), {
      summary: entry.summary,
      cues: entry.cues,
    });
  }
}

function lookupSingle(name: string): ExerciseGuide | null {
  const normalized = normalizeExerciseName(name);
  if (!normalized || normalized === 'see workout mode') return null;
  return aliasLookup.get(normalized) ?? null;
}

export function getExerciseGuide(exerciseName: string): ExerciseGuide | null {
  const direct = lookupSingle(exerciseName);
  if (direct) return direct;

  const orParts = exerciseName.split(/\s+or\s+/i);
  if (orParts.length > 1) {
    for (const part of orParts) {
      const match = lookupSingle(part);
      if (match) return match;
    }
  }

  const slashParts = exerciseName.split(/\s*\/\s*/);
  if (slashParts.length > 1) {
    for (const part of slashParts) {
      const match = lookupSingle(part);
      if (match) return match;
    }
  }

  return null;
}
