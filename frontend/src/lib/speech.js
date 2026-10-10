/**
 * GD Arena – Speech module.
 * STT (webkitSpeechRecognition) + TTS (speechSynthesis) with queue and cancel.
 */

// ---------- TTS (Text-to-Speech) ----------

// Voice assignments per participant (set at runtime from available voices)
let voiceMap = {};
let ttsQueue = [];
let isSpeaking = false;
let onSpeakingChange = null;
let onSpeechEnd = null;

/**
 * Initialize voice map from available browser voices.
 * Assigns distinct voices/pitches per participant.
 */
export function initVoices(participants, callback) {
  const assignVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // Prefer English/Indian English voices
    const enVoices = voices.filter(
      (v) => v.lang.startsWith("en") || v.lang.startsWith("hi")
    );
    const pool = enVoices.length > 0 ? enVoices : voices;

    // Prioritize natural / online / Google voices which sound vastly superior
    const naturalVoices = pool.filter(v => 
      v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Online") || v.name.includes("Neural")
    );
    const primaryPool = naturalVoices.length >= 3 ? naturalVoices : pool;

    // Detect female and male voices
    const femaleKeywords = ["female", "zira", "samantha", "victoria", "karen", "susan", "catherine", "heera", "veena", "hazel"];
    const maleKeywords = ["male", "david", "george", "mark", "richard", "james", "ravi", "sean", "guy"];

    const females = primaryPool.filter(v => femaleKeywords.some(k => v.name.toLowerCase().includes(k)));
    const males = primaryPool.filter(v => maleKeywords.some(k => v.name.toLowerCase().includes(k)));

    const getMale = (idx) => (males.length > 0 ? males[idx % males.length] : primaryPool[idx % primaryPool.length]);
    const getFemale = (idx) => (females.length > 0 ? females[idx % females.length] : primaryPool[(idx + 1) % primaryPool.length]);

    // Natural human pitch (0.97 - 1.03) and gentle speaking rates
    voiceMap = {
      Moderator: {
        voice: primaryPool.find(v => v.name.includes("UK") || v.name.includes("George")) || primaryPool[0],
        pitch: 1.0,
        rate: 0.98,
      },
      Aarav: {
        voice: getMale(0),
        pitch: 0.98,
        rate: 1.02,
      },
      Meera: {
        voice: getFemale(0),
        pitch: 1.02,
        rate: 0.98,
      },
      Kabir: {
        voice: getMale(1),
        pitch: 0.97,
        rate: 0.95,
      },
      Riya: {
        voice: getFemale(1),
        pitch: 1.03,
        rate: 1.02,
      },
      Dev: {
        voice: getMale(2),
        pitch: 1.01,
        rate: 1.03,
      },
    };

    if (callback) callback(voiceMap);
  };

  // Voices may load async
  if (window.speechSynthesis.getVoices().length > 0) {
    assignVoices();
  }
  window.speechSynthesis.onvoiceschanged = assignVoices;
}

/**
 * Speak a line with the participant's voice.
 * Returns a promise that resolves when done or cancelled.
 */
export function speak(name, text, onStart, onEnd) {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const config = voiceMap[name];

    if (config) {
      utterance.voice = config.voice;
      utterance.pitch = config.pitch;
      utterance.rate = config.rate;
    }

    utterance.onstart = () => {
      isSpeaking = true;
      if (onStart) onStart(name);
      if (onSpeakingChange) onSpeakingChange(name);
    };

    utterance.onend = () => {
      isSpeaking = false;
      if (onEnd) onEnd(name);
      if (onSpeakingChange) onSpeakingChange(null);
      if (onSpeechEnd) onSpeechEnd();
      resolve(true);
    };

    utterance.onerror = () => {
      isSpeaking = false;
      if (onSpeakingChange) onSpeakingChange(null);
      resolve(false);
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Cancel all TTS immediately (for interruptions).
 */
export function cancelTTS() {
  window.speechSynthesis.cancel();
  ttsQueue = [];
  isSpeaking = false;
  if (onSpeakingChange) onSpeakingChange(null);
}

export function setOnSpeakingChange(cb) {
  onSpeakingChange = cb;
}

export function setOnSpeechEnd(cb) {
  onSpeechEnd = cb;
}

export function getIsSpeaking() {
  return isSpeaking;
}

// ---------- STT (Speech-to-Text) ----------

let recognition = null;
let isListening = false;

/**
 * Start speech recognition.
 * @param {object} options - { onInterim, onFinal, onError, lang }
 * @returns {object} - { stop(), isSupported }
 */
export function startSTT({ onInterim, onFinal, onError, lang = "en-US" }) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError("unsupported");
    return { stop: () => {}, isSupported: false };
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        final += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }

    if (interim && onInterim) onInterim(interim);
    if (final && onFinal) onFinal(final.trim());
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed") {
      if (onError) onError("denied");
    } else if (event.error !== "aborted" && event.error !== "no-speech") {
      if (onError) onError(event.error);
    }
  };

  recognition.onend = () => {
    // Auto-restart if still supposed to be listening
    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        // Already started
      }
    }
  };

  try {
    recognition.start();
    isListening = true;
  } catch (e) {
    if (onError) onError("failed");
  }

  return {
    stop: () => {
      isListening = false;
      if (recognition) {
        recognition.stop();
        recognition = null;
      }
    },
    isSupported: true,
  };
}

export function stopSTT() {
  isListening = false;
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

export function getIsListening() {
  return isListening;
}
