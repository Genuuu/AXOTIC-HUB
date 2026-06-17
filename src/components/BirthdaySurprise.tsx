import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gift, 
  Sparkles, 
  X, 
  Flame, 
  Wind, 
  PartyPopper, 
  Award, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Lock
} from "lucide-react";
import { UserProfile } from "../types";
import { checkIsTodayBirthday } from "../utils";

// Dynamic Web Audio API synthesizer for instant zero-dependency sound effects
class SoundEngine {
  private static ctx: AudioContext | null = null;
  public static enabled: boolean = true;

  private static getContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Synthesis for popping balloons
  public static playPop() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    
    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.1; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(2.0, now);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (_) {}
  }

  // Synthesis for blowing out a candle
  public static playBlow() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.51);
    } catch (_) {}
  }

  // Synthesis for triumphant multi-tone chime fanfare
  public static playFanfare() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C major arpeggio
      
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.085;
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.46);
      });
    } catch (_) {}
  }
}

interface BirthdaySurpriseProps {
  currentUser: UserProfile;
  isDark?: boolean;
  onClaim?: () => void;
}

interface Particle {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

interface Balloon {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  speed: number;
  popped: boolean;
  wiggleSeed: number;
}

export default function BirthdaySurprise({ currentUser, isDark = false, onClaim }: BirthdaySurpriseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCandleBeenBlown, setHasCandleBeenBlown] = useState(false);
  const [activeStep, setActiveStep] = useState<"candle" | "gift" | "badge">("candle");
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [greetingWish, setGreetingWish] = useState("");
  const [wishCasted, setWishCasted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Microphone blowing detection states
  const [micActive, setMicActive] = useState(false);
  const [micDbLevel, setMicDbLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Dynamic generated decorative components
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isTodayActualBirthday, setIsTodayActualBirthday] = useState(false);

  // Read dismissed flag with user ID to verify correctness
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(`axotic_bday_dismissed_2026_${currentUser.uid}`) === "true";
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const claimKey = `axotic_bday_claimed_${todayStr}_${currentUser.uid}`;

  // Read claimed state
  const [claimedToday, setClaimedToday] = useState(() => {
    return localStorage.getItem(claimKey) === "true";
  });

  // Sound Engine syncs with localized audio toggle state
  useEffect(() => {
    SoundEngine.enabled = audioEnabled;
  }, [audioEnabled]);

  // Robust parsing of standard and local configuration profiles
  useEffect(() => {
    const matches = checkIsTodayBirthday(currentUser.birthday);
    setIsTodayActualBirthday(matches);

    // Auto trigger original presentation
    if (matches && !dismissed) {
      setIsOpen(true);
    }
  }, [currentUser.birthday, dismissed]);

  // Generate gorgeous physical simulation offsets
  const generateCelebrationVisuals = () => {
    const palette = [
      "bg-amber-400", "bg-sky-400", "bg-rose-450", "bg-emerald-400", 
      "bg-purple-500", "bg-yellow-300", "bg-pink-400", "bg-teal-400", 
      "bg-indigo-400", "bg-gradient-to-tr from-amber-250 to-orange-400"
    ];

    const generatedParticles: Particle[] = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 95 + 2.5,
      size: Math.random() * 9 + 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 3
    }));

    const balloonGradients = [
      "from-rose-400 via-rose-500 to-rose-600",
      "from-sky-400 via-sky-500 to-sky-600",
      "from-amber-400 via-amber-500 to-amber-600",
      "from-emerald-400 via-emerald-500 to-emerald-600",
      "from-purple-400 via-purple-500 to-purple-600",
      "from-pink-400 via-pink-500 to-pink-600",
      "from-indigo-400 via-indigo-500 to-indigo-600"
    ];

    const generatedBalloons: Balloon[] = Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      x: Math.random() * 85 + 7.5,
      color: balloonGradients[Math.floor(Math.random() * balloonGradients.length)],
      size: Math.random() * 15 + 40,
      delay: Math.random() * 3.5,
      speed: Math.random() * 4 + 7,
      wiggleSeed: Math.random() * 35 - 17,
      popped: false
    }));

    setParticles(generatedParticles);
    setBalloons(generatedBalloons);
  };

  useEffect(() => {
    if (isOpen) {
      generateCelebrationVisuals();
    }
  }, [isOpen]);

  // Clean micro-sound generators and callbacks
  const handlePopBalloon = (id: number) => {
    SoundEngine.playPop();
    setBalloons(prev => 
      prev.map(b => b.id === id ? { ...b, popped: true } : b)
    );
  };

  const stopActiveMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicActive(false);
    setMicDbLevel(0);
  };

  const handleBlowCandle = () => {
    stopActiveMic();
    SoundEngine.playBlow();
    setHasCandleBeenBlown(true);
    
    // Auto shift to next creative stage after beautiful 1s camera fade
    setTimeout(() => {
      setActiveStep("gift");
    }, 1100);
  };

  // Listen to blow microphone
  const toggleMicDetection = async () => {
    if (micActive) {
      stopActiveMic();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      const microphone = ctx.createMediaStreamSource(stream);
      analyser.fftSize = 128;
      microphone.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      setMicActive(true);

      let thresholdBlowDuration = 0;

      const analyze = () => {
        if (!mediaStreamRef.current || hasCandleBeenBlown) return;
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicDbLevel(Math.min(100, Math.round((avg / 128) * 100)));

        // Blow detection matches mid frequency noise representing blowing winds
        if (avg > 58) {
          thresholdBlowDuration++;
          if (thresholdBlowDuration >= 8) { // Held for ~120ms
            handleBlowCandle();
            return;
          }
        } else {
          thresholdBlowDuration = Math.max(0, thresholdBlowDuration - 1);
        }

        requestAnimationFrame(analyze);
      };

      analyze();
    } catch (_) {
      alert("Microphone access was denied or is blocked by your security rules. Please use the instant click fallback!");
    }
  };

  const handleCastWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (greetingWish.trim()) {
      setWishCasted(true);
      setTimeout(() => {
        SoundEngine.playFanfare();
      }, 200);
      localStorage.setItem(`axotic_bday_wish_2026_${currentUser.uid}`, greetingWish.trim());
    }
  };

  const handleClaimBadgeAndClose = () => {
    stopActiveMic();
    setIsOpen(false);
    localStorage.setItem(claimKey, "true");
    setClaimedToday(true);
    localStorage.setItem(`axotic_bday_dismissed_2026_${currentUser.uid}`, "true");
    setDismissed(true);
    if (onClaim) {
      onClaim();
    }
  };

  const handleCloseSurprise = () => {
    stopActiveMic();
    setIsOpen(false);
    localStorage.setItem(`axotic_bday_dismissed_2026_${currentUser.uid}`, "true");
    setDismissed(true);
    if (activeStep === "badge") {
      localStorage.setItem(claimKey, "true");
      setClaimedToday(true);
      if (onClaim) {
        onClaim();
      }
    }
  };

  // Developers and support team can reset state instantly
  const handleForceTrigger = () => {
    stopActiveMic();
    setDismissed(false);
    setHasCandleBeenBlown(false);
    setIsGiftOpened(false);
    setWishCasted(false);
    setGreetingWish("");
    setIsOpen(true);
    setActiveStep("candle");
    localStorage.removeItem(claimKey);
    setClaimedToday(false);
  };

  return (
    <>
      {/* FLOATING ACTION ICON & DECORATIVE BADGE */}
      {!claimedToday && (
        <div className="fixed bottom-24 right-4 z-[99] flex flex-col items-center select-none">
          
          {/* If it's today's actual calendar match, show a golden pulsing highlight banner */}
          {isTodayActualBirthday && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-pink-500 rounded-full border border-white dark:border-slate-800 text-white shadow-md text-[9px] font-black uppercase tracking-wider text-center flex items-center gap-1.5 animate-pulse"
            >
              <PartyPopper className="size-3 text-yellow-300" />
              <span>Wishes Active!</span>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.14 }}
            whileTap={{ scale: 0.93 }}
            onClick={handleForceTrigger}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl font-sans text-xs font-black ring-3 ring-white dark:ring-slate-900 cursor-pointer text-shadow"
            title="Interactive Celebration Hub"
          >
            <Sparkles className="size-4 animate-spin text-yellow-200" />
            <span>🎈 {isTodayActualBirthday ? "Claim Birthday Surprise!" : "Show Surprise"}</span>
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[500] overflow-hidden flex items-center justify-center p-4">
            
            {/* Blurry dark layout layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseSurprise}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl"
            />

            {/* FLOATING BALLOON CONTROLLERS (Framer Motion fully hardware-accelerated vectors) */}
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {balloons.map((b) => (
                !b.popped && (
                  <motion.div
                    key={b.id}
                    className="absolute bottom-[-150px] pointer-events-auto cursor-pointer flex flex-col items-center select-none"
                    style={{ left: `${b.x}%` }}
                    initial={{ y: 0 }}
                    animate={{ 
                      y: "-130vh",
                      x: [0, b.wiggleSeed, -b.wiggleSeed, 0],
                      rotate: [0, b.wiggleSeed / 2, -b.wiggleSeed / 2, 0]
                    }}
                    transition={{
                      y: { duration: b.speed, ease: "linear", repeat: Infinity, delay: b.delay },
                      x: { duration: 4, ease: "easeInOut", repeat: Infinity },
                      rotate: { duration: 5, ease: "easeInOut", repeat: Infinity }
                    }}
                    onClick={() => handlePopBalloon(b.id)}
                    whileHover={{ scale: 1.15 }}
                  >
                    {/* Balloon Shape */}
                    <div 
                      className={`rounded-full bg-gradient-to-tr ${b.color} shadow-2xl relative flex items-center justify-center border-t border-white/20`}
                      style={{
                        width: `${b.size}px`,
                        height: `${b.size * 1.3}px`,
                      }}
                    >
                      <Sparkles className="size-3.5 text-white/40 animate-pulse" />
                      
                      {/* String attachment base */}
                      <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-inherit rotate-45 rounded-sm" />
                    </div>
                    {/* Cord String */}
                    <div className="w-[1px] h-14 bg-gradient-to-b from-slate-450 to-transparent opacity-50" />
                  </motion.div>
                )
              ))}
            </div>

            {/* FESTIVE FALLING CONFETTI */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className={`absolute top-[-40px] ${p.color} rounded-sm shadow-sm`}
                  style={{ 
                    left: `${p.x}%`,
                    width: `${p.size}px`,
                    height: `${p.size * 1.4}px`
                  }}
                  animate={{
                    y: "115vh",
                    x: [0, Math.random() * 80 - 40, Math.random() * 80 - 40],
                    rotate: [0, 180, 540]
                  }}
                  transition={{
                    duration: p.duration,
                    ease: "linear",
                    repeat: Infinity,
                    delay: p.delay
                  }}
                />
              ))}
            </div>

            {/* SYSTEM CONFIGURATION CONTROLS (Floating header in center panel card) */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -30 }}
              transition={{ type: "spring", damping: 24, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-30 text-slate-800 dark:text-slate-100 flex flex-col max-h-[88vh]"
            >
              
              {/* BRAND HEADER BAR */}
              <div className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 p-6 text-white shrink-0 relative">
                
                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleCloseSurprise}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/15 hover:bg-black/35 text-white transition-all cursor-pointer border border-white/10"
                >
                  <X className="size-4.5" />
                </button>

                {/* Sound & Developer Toggle Actions Row */}
                <div className="absolute top-4 right-16 flex gap-2 items-center">
                  
                  {/* SOUND SWITCH */}
                  <button
                    type="button"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer border border-white/5"
                    title={audioEnabled ? "Mute celebratory SFX" : "Enable sound chimes"}
                  >
                    {audioEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                  </button>

                  {/* RESET BUTTON */}
                  <button
                    type="button"
                    onClick={handleForceTrigger}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer border border-white/5"
                    title="Reset Interactive Experience States"
                  >
                    <RotateCcw className="size-4" />
                  </button>

                </div>

                <div className="flex items-center gap-4.5">
                  <div className="p-3 bg-white/15 rounded-2xl border border-white/20 shadow-inner flex items-center justify-center">
                    <PartyPopper className="size-7.5 text-yellow-350 animate-bounce" />
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-black tracking-widest text-pink-250 block">AXOTIC LOGISTICS DEPARTMENT</span>
                    <h3 className="font-sans font-black text-xl leading-snug uppercase tracking-wide">Surprise Hub Activated</h3>
                  </div>
                </div>
              </div>

              {/* PROGRESS STEPPER HEADER */}
              <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className={activeStep === "candle" ? "text-pink-500 font-extrabold" : "opacity-60"}>1. Candle</span>
                  {hasCandleBeenBlown && <CheckCircle2 className="size-3 text-emerald-500" />}
                </div>
                <div className="w-10 h-[1.5px] bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-1.5">
                  <span className={activeStep === "gift" ? "text-purple-500 font-extrabold" : "opacity-60"}>2. Birthday Wish</span>
                  {wishCasted && <CheckCircle2 className="size-3 text-emerald-500" />}
                </div>
                <div className="w-10 h-[1.5px] bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-1.5">
                  <span className={activeStep === "badge" ? "text-indigo-500 font-extrabold" : "opacity-60"}>3. Golden Badge</span>
                  {activeStep === "badge" && <CheckCircle2 className="size-3 text-indigo-500 animate-ping" />}
                </div>
              </div>

              {/* CONTENT WINDOW BODY */}
              <div className="p-8 overflow-y-auto space-y-6 flex-1 select-none">
                
                {/* STEP 1: INTERACTIVE SPARKLE FLAME & BLOWING DETECTOR */}
                {activeStep === "candle" && (
                  <div className="text-center space-y-7 flex flex-col items-center">
                    
                    <div className="space-y-2">
                      <h4 className="font-sans font-extrabold text-sm text-slate-800 dark:text-slate-100">Make Your Birthday Real!</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        To activate the security clearance badge, you must extinguish the candle! Use your true wind breath via microphone, or click/hover the lit sparkler.
                      </p>
                    </div>

                    {/* interactive candle physics display */}
                    <div className="relative size-48 flex flex-col justify-end items-center mt-2.5">
                      
                      {/* Active candle flame */}
                      <AnimatePresence>
                        {!hasCandleBeenBlown && (
                          <motion.div
                            initial={{ scale: 0.1, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0, y: -25 }}
                            className="absolute top-3 cursor-pointer flex flex-col items-center"
                            onClick={handleBlowCandle}
                            whileHover={{ scale: 1.15 }}
                          >
                            {/* Lit flame nested halo visual effects */}
                            <div className="relative size-12 flex justify-center">
                              {/* Pulse wave glow */}
                              <div className="absolute inset-0 bg-yellow-400/25 rounded-full blur-md animate-ping" />
                              <div className="absolute inset-2 bg-orange-500/35 rounded-full blur-xs animate-pulse" />
                              
                              {/* Sharp core vector flame */}
                              <div className="w-6 h-10 bg-gradient-to-t from-red-600 via-orange-500 to-yellow-200 rounded-full transform origin-bottom animate-bounce shadow-lg flex items-center justify-center">
                                <Flame className="size-4 animate-pulse text-yellow-300" />
                              </div>
                            </div>

                            <span className="text-[8px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest mt-1.5 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full ring-1 ring-rose-200/50">
                              🌬️ Click/Blow to Put Out
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Smoke rising cloud */}
                      {hasCandleBeenBlown && (
                        <motion.div
                          initial={{ opacity: 0.9, y: -10 }}
                          animate={{ opacity: 0, y: -60, scale: 1.8 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="absolute top-4 flex flex-col items-center pointer-events-none"
                        >
                          <Wind className="size-6 text-slate-350 animate-pulse" />
                          <span className="text-[9px] font-mono font-black text-slate-400 uppercase">Wish Sent!</span>
                        </motion.div>
                      )}

                      {/* Cake visual construction */}
                      <div className="w-32 relative">
                        {/* Candle candle container */}
                        <div className="w-2.5 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 mx-auto rounded-t-sm shadow-md border-r border-indigo-600 relative overflow-hidden flex flex-col justify-between">
                          <div className="h-2 w-full bg-yellow-300" />
                          <div className="h-2 w-full bg-pink-400" />
                          <div className="h-2 w-full bg-emerald-400" />
                        </div>

                        {/* Top frosting swirl layer */}
                        <div className="w-32 h-10 bg-pink-100 dark:bg-pink-950/40 rounded-full border-b-[5px] border-pink-200 dark:border-pink-900/60 relative -mt-3.5 shadow-md flex items-center justify-around px-4">
                          {/* Cherry garnish */}
                          <div className="absolute top-1 left-[45%] size-4.5 bg-rose-600 rounded-full shadow-inner border border-rose-450 animate-pulse cursor-pointer" title="Cherry on top" />
                          
                          {/* Sprinkles decoration */}
                          <div className="size-1.5 bg-yellow-400 rounded-full mt-2" />
                          <div className="size-1.5 bg-sky-400 rounded-sm mt-3" />
                          <div className="size-1.5 bg-rose-400 rounded-full mt-1.5" />
                          <div className="size-1.5 bg-emerald-400 rounded-sm mt-4" />
                        </div>

                        {/* Golden Brown cake body container */}
                        <div className="w-28 h-12 bg-amber-700/80 dark:bg-amber-900/90 mx-auto rounded-b-2xl border-t-2 border-amber-500 relative -mt-2.5 shadow-lg">
                          <div className="absolute inset-x-4 top-2 bottom-0 border-x border-amber-950/20" />
                          <div className="absolute inset-x-12 top-2 bottom-0 border-x border-amber-950/20" />
                        </div>
                      </div>

                    </div>

                    {/* blowing trigger actions */}
                    <div className="flex flex-col gap-3 w-full max-w-sm">
                      
                      {/* MIC FLOW TOGGLE */}
                      <button
                        type="button"
                        onClick={toggleMicDetection}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border shadow-xs ${
                          micActive 
                            ? "bg-rose-500 border-rose-600 text-white animate-pulse" 
                            : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-100"
                        }`}
                      >
                        {micActive ? <Mic className="size-4 animate-bounce" /> : <MicOff className="size-4" />}
                        <span>
                          {micActive 
                            ? `Blowing mic active... Volume: ${micDbLevel}%` 
                            : "Activate Real Microphone Blow detector"}
                        </span>
                      </button>

                      {/* INSTANT CLICK BUTTON */}
                      <button
                        type="button"
                        onClick={handleBlowCandle}
                        className="py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                      >
                        <Wind className="size-4 text-pink-100" />
                        <span>Blow Out Instantly 🕯️</span>
                      </button>

                    </div>
                  </div>
                )}

                {/* STEP 2: SECRET WISH CAPTURING AND PRESENT UNWRAPPING */}
                {activeStep === "gift" && (
                  <div className="text-center space-y-7 flex flex-col items-center">
                    
                    <div className="space-y-2">
                      <h4 className="font-sans font-extrabold text-sm text-slate-800 dark:text-slate-100">Cast Your Special Birthday Intent!</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        The virtual candle has fizzled out! Before you can unwrap your custom specialist gift box, type down your birthday dream.
                      </p>
                    </div>

                    {/* State input for casting intent */}
                    {!wishCasted ? (
                      <form onSubmit={handleCastWish} className="w-full max-w-xs space-y-3.5">
                        <input
                          type="text"
                          required
                          placeholder="What is your wish for 2026?..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-center rounded-xl px-4 py-3 text-xs outline-hidden font-bold text-slate-800 dark:text-slate-100 shadow-inner"
                          value={greetingWish}
                          onChange={(e) => setGreetingWish(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          Lock in My Birthday Wish 🌌
                        </button>
                      </form>
                    ) : (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-4 bg-purple-50 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-850 rounded-2xl max-w-sm"
                      >
                        <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest block mb-1">Your wish is cast to the stockroom heavens:</span>
                        <p className="text-sm font-serif italic text-slate-700 dark:text-purple-200">
                          "{greetingWish}"
                        </p>
                      </motion.div>
                    )}

                    {/* SHAKING 3D PRESENT BOX GRAPHICS */}
                    <div className="relative size-40 flex items-center justify-center">
                      <motion.div
                        className="cursor-pointer"
                        animate={{
                          rotate: wishCasted ? [0, -3, 3, -3, 3, 0] : [0, -1, 1, 0],
                          scale: wishCasted ? [1, 1.05, 1] : 1
                        }}
                        transition={{
                          rotate: { repeat: Infinity, duration: wishCasted ? 0.35 : 2.5 },
                          scale: { repeat: Infinity, duration: 1.5 }
                        }}
                        onClick={() => {
                          setIsGiftOpened(true);
                          setActiveStep("badge");
                        }}
                        whileHover={{ scale: 1.15 }}
                      >
                        {/* Beautiful package presentation box with cross ribbons */}
                        <div className="relative size-28 bg-gradient-to-br from-purple-500 via-indigo-600 to-indigo-700 rounded-3xl shadow-2xl flex items-center justify-center border border-indigo-400">
                          
                          {/* golden vertical cross ribbon */}
                          <div className="absolute inset-y-0 left-[43%] w-4 bg-amber-400" />
                          <div className="absolute inset-x-0 top-[43%] h-4 bg-amber-400" />
                          
                          {/* Fluffy detailed ribbon wrap */}
                          <div className="absolute top-[-14px] left-8 size-8 bg-amber-300 rounded-full border-b-2 border-amber-500 rotate-15 shadow-inner" />
                          <div className="absolute top-[-14px] right-8 size-8 bg-amber-300 rounded-full border-b-2 border-amber-500 -rotate-15 shadow-inner" />
                          
                          {/* Gift container center sparkle */}
                          <Gift className="size-9 text-white z-10 animate-bounce" />
                        </div>
                      </motion.div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsGiftOpened(true);
                        setActiveStep("badge");
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Unwrap My Presentation Package 🎁
                    </button>

                  </div>
                )}

                {/* STEP 3: EXTREMELY HIGH FIDELITY GOLD CREDENTIAL BADGE REVEAL */}
                {activeStep === "badge" && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6 flex flex-col items-center"
                  >
                    
                    {/* SPECIFIC CERTIFICATE DOCK CARD WITH GLOW OUTLINE */}
                    <div className="relative p-7 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-250 to-amber-500 border-2 border-amber-300 shadow-2xl overflow-hidden hover:rotate-1 transition-transform max-w-sm w-full animate-in zoom-in-95 duration-300 select-none cursor-pointer">
                      
                      {/* Geometric grid mesh aesthetics */}
                      <div className="absolute inset-1.5 border border-white/50 rounded-2xl pointer-events-none" />
                      <div className="absolute inset-2 border border-dashed border-white/20 rounded-2xl pointer-events-none" />
                      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                      <div className="flex flex-col items-center space-y-4 relative z-10">
                        
                        {/* Gold crest with shimmer */}
                        <div className="size-16 rounded-2xl bg-white shadow-xl flex items-center justify-center border-2 border-amber-200">
                          <Award className="size-10 text-amber-500 animate-spin" style={{ animationDuration: "14s" }} />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-black tracking-widest text-amber-900/60 uppercase block">TEAM AXOTIC HUBSYSTEMS</span>
                          <h4 className="font-sans font-black text-slate-900 text-md uppercase tracking-wider">GOLD CREDENTIAL SPECIALIST</h4>
                        </div>

                        {/* Dashed divider */}
                        <div className="w-full border-t border-dashed border-amber-900/15" />

                        {/* Interactive user segment mock */}
                        <div className="space-y-2 w-full">
                          {/* avatar block with shiny trim */}
                          <div className="size-14 rounded-full overflow-hidden border-2 border-white bg-slate-200 mx-auto shadow-md">
                            <img 
                              src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120"} 
                              alt={currentUser.displayName} 
                              referrerPolicy="no-referrer"
                              className="size-full object-cover"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <span className="block text-sm font-black text-slate-900 leading-none uppercase">{currentUser.displayName}</span>
                            <span className="inline-block text-[8px] font-mono font-black text-amber-900 uppercase px-2.5 py-0.5 rounded-full bg-white/40 tracking-widest">
                              Clearance: {currentUser.role || "Specialist"} Level Verified
                            </span>
                          </div>
                        </div>

                        <p className="text-[9.5px] text-amber-950/80 font-semibold px-2.5 leading-normal">
                          Granted with honor on your special milestone: {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}. Welcome to full systems access!
                        </p>
                      </div>

                    </div>

                    {/* Celebration logs */}
                    <div className="space-y-5 w-full max-w-sm">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/20 text-slate-700 dark:text-amber-300 text-xs rounded-xl leading-relaxed text-left flex gap-3 items-start">
                        <Sparkles className="size-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Golden Badge Unlocked!</strong> This permanent decoration is now bound to your account cache, authorizing infinite workspace respect!
                        </div>
                      </div>

                      <div className="flex gap-3 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setHasCandleBeenBlown(false);
                            setActiveStep("candle");
                          }}
                          className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Restart Steps
                        </button>
                        <button
                          type="button"
                          onClick={handleClaimBadgeAndClose}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-950 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                        >
                          Claim Badge & Close 🎉
                        </button>
                      </div>
                    </div>

                  </motion.div>
                )}

              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>
    </>
  );
}
