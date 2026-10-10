/**
 * GD Arena – Discussion controller.
 * Manages turn IDs, phases, pause detection, nudge, and retry logic.
 */

// Turn ID: bumped on every interruption to discard stale replies
let currentTurnId = 0;

export function getTurnId() {
  return currentTurnId;
}

export function bumpTurnId() {
  currentTurnId++;
  return currentTurnId;
}

export function isTurnStale(id) {
  return id !== currentTurnId;
}

/**
 * Determine the GD phase based on elapsed time and duration.
 * opening → middle → closing → ended
 */
export function getPhase(elapsedSec, durationSec, moderatorHasOpened) {
  if (elapsedSec >= durationSec) return "ended";
  if (elapsedSec >= durationSec * 0.8) return "closing";
  if (moderatorHasOpened) return "middle";
  return "opening";
}

/**
 * Check if a silent nudge should be shown.
 * True if the student hasn't spoken for 180+ seconds during middle phase.
 */
export function shouldShowNudge(lastStudentSpeechTime, currentTime, phase) {
  if (phase !== "middle") return false;
  if (lastStudentSpeechTime === null) return currentTime > 180;
  return (currentTime - lastStudentSpeechTime) >= 180;
}

/**
 * Panel configuration.
 */
export const PANEL_ORDER = ["Aarav", "Meera", "Kabir", "Riya", "Dev"];

export const PARTICIPANT_INFO = {
  Moderator: { role: "Moderator", color: "#94a3b8" },
  Aarav: { role: "Dominator", color: "#ff6b6b" },
  Meera: { role: "Data-driven", color: "#4ecdc4" },
  Kabir: { role: "Quiet contributor", color: "#a78bfa" },
  Riya: { role: "Creative", color: "#fbbf24" },
  Dev: { role: "Tangential", color: "#38bdf8" },
  Student: { role: "You", color: "#6c5ce7" },
};

export const TOPIC_PRESETS = [
  "Should AI replace human jobs?",
  "Social media: harm or good?",
  "The colour of success",
  "Case: training vs automation",
];

export const FORMAT_OPTIONS = [
  { value: "general", label: "General" },
  { value: "case", label: "Case Study" },
  { value: "abstract", label: "Abstract" },
  { value: "controversial", label: "Controversial" },
];
