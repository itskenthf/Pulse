"use client";

import { useEffect, useState } from "react";
import { HERO_TIME_ZONE } from "./constants";

/** Ticks client-side every second — caching "the time" on a cron cycle
 *  would just show a frozen, wrong clock between refreshes. */
export function HeroClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Nothing time-dependent renders on the server, avoiding a hydration
  // mismatch — filled in once the client clock mounts.
  if (!now) return <span className="tabular-nums">--:--:--</span>;

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: HERO_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  return <span className="tabular-nums">{time}</span>;
}
