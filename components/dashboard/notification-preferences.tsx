"use client";

import { Button } from "@/components/ui/button";
import {
  BellRing,
  Monitor,
  Moon,
  Smartphone,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import {
  playNotificationChime,
  saveNotificationPreferences,
  useNotificationPreferences,
  type NotificationPreferences as Preferences,
} from "@/lib/notification-preferences";

type Feedback = { kind: "success" | "error"; message: string };

export function NotificationPreferences() {
  const preferences = useNotificationPreferences();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [isTestingDesktop, setIsTestingDesktop] = useState(false);

  function updatePreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    const updated = { ...preferences, [key]: value };
    try {
      saveNotificationPreferences(updated);
      setFeedback({ kind: "success", message: "Preferences saved on this device." });
    } catch (error) {
      console.error("Unable to save notification preferences.", error);
      setFeedback({
        kind: "error",
        message: "Preferences could not be saved in this browser.",
      });
    }
  }

  async function testSound() {
    setIsTestingSound(true);
    setFeedback(null);
    try {
      await playNotificationChime();
      setFeedback({
        kind: "success",
        message: "Test sound played. Check your device volume to confirm it is audible.",
      });
    } catch (error) {
      console.error("Unable to play the notification test sound.", error);
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to play the test sound in this browser.",
      });
    } finally {
      setIsTestingSound(false);
    }
  }

  async function requestDesktopPermission() {
    if (!("Notification" in window)) {
      throw new Error("Desktop notifications are not supported by this browser.");
    }
    if (!window.isSecureContext) {
      throw new Error("Desktop notifications require a secure (HTTPS) connection.");
    }

    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "Desktop notifications are blocked in your browser settings."
          : "Desktop notification permission was not granted.",
      );
    }
  }

  async function enableDesktopNotifications() {
    setFeedback(null);
    try {
      await requestDesktopPermission();
      updatePreference("desktop", true);
    } catch (error) {
      console.error("Unable to enable desktop notifications.", error);
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to enable desktop notifications.",
      });
    }
  }

  async function testDesktopNotification() {
    setIsTestingDesktop(true);
    setFeedback(null);
    try {
      await requestDesktopPermission();
      new Notification("TaskFlow AI", {
        body: "This is a test notification. New task updates will appear here.",
      });
      setFeedback({
        kind: "success",
        message: "Test desktop notification sent.",
      });
    } catch (error) {
      console.error("Unable to show the desktop notification test.", error);
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to show a desktop notification.",
      });
    } finally {
      setIsTestingDesktop(false);
    }
  }

  const vibrationSupported =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  const desktopSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    window.isSecureContext;

  return (
    <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-9">
      <header className="mb-8">
        <p className="text-sm font-semibold text-violet-600 dark:text-violet-300">Make it yours</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Notification preferences
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Choose how TaskFlow keeps you informed about task reminders and
          updates. These preferences are saved only in this browser.
        </p>
      </header>

      <section
        aria-label="Notification preferences"
        className="dashboard-card overflow-hidden"
      >
        <PreferenceRow
          icon={<Volume2 aria-hidden="true" size={19} />}
          title="Enable Notification Sound"
          description="Play a short chime when a new task notification arrives."
          checked={preferences.sound}
          onChange={(checked) => updatePreference("sound", checked)}
        >
          <Button
            type="button"
            variant="outline"
            disabled={isTestingSound}
            onClick={testSound}
            className="rounded-xl border-slate-200"
          >
            {isTestingSound ? "Playing..." : "Test Sound"}
          </Button>
        </PreferenceRow>

        <PreferenceRow
          icon={<Monitor aria-hidden="true" size={19} />}
          title="Enable Desktop Notifications"
          description={
            desktopSupported
              ? "Show a private, generic alert for new task updates."
              : "Desktop notifications require browser support and a secure connection."
          }
          checked={preferences.desktop}
          disabled={!desktopSupported}
          onChange={(checked) => {
            if (checked) void enableDesktopNotifications();
            else updatePreference("desktop", false);
          }}
        >
          <Button
            type="button"
            variant="outline"
            disabled={isTestingDesktop || !desktopSupported}
            onClick={testDesktopNotification}
            className="rounded-xl border-slate-200"
          >
            {isTestingDesktop ? "Sending..." : "Test Desktop Notification"}
          </Button>
        </PreferenceRow>

        <PreferenceRow
          icon={<Smartphone aria-hidden="true" size={19} />}
          title="Enable Vibration"
          description={
            vibrationSupported
              ? "Vibrate when a new task notification arrives."
              : "Vibration is not supported by this browser or device."
          }
          checked={preferences.vibration}
          disabled={!vibrationSupported}
          onChange={(checked) => updatePreference("vibration", checked)}
        />

        <PreferenceRow
          icon={<Moon aria-hidden="true" size={19} />}
          title="Do Not Disturb"
          description="Pause notification sounds, desktop alerts, and vibration."
          checked={preferences.doNotDisturb}
          onChange={(checked) => updatePreference("doNotDisturb", checked)}
          last
        />
      </section>

      {feedback && (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            feedback.kind === "error"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <BellRing
          aria-hidden="true"
          size={17}
          className="mt-1 shrink-0 text-indigo-500"
        />
        <p>
          Alerts work while TaskFlow is open in this browser. Browser permission
          is requested only when you enable or test desktop notifications.
          Preferences do not sync across devices, and closed-browser push alerts
          are not included.
        </p>
      </div>
    </div>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  checked,
  disabled = false,
  onChange,
  children,
  last = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6 ${
        last ? "" : "border-b border-slate-100 dark:border-slate-800"
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? "bg-[#6554F5]" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
