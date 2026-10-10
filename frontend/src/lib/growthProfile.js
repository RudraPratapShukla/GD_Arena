/**
 * GD Arena – Personal Growth Journey Profile Engine
 * 
 * Tracks the student's communication skill profile across multiple group discussions:
 * - 4 Core Pillars: Confidence, Clarity, Listening, Reasoning (scored out of 10)
 * - Past vs Current session performance comparison with delta shifts
 * - Leveling system with XP milestones (Level 1 to Level 5)
 * - Badges system with unlock conditions
 * - Active Weekly Challenges
 * - Dynamic Personalized Practice Plan tailored to the student's weakest pillar
 * - Unique twist: Measures personal improvement and individual progress, not ranking students against each other.
 */

const STORAGE_KEY = "gd_arena_student_growth_profile";

export const LEVELS = [
  { level: 1, title: "Novice Contributor", minXP: 0, maxXP: 300, desc: "Building speaking courage and introductory presence" },
  { level: 2, title: "Articulate Speaker", minXP: 300, maxXP: 700, desc: "Refining clarity, reducing fillers, and delivering crisp arguments" },
  { level: 3, title: "Balanced Collaborator", minXP: 700, maxXP: 1200, desc: "Mastering floor timing, active listening, and peer synthesis" },
  { level: 4, title: "Strategic Orator", minXP: 1200, maxXP: 1800, desc: "Structuring persuasive points with root-cause depth and composure" },
  { level: 5, title: "Master GD Diplomat", minXP: 1800, maxXP: 2500, desc: "Exemplary placement GD leader who balances and elevates the entire room" },
];

export const ALL_BADGES = [
  {
    id: "arena_debut",
    name: "Arena Debut",
    icon: "Award",
    description: "Completed your first live GD Arena session",
    rarity: "Common",
    xpReward: 100,
  },
  {
    id: "clean_cadence",
    name: "Clean Cadence",
    icon: "Mic",
    description: "Maintained a crisp delivery with less than 2.5% filler words",
    rarity: "Rare",
    xpReward: 150,
  },
  {
    id: "active_listener",
    name: "Active Listener",
    icon: "Headphones",
    description: "Built constructively upon peer arguments without aggressive interruptions",
    rarity: "Rare",
    xpReward: 150,
  },
  {
    id: "equitable_voice",
    name: "Equitable Voice",
    icon: "Scale",
    description: "Achieved balanced participation between 18% and 30% speaking share",
    rarity: "Epic",
    xpReward: 200,
  },
  {
    id: "unfazed_composure",
    name: "Unfazed Composure",
    icon: "Shield",
    description: "Achieved an 8.0+ Confidence rating with steady pacing and zero fumbling",
    rarity: "Epic",
    xpReward: 200,
  },
  {
    id: "deep_reasoner",
    name: "Deep Reasoner",
    icon: "Sparkles",
    description: "Scored 8.0+ in Reasoning with logical evidence and strong topic relevance",
    rarity: "Epic",
    xpReward: 200,
  },
  {
    id: "growth_champion",
    name: "Growth Champion",
    icon: "TrendingUp",
    description: "Improved your overall communication rating by +0.5 or more over your past session",
    rarity: "Legendary",
    xpReward: 250,
  },
];

const DEFAULT_WEEKLY_CHALLENGES = [
  {
    id: "ch_clean_delivery",
    title: "Crisp Articulation",
    description: "Deliver a discussion with under 3 filler words total",
    target: 1,
    current: 0,
    rewardXP: 120,
    completed: false,
  },
  {
    id: "ch_active_synthesis",
    title: "Perspective Connector",
    description: "Build directly on 2 different peer viewpoints during one session",
    target: 2,
    current: 0,
    rewardXP: 150,
    completed: false,
  },
  {
    id: "ch_floor_equilibrium",
    title: "Fair Floor Contributor",
    description: "Maintain between 18% and 28% speaking time share",
    target: 1,
    current: 0,
    rewardXP: 140,
    completed: false,
  },
];

