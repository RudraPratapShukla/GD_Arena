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

    // Prefer English voices
    const englishVoices = voices.filter(
      (v) => v.lang.startsWith("en") && !v.name.includes("Google")
    );
    const allUsable = englishVoices.length >= 3 ? englishVoices : voices.filter(v => v.lang.startsWith("en"));
    const fallbackVoices = allUsable.length >= 2 ? allUsable : voices;

    // Pitch variations to differentiate
    const pitchMap = {
      Moderator: 1.0,
      Aarav: 0.85,
      Meera: 1.2,
      Kabir: 0.95,
      Riya: 1.3,
      Dev: 1.05,
    };

    const rateMap = {
      Moderator: 1.0,
      Aarav: 1.05,
      Meera: 1.0,
      Kabir: 0.9,
      Riya: 1.05,
      Dev: 1.1,
    };

    const allParticipants = ["Moderator", ...participants];
    allParticipants.forEach((name, i) => {
      voiceMap[name] = {
        voice: fallbackVoices[i % fallbackVoices.length],
        pitch: pitchMap[name] || 1.0,
        rate: rateMap[name] || 1.0,
      };
    });

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
