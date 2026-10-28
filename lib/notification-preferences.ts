"use client";

import { useEffect, useState } from "react";

export type NotificationPreferences = {
  sound: boolean;
  desktop: boolean;
  vibration: boolean;
  doNotDisturb: boolean;
};

const STORAGE_KEY = "taskflow-notification-preferences";
const CHANGE_EVENT = "taskflow:notification-preferences-change";

export const defaultNotificationPreferences: NotificationPreferences = {
  sound: false,
  desktop: false,
  vibration: false,
  doNotDisturb: false,
};

function parsePreferences(value: string | null): NotificationPreferences {
  if (!value) return defaultNotificationPreferences;

  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object") {
    return defaultNotificationPreferences;
  }

  const candidate = parsed as Record<string, unknown>;
  return {
    sound: candidate.sound === true,
    desktop: candidate.desktop === true,
    vibration: candidate.vibration === true,
    doNotDisturb: candidate.doNotDisturb === true,
  };
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences,
) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(
    new CustomEvent<NotificationPreferences>(CHANGE_EVENT, {
      detail: preferences,
    }),
  );
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState(
    defaultNotificationPreferences,
  );

  useEffect(() => {
    function loadPreferences() {
      try {
        setPreferences(
          parsePreferences(window.localStorage.getItem(STORAGE_KEY)),
        );
      } catch (error) {
        console.error("Unable to load notification preferences.", error);
      }
    }

    function handlePreferenceChange(event: Event) {
      const customEvent = event as CustomEvent<NotificationPreferences>;
      setPreferences(customEvent.detail);
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      try {
        setPreferences(parsePreferences(event.newValue));
      } catch (error) {
        console.error("Unable to read updated notification preferences.", error);
      }
    }

    loadPreferences();
    window.addEventListener(CHANGE_EVENT, handlePreferenceChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(CHANGE_EVENT, handlePreferenceChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return preferences;
}

export async function playNotificationChime() {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) {
    throw new Error("Audio playback is not supported by this browser.");
  }

  const context = new AudioContextConstructor();
  try {
    await context.resume();

    const notes = [
      { frequency: 660, start: context.currentTime, duration: 0.16 },
      { frequency: 880, start: context.currentTime + 0.18, duration: 0.22 },
    ];

    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.0001, note.start);
      gain.gain.exponentialRampToValueAtTime(0.12, note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        note.start + note.duration,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(note.start);
      oscillator.stop(note.start + note.duration);
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 450);
    });
  } finally {
    await context.close();
  }
}
