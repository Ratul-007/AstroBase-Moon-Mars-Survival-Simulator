import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

const AUDIO_SOURCE = "/audio/background-music.mp3";
const MUTE_STORAGE_KEY = "astrobase-background-music-muted";
const VOLUME_STORAGE_KEY = "astrobase-background-music-volume";
const DEFAULT_VOLUME = 0.28;
const DEFAULT_SFX_VOLUME = 0.42;
const SFX_MUTE_STORAGE_KEY = "astrobase-gameplay-sfx-muted";
const SFX_VOLUME_STORAGE_KEY = "astrobase-gameplay-sfx-volume";

const SFX_SOURCES = {
  footstep:
    "/sounds/kenney_impact-sounds/Audio/footstep_concrete_000.ogg",
  interaction:
    "/sounds/kenney_sci-fi-sounds/Audio/impactMetal_000.ogg",
  collect:
    "/sounds/kenney_impact-sounds/Audio/impactMining_000.ogg",
  click:
    "/sounds/kenney_interface-sounds/Audio/click_001.ogg",
  confirm:
    "/sounds/kenney_interface-sounds/Audio/confirmation_001.ogg",
  error:
    "/sounds/kenney_interface-sounds/Audio/error_001.ogg",
  warning:
    "/sounds/kenney_interface-sounds/Audio/error_003.ogg",
  engine:
    "/sounds/kenney_sci-fi-sounds/Audio/engineCircular_000.ogg",
  ignition:
    "/sounds/kenney_sci-fi-sounds/Audio/thrusterFire_000.ogg",
  flight:
    "/sounds/kenney_sci-fi-sounds/Audio/spaceEngine_000.ogg",
};

const AudioContext = createContext(null);

function handleAudioError(event) {
  console.error("AstroBase background music could not be loaded.", event);
}