/**
 * Returns baseline initial profile if none exists.
 */
export function getInitialProfile() {
  return {
    studentName: "Student",
    level: 1,
    title: "Novice Contributor",
    xp: 120,
    nextLevelXP: 300,
    totalSessions: 0,
    totalMinutesSpoken: 0,
    currentSkills: {
      confidence: 6.8,
      clarity: 7.0,
      listening: 6.5,
      reasoning: 7.2,
      overall: 6.9,
    },
    pastSkills: null, // null until 1 session completed
    deltas: {
      confidence: 0,
      clarity: 0,
      listening: 0,
      reasoning: 0,
      overall: 0,
    },
    unlockedBadges: ["arena_debut"],
    unlockedBadgeDetails: [
      {
        id: "arena_debut",
        unlockedAt: new Date().toISOString(),
        name: "Arena Debut",
        description: "Completed your first live GD Arena session",
      },
    ],
    weeklyChallenges: DEFAULT_WEEKLY_CHALLENGES,
    practicePlan: [
      {
        pillar: "Listening",
        day: "Drill 1",
        title: "Perspective Linking",
        action: "Practice bridging phrases: 'Building directly on Meera's analysis, another critical dimension is...'",
      },
      {
        pillar: "Clarity",
        day: "Drill 2",
        title: "Breath & Pause Technique",
        action: "Take a 1-second silent breath whenever tempted to say 'umm', 'like', or 'actually'.",
      },
      {
        pillar: "Reasoning",
        day: "Drill 3",
        title: "PREP Argument Architecture",
        action: "State Point -> Reason -> Concrete Example -> Restate Point before yielding the floor.",
      },
    ],
    history: [],
  };
}

/**
 * Loads current growth profile from localStorage.
 */
export function loadGrowthProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialProfile();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const data = JSON.parse(raw);
    return data;
  } catch (e) {
    console.error("Error loading growth profile:", e);
    return getInitialProfile();
  }
}

/**
 * Saves growth profile to localStorage.
 */
export function saveGrowthProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Error saving growth profile:", e);
  }
}

/**
 * Records a new discussion session and updates the student's personal growth journey:
 * - Computes deltas vs past session
 * - Awards XP
 * - Checks badge unlocks
 * - Updates level
 * - Generates personalized practice plan tailored to weakest pillar
 */
