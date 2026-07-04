import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDateStr: string;
}

export function CountdownTimer({ targetDateStr }: CountdownTimerProps) {
  const isTbd = targetDateStr === "TBD" || targetDateStr === "To Be Decided" || !targetDateStr;

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });

  useEffect(() => {
    if (isTbd) return;

    const calculateTimeLeft = () => {
      // Treat target as the start of that day in the user's local timezone
      const targetDate = new Date(targetDateStr);
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return {
        days,
        hours,
        minutes,
        seconds,
        isPast: false
      };
    };

    // Initial run
    setTimeLeft(calculateTimeLeft());

    const intervalId = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetDateStr]);

  if (isTbd) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-900/60 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
        <Clock className="size-3.5 text-slate-400" />
        <span>Date To Be Decided</span>
      </div>
    );
  }

  if (timeLeft.isPast) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/40 py-2 px-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
        <Clock className="size-3.5 text-slate-400" />
        <span>Competition Event Started / Completed</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/30 dark:bg-blue-950/20 border border-blue-100/45 dark:border-blue-900/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 text-blue-500 animate-pulse" />
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider font-mono">Time Until Arena Kickoff</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* Days Box */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-150 dark:border-slate-800/85 rounded-lg p-1.5 text-center">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono leading-none">
            {timeLeft.days.toString().padStart(2, "0")}
          </div>
          <div className="text-[8px] font-bold text-slate-400 uppercase font-mono mt-0.5 tracking-wider">
            Days
          </div>
        </div>

        {/* Hours Box */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-150 dark:border-slate-800/85 rounded-lg p-1.5 text-center">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono leading-none">
            {timeLeft.hours.toString().padStart(2, "0")}
          </div>
          <div className="text-[8px] font-bold text-slate-400 uppercase font-mono mt-0.5 tracking-wider">
            Hours
          </div>
        </div>

        {/* Minutes Box */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-150 dark:border-slate-800/85 rounded-lg p-1.5 text-center">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono leading-none">
            {timeLeft.minutes.toString().padStart(2, "0")}
          </div>
          <div className="text-[8px] font-bold text-slate-400 uppercase font-mono mt-0.5 tracking-wider">
            Mins
          </div>
        </div>

        {/* Seconds Box */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-150 dark:border-slate-800/85 rounded-lg p-1.5 text-center">
          <div className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono leading-none">
            {timeLeft.seconds.toString().padStart(2, "0")}
          </div>
          <div className="text-[8px] font-bold text-slate-400 uppercase font-mono mt-0.5 tracking-wider">
            Secs
          </div>
        </div>
      </div>
    </div>
  );
}
