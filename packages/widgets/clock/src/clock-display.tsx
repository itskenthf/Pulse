"use client";

import { useEffect, useState } from "react";
import type { ClockSettings } from "./types";

export function ClockDisplay({ settings }: { settings: ClockSettings }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    // Nothing time-dependent renders on the server, avoiding a
    // hydration mismatch — filled in once the client clock mounts.
    return (
      <p className="text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        --:--:--
      </p>
    );
  }

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: settings.hour12,
  }).format(now);

  return (
    <p className="text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{time}</p>
  );
}