function readStoredBoolean(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function readStoredVolume() {
  try {
    const value = Number(window.localStorage.getItem(VOLUME_STORAGE_KEY));
    return Number.isFinite(value) && value >= 0 && value <= 1
      ? value
      : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function readStoredSfxVolume() {
  try {
    const value = Number(window.localStorage.getItem(SFX_VOLUME_STORAGE_KEY));
    return Number.isFinite(value) && value >= 0 && value <= 1
      ? value
      : DEFAULT_SFX_VOLUME;
  } catch {
    return DEFAULT_SFX_VOLUME;
  }
}

export function AudioManager({ children }) {
  const location = useLocation();
  const audioRef = useRef(null);
  const sfxPoolsRef = useRef(new Map());
  const sfxLastPlayedRef = useRef(new Map());
  const [isMuted, setIsMuted] = useState(() =>
    readStoredBoolean(MUTE_STORAGE_KEY, false)
  );
  const [volume, setVolume] = useState(readStoredVolume);
  const [isSfxMuted, setIsSfxMuted] = useState(() =>
    readStoredBoolean(SFX_MUTE_STORAGE_KEY, false)
  );
  const [sfxVolume, setSfxVolume] = useState(readStoredSfxVolume);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [gameplayActive, setGameplayActive] = useState(false);
  const [launchActive, setLaunchActive] = useState(
    location.pathname === "/mission"
  );
  const [missionComplete, setMissionComplete] = useState(false);

  const isMissionRoute = location.pathname === "/mission";
  const shouldPlay =
    !isMissionRoute ||
    (!launchActive && !gameplayActive) ||
    missionComplete;

  useEffect(() => {
    const audio = new Audio(AUDIO_SOURCE);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    audio.addEventListener("error", handleAudioError);
    audioRef.current = audio;

    return () => {
      audio.removeEventListener("error", handleAudioError);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const pools = new Map();

    Object.entries(SFX_SOURCES).forEach(([name, source]) => {
      const pool = Array.from({ length: name === "footstep" ? 4 : 2 }, () => {
        const audio = new Audio(source);
        audio.preload = "auto";
        audio.addEventListener("error", handleAudioError);
        return audio;
      });

      pools.set(name, pool);
    });

    sfxPoolsRef.current = pools;

    return () => {
      pools.forEach((pool) => {
        pool.forEach((audio) => {
          audio.pause();
          audio.removeEventListener("error", handleAudioError);
          audio.removeAttribute("src");
          audio.load();
        });
      });
      sfxPoolsRef.current = new Map();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }

    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // Preferences still apply for the current session.
    }
  }, [volume]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
    } catch {
      // Preferences still apply for the current session.
    }
  }, [isMuted]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SFX_MUTE_STORAGE_KEY,
        String(isSfxMuted)
      );
      window.localStorage.setItem(
        SFX_VOLUME_STORAGE_KEY,
        String(sfxVolume)
      );
    } catch {
      // Preferences still apply for the current session.
    }
  }, [isSfxMuted, sfxVolume]);

  const playSfx = useCallback(
    (name, { cooldown = 0, volumeScale = 1, loop = false } = {}) => {
      if (isSfxMuted) return;

      const pool = sfxPoolsRef.current.get(name);
      if (!pool) return;

      const now = performance.now();
      const lastPlayed = sfxLastPlayedRef.current.get(name) ?? -Infinity;
      if (now - lastPlayed < cooldown) return;

      const audio =
        pool.find((item) => item.paused || item.ended) ?? pool[0];
      audio.pause();
      audio.currentTime = 0;
      audio.loop = loop;
      audio.volume = Math.min(1, sfxVolume * volumeScale);
      sfxLastPlayedRef.current.set(name, now);
      audio.play().catch(() => {
        // A browser may require a user gesture before SFX playback.
      });
    },
    [isSfxMuted, sfxVolume]
  );

  const stopSfx = useCallback((name) => {
    const pool = sfxPoolsRef.current.get(name);
    if (!pool) return;

    pool.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    });
  }, []);

  const speakAnnouncement = useCallback((text) => {
    if (
      isSfxMuted ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.94;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [isSfxMuted]);

  useEffect(() => {
    const playIfAllowed = () => {
      const audio = audioRef.current;
      if (!audio || !shouldPlay || isMuted) return;

      audio.play().catch(() => {
        // Playback will be retried after the next legitimate interaction.
      });
    };

    const handleInteraction = () => {
      setIsAudioUnlocked(true);
      playIfAllowed();
    };

    document.addEventListener("pointerdown", handleInteraction, {
      once: true,
    });
    document.addEventListener("keydown", handleInteraction, { once: true });
    playIfAllowed();

    return () => {
      document.removeEventListener("pointerdown", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [isMuted, shouldPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!shouldPlay || isMuted) {
      audio.pause();
      return;
    }

    if (isAudioUnlocked) {
      audio.play().catch(() => setIsAudioUnlocked(false));
    }
  }, [isAudioUnlocked, isMuted, shouldPlay]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) setIsAudioUnlocked(true);
  };

  const contextValue = useMemo(
    () => ({
      isMuted,
      isSfxMuted,
      playSfx,
      speakAnnouncement,
      setGameplayActive,
      setLaunchActive,
      setMissionComplete,
      setIsSfxMuted,
      stopSfx,
      toggleMute,
      volume,
      setVolume,
      sfxVolume,
      setSfxVolume,
    }),
    [
      isMuted,
      isSfxMuted,
      playSfx,
      sfxVolume,
      speakAnnouncement,
      stopSfx,
      volume,
    ]
  );

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
      <div className="audio-controls" aria-label="Background music controls">
        <button
          type="button"
          className="audio-toggle"
          onClick={toggleMute}
          aria-pressed={isMuted}
          title={isMuted ? "Unmute background music" : "Mute background music"}
        >
          {isMuted ? "🔇" : "🔊"}{" "}
          <span>{isMuted ? "Music off" : "Music on"}</span>
        </button>
        <label className="audio-volume">
          <span>Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Background music volume"
          />
        </label>
        <button
          type="button"
          className="audio-toggle"
          onClick={() => setIsSfxMuted((muted) => !muted)}
          aria-pressed={isSfxMuted}
          title={isSfxMuted ? "Unmute gameplay sounds" : "Mute gameplay sounds"}
        >
          {isSfxMuted ? "🔕" : "🎮"} <span>SFX</span>
        </button>
        <label className="audio-volume">
          <span>SFX</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sfxVolume}
            onChange={(event) => setSfxVolume(Number(event.target.value))}
            aria-label="Gameplay sound effects volume"
          />
        </label>
      </div>
    </AudioContext.Provider>
  );
}

export function useAudioManager() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudioManager must be used inside AudioManager");
  }

  return context;
}
