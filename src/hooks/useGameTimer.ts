import { useEffect, useState } from "react";

export function useGameTimer(startedAt: string | null, timeLimitMinutes: number) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!startedAt) return;

    function tick() {
      const elapsed = (Date.now() - new Date(startedAt!).getTime()) / 1000;
      const remaining = Math.max(0, timeLimitMinutes * 60 - elapsed);
      setSecondsLeft(Math.floor(remaining));
      if (remaining <= 0) setExpired(true);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timeLimitMinutes]);

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return { secondsLeft, expired, formatTime };
}