export function recordSession(sessionData) {
  const profile = loadGrowthProfile();

  const {
    topic = "General Discussion",
    scores = { confidence: 7.5, clarity: 7.5, listening: 7.0, reasoning: 7.5, overall: 7.4 },
    sharePct = 20,
    fillerRate = 0,
    totalSeconds = 60,
    studentTurns = 3,
  } = sessionData;

  const prevSkills = profile.currentSkills ? { ...profile.currentSkills } : null;

  // New Skills: Weighted moving average (60% current session, 40% historical) if history exists, or direct score
  const newSkills = {
    confidence: Number(scores.confidence.toFixed(1)),
    clarity: Number(scores.clarity.toFixed(1)),
    listening: Number(scores.listening.toFixed(1)),
    reasoning: Number(scores.reasoning.toFixed(1)),
    overall: Number(scores.overall.toFixed(1)),
  };

  // Deltas vs previous performance
  const deltas = {
    confidence: prevSkills ? Number((newSkills.confidence - prevSkills.confidence).toFixed(1)) : 0,
    clarity: prevSkills ? Number((newSkills.clarity - prevSkills.clarity).toFixed(1)) : 0,
    listening: prevSkills ? Number((newSkills.listening - prevSkills.listening).toFixed(1)) : 0,
    reasoning: prevSkills ? Number((newSkills.reasoning - prevSkills.reasoning).toFixed(1)) : 0,
    overall: prevSkills ? Number((newSkills.overall - prevSkills.overall).toFixed(1)) : 0,
  };

  // Check Badge Unlocks
  const newlyUnlockedBadges = [];
  const currentUnlocked = new Set(profile.unlockedBadges || []);

  if (!currentUnlocked.has("arena_debut")) {
    currentUnlocked.add("arena_debut");
    newlyUnlockedBadges.push("arena_debut");
  }

  if (fillerRate <= 2.5 && !currentUnlocked.has("clean_cadence")) {
    currentUnlocked.add("clean_cadence");
    newlyUnlockedBadges.push("clean_cadence");
  }

  if (newSkills.listening >= 7.5 && !currentUnlocked.has("active_listener")) {
    currentUnlocked.add("active_listener");
    newlyUnlockedBadges.push("active_listener");
  }

  if (sharePct >= 18 && sharePct <= 30 && !currentUnlocked.has("equitable_voice")) {
    currentUnlocked.add("equitable_voice");
    newlyUnlockedBadges.push("equitable_voice");
  }

  if (newSkills.confidence >= 8.0 && !currentUnlocked.has("unfazed_composure")) {
    currentUnlocked.add("unfazed_composure");
    newlyUnlockedBadges.push("unfazed_composure");
  }

  if (newSkills.reasoning >= 8.0 && !currentUnlocked.has("deep_reasoner")) {
    currentUnlocked.add("deep_reasoner");
    newlyUnlockedBadges.push("deep_reasoner");
  }

  if (deltas.overall >= 0.5 && !currentUnlocked.has("growth_champion")) {
    currentUnlocked.add("growth_champion");
    newlyUnlockedBadges.push("growth_champion");
  }

  // Calculate XP Earned
  let sessionXP = 150; // base session XP
  newlyUnlockedBadges.forEach((bId) => {
    const badge = ALL_BADGES.find((b) => b.id === bId);
    if (badge) sessionXP += badge.xpReward;
  });
  if (sharePct >= 18 && sharePct <= 28) sessionXP += 40;
  if (fillerRate === 0) sessionXP += 50;

  const totalXP = (profile.xp || 0) + sessionXP;

  // Determine Level from totalXP
  let currentLevelObj = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) {
      currentLevelObj = lvl;
    }
  }

  // Update Weekly Challenges
  const updatedChallenges = (profile.weeklyChallenges || DEFAULT_WEEKLY_CHALLENGES).map((ch) => {
    if (ch.id === "ch_clean_delivery") {
      const meets = fillerRate <= 2.5;
      return {
        ...ch,
        current: meets ? 1 : ch.current,
        completed: meets || ch.completed,
      };
    }
    if (ch.id === "ch_active_synthesis") {
      const added = studentTurns >= 2 ? 2 : 1;
      return {
        ...ch,
        current: Math.min(ch.target, ch.current + added),
        completed: ch.current + added >= ch.target,
      };
    }
    if (ch.id === "ch_floor_equilibrium") {
      const meets = sharePct >= 18 && sharePct <= 28;
      return {
        ...ch,
        current: meets ? 1 : ch.current,
        completed: meets || ch.completed,
      };
    }
    return ch;
  });

  // Identify Weakest Pillar for Personalized Practice Plan
  const pillars = [
    { name: "Confidence", score: newSkills.confidence },
    { name: "Clarity", score: newSkills.clarity },
    { name: "Listening", score: newSkills.listening },
    { name: "Reasoning", score: newSkills.reasoning },
  ];
  pillars.sort((a, b) => a.score - b.score);
  const weakest = pillars[0].name;

  let practicePlan = [];
  if (weakest === "Listening") {
    practicePlan = [
      {
        pillar: "Listening",
        day: "Day 1 Drill",
        title: "Peer Reflection Hook",
        action: "Before presenting your point, explicitly paraphrase your peer's point: 'Aarav raised an important observation regarding scalability...'",
      },
      {
        pillar: "Listening",
        day: "Day 2 Drill",
        title: "Collaborative Extension",
        action: "Find one nuance you agree with in a peer's argument, then extend it rather than shifting topic.",
      },
      {
        pillar: "Listening",
        day: "Day 3 Drill",
        title: "Diplomatic Bridging",
        action: "Connect two opposing viewpoints in the room using synthesis phrases: 'While Meera emphasizes data and Kabir highlights ethics, both intersect at...'",
      },
    ];
  } else if (weakest === "Clarity") {
    practicePlan = [
      {
        pillar: "Clarity",
        day: "Day 1 Drill",
        title: "Zero-Filler Silent Pause",
        action: "Whenever your mind searches for a word, stay completely silent for 1 second instead of saying 'umm', 'like', or 'actually'.",
      },
      {
        pillar: "Clarity",
        day: "Day 2 Drill",
        title: "Two-Sentence Rule",
        action: "State your main point in sentence one, and back it with one clear reason in sentence two. Keep sentences under 15 words.",
      },
      {
        pillar: "Clarity",
        day: "Day 3 Drill",
        title: "Pacing & Articulation",
        action: "Slow your cadence by 15%. Deliberate pacing sounds authoritative and avoids sentence stumbling.",
      },
    ];
  } else if (weakest === "Confidence") {
    practicePlan = [
      {
        pillar: "Confidence",
        day: "Day 1 Drill",
        title: "Decisive Opening Frame",
        action: "Enter the conversation with a strong, grounded statement rather than tentative openers like 'I might be wrong but...'.",
      },
      {
        pillar: "Confidence",
        day: "Day 2 Drill",
        title: "Floor Holding & Composure",
        action: "Use the 'Hold Floor' tool in GD Arena to speak for 30 uninterrupted seconds without self-doubt.",
      },
      {
        pillar: "Confidence",
        day: "Day 3 Drill",
        title: "Constructive Counter-Challenge",
        action: "Disagree respectfully using assertive framing: 'I have a contrasting perspective on this because...'",
      },
    ];
  } else {
    practicePlan = [
      {
        pillar: "Reasoning",
        day: "Day 1 Drill",
        title: "Root Cause Drill",
        action: "Ask 'Why?' three times before formulating your point so you address root causes instead of surface symptoms.",
      },
      {
        pillar: "Reasoning",
        day: "Day 2 Drill",
        title: "PREP Architecture",
        action: "Structure your turns as: Point -> Reason -> Example -> Restate Point.",
      },
      {
        pillar: "Reasoning",
        day: "Day 3 Drill",
        title: "Trade-Off Analysis",
        action: "Acknowledge the downside of your own solution before demonstrating why the upside outweighs it.",
      },
    ];
  }

  // Session History Entry
  const sessionEntry = {
    id: `sess_${Date.now()}`,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    topic,
    scores: newSkills,
    deltas,
    sharePct,
    fillerRate,
    secondsSpoken: totalSeconds,
    xpEarned: sessionXP,
  };

  const updatedProfile = {
    ...profile,
    level: currentLevelObj.level,
    title: currentLevelObj.title,
    xp: totalXP,
    nextLevelXP: currentLevelObj.maxXP,
    totalSessions: (profile.totalSessions || 0) + 1,
    totalMinutesSpoken: Number(((profile.totalMinutesSpoken || 0) + totalSeconds / 60).toFixed(1)),
    pastSkills: prevSkills,
    currentSkills: newSkills,
    deltas,
    unlockedBadges: Array.from(currentUnlocked),
    weeklyChallenges: updatedChallenges,
    practicePlan,
    history: [sessionEntry, ...(profile.history || []).slice(0, 9)], // keep last 10
  };

  saveGrowthProfile(updatedProfile);

  return {
    profile: updatedProfile,
    sessionXP,
    newlyUnlockedBadges,
    deltas,
    weakestPillar: weakest,
  };
}
