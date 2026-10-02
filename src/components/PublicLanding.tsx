import React, { useState, useEffect } from "react";
import { 
  Lock, 
  ArrowRight, 
  ExternalLink, 
  Mail, 
  Copy, 
  Check, 
  Instagram,
  Link, 
  Linkedin, 
  Youtube, 
  Sparkles, 
  Cpu,
  CircuitBoard,
  Zap, 
  Layers, 
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
  Trophy,
  Award,
  Medal,
  Star,
  ZoomIn,
  Database
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
const defaultLogoUrl = "/logo.png";
import { useWorkspaceSettings } from "../useWorkspaceSettings";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { defaultPublicLandingData, PublicLandingData, Achievement } from "./defaultPublicLandingData";
import { UserProfile } from "../types";

interface PublicLandingProps {
  onOpenLogin: () => void;
  currentUser?: UserProfile | null;
  onSwitchToDatabase?: () => void;
}

// Framer motion animation variants
const slowFadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};


export function parseBuildImages(rawUrl: string | undefined): string[] {
  if (!rawUrl) return [];
  if (rawUrl.includes("|||")) {
    return rawUrl.split("|||").map(s => s.trim()).filter(Boolean);
  }
  if (rawUrl.includes("data:image/")) {
    const parts = rawUrl.split(',').map(s => s.trim()).filter(Boolean);
    const result: string[] = [];
    let currentDataUrl = "";
    for (const part of parts) {
      if (part.startsWith("data:image/")) {
        if (currentDataUrl) result.push(currentDataUrl);
        currentDataUrl = part;
      } else if (currentDataUrl) {
        currentDataUrl += "," + part;
        result.push(currentDataUrl);
        currentDataUrl = "";
      } else if (part.startsWith("http://") || part.startsWith("https://")) {
        result.push(part);
      }
    }
    if (currentDataUrl) result.push(currentDataUrl);
    return result.length > 0 ? result : [rawUrl];
  }
  return rawUrl.split(',').map(s => s.trim()).filter(Boolean);
}

const BuildCard = ({ spec, idx, onOpenLightbox, slowFadeIn }: any) => {
  const images = parseBuildImages(spec.imageUrl);
  const displayImages = images.length > 0 ? images : [`https://images.unsplash.com/photo-${idx % 2 === 0 ? '1581091226825-a6a2a5aee158' : '1485827404703-89b55fcc595e'}?auto=format&fit=crop&q=80&w=1000`];
  
  const [currentIdx, setCurrentIdx] = React.useState(0);

  return (
    <motion.div 
      key={`${spec.id || 'build'}-${idx}`}
      id={`build-card-${idx}`}
      variants={slowFadeIn}
      className="rounded-3xl overflow-hidden shadow-xs group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-lg flex flex-col transition-all duration-300"
      whileHover={{ y: -4 }}
    >
      <div className="relative aspect-video sm:aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img 
            key={currentIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            src={displayImages[currentIdx]} 
            alt={spec.title} 
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
            referrerPolicy="no-referrer"
            onClick={() => onOpenLightbox(idx, currentIdx)}
          />
        </AnimatePresence>
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3 md:top-4 md:left-4 pointer-events-none">
          <span className="text-[9px] font-bold font-mono tracking-wider bg-blue-600 text-white px-2.5 py-1 rounded-md uppercase shadow-sm">
            {spec.category}
          </span>
        </div>

        {/* Multi-Image Counter Badge */}
        {displayImages.length > 1 && (
          <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
            <span className="text-[9px] font-mono font-bold tracking-wider bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1 shadow-sm">
              <span>{currentIdx + 1}</span>
              <span className="text-white/50">/</span>
              <span>{displayImages.length}</span>
            </span>
          </div>
        )}

        {/* Swap Controls for multiple images */}
        {displayImages.length > 1 && (
          <>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx(prev => prev === 0 ? displayImages.length - 1 : prev - 1);
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer shadow-md hover:scale-110 active:scale-95"
              title="Previous photo"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx(prev => (prev + 1) % displayImages.length);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer shadow-md hover:scale-110 active:scale-95"
              title="Next photo"
            >
              <ChevronRight className="size-4" />
            </button>
            
            {/* Clickable Image Swap Dots */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 z-10">
              {displayImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIdx(i);
                  }}
                  className={`transition-all rounded-full cursor-pointer ${
                    i === currentIdx 
                      ? 'w-5 h-1.5 bg-blue-500 shadow-sm' 
                      : 'w-1.5 h-1.5 bg-white/60 hover:bg-white dark:bg-white/40 dark:hover:bg-white/80'
                  }`}
                  title={`View photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-5 md:p-6 flex-1 flex flex-col justify-between cursor-pointer" onClick={() => onOpenLightbox(idx, currentIdx)}>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 leading-snug tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
              {spec.title}
            </h3>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
            {spec.subtitle}
          </p>
        </div>
      </div>
    </motion.div>
  );
};


const BuildLightbox = React.forwardRef(({ spec, initialIdx, idx, onClose }: any, ref: any) => {
  const images = spec.imageUrl ? spec.imageUrl.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
  const displayImages = images.length > 0 ? images : [`https://images.unsplash.com/photo-${idx % 2 === 0 ? '1581091226825-a6a2a5aee158' : '1485827404703-89b55fcc595e'}?auto=format&fit=crop&q=80&w=1600`];
  
  const [currentIdx, setCurrentIdx] = React.useState(initialIdx || 0);

  // Keyboard navigation for image swapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIdx(prev => prev === 0 ? displayImages.length - 1 : prev - 1);
      } else if (e.key === 'ArrowRight') {
        setCurrentIdx(prev => (prev + 1) % displayImages.length);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayImages.length, onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        className="relative max-w-5xl w-full flex flex-col items-center justify-center group"
        onClick={(e: any) => e.stopPropagation()}
      >
        <button 
          className="absolute top-2 right-2 sm:-top-12 sm:right-0 text-white hover:text-red-400 p-2 border border-white/10 bg-black/50 rounded-full backdrop-blur-sm transition-colors z-50 cursor-pointer" 
          onClick={onClose}
        >
          <X className="size-5" />
        </button>

        <div className="relative w-full flex items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={currentIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              src={displayImages[currentIdx]}
              alt={spec.title}
              className="w-auto h-auto max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          
          {displayImages.length > 1 && (
            <>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIdx((prev: number) => prev === 0 ? displayImages.length - 1 : prev - 1);
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all z-10 cursor-pointer shadow-lg hover:scale-110 active:scale-95"
                title="Previous image"
              >
                <ChevronLeft className="size-5 sm:size-6" />
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIdx((prev: number) => (prev + 1) % displayImages.length);
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all z-10 cursor-pointer shadow-lg hover:scale-110 active:scale-95"
                title="Next image"
              >
                <ChevronRight className="size-5 sm:size-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Navigation Bar for Lightbox */}
        {displayImages.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 overflow-x-auto max-w-full p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10">
            {displayImages.map((img: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  i === currentIdx ? 'border-blue-500 scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img 
                  src={img} 
                  alt={`Thumb ${i + 1}`} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 w-full bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 text-left border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-bold font-mono tracking-wider text-blue-400 uppercase">{spec.category}</span>
              <p className="text-white text-lg sm:text-xl font-extrabold tracking-tight">
                {spec.title}
              </p>
            </div>
            {displayImages.length > 1 && (
              <span className="text-xs font-mono font-bold text-slate-400 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 shrink-0">
                Photo {currentIdx + 1} of {displayImages.length}
              </span>
            )}
          </div>
          <p className="text-white/80 text-xs sm:text-sm mt-2 leading-relaxed">
            {spec.subtitle}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

const AchievementLightbox = ({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) => {
  const awardLower = (achievement.award || "").toLowerCase();
  const isGold = achievement.badgeType === "gold" || awardLower.includes("1st") || awardLower.includes("gold") || awardLower.includes("champion");
  const isSilver = achievement.badgeType === "silver" || awardLower.includes("2nd") || awardLower.includes("silver") || awardLower.includes("runner");
  const isBronze = achievement.badgeType === "bronze" || awardLower.includes("3rd") || awardLower.includes("bronze");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-w-2xl w-full bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col group"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-3.5 right-3.5 text-white/80 hover:text-white p-2 border border-white/10 bg-black/60 rounded-full backdrop-blur-sm transition-colors z-50 cursor-pointer" 
          onClick={onClose}
        >
          <X className="size-5" />
        </button>

        {achievement.imageUrl && (
          <div className="relative w-full max-h-[55vh] bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
            <img 
              src={achievement.imageUrl} 
              alt={achievement.title} 
              className="w-full h-auto max-h-[55vh] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="p-6 sm:p-7 space-y-3 bg-slate-900 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
              isGold 
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" 
                : isSilver 
                ? "bg-slate-400/20 text-slate-200 border border-slate-400/40" 
                : isBronze 
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/40" 
                : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
            }`}>
              <Trophy className="size-3.5" /> {achievement.award}
            </span>
            {achievement.yearOrDate && (
              <span className="text-xs font-mono font-bold text-slate-300 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                {achievement.yearOrDate}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {achievement.title}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-blue-400 uppercase font-mono tracking-wider mt-0.5">
              {achievement.eventOrCompetition}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light pt-1">
            {achievement.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function PublicLanding({ onOpenLogin, currentUser, onSwitchToDatabase }: PublicLandingProps) {
  const [copied, setCopied] = useState(false);
  const [activeBuild, setActiveBuild] = useState<string | null>(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<{idx: number, imgIdx: number} | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [activeSection, setActiveSection] = useState<string>("intro-section");
  const [landingData, setLandingData] = useState<PublicLandingData>(() => {
    try {
      const local = localStorage.getItem("axotic_public_landing_config");
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === "object") {
          return {
            ...defaultPublicLandingData,
            ...parsed
          };
        }
      }
    } catch (_) {}
    return defaultPublicLandingData;
  });
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { logoUrl: remoteLogoUrl } = useWorkspaceSettings();
  const activeLogoUrl = remoteLogoUrl || defaultLogoUrl;

  useEffect(() => {
    if (landingData.galleryPhotos && landingData.galleryPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex(prev => (prev + 1) % landingData.galleryPhotos!.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [landingData.galleryPhotos]);

  const [isSyncingData, setIsSyncingData] = useState(true);

  useEffect(() => {
    // 1. Try to fetch custom settings from localStorage if cached in sandbox mode
    const local = localStorage.getItem("axotic_public_landing_config");
    if (local) {
      try {
        setLandingData({
          ...defaultPublicLandingData,
          ...JSON.parse(local)
        });
      } catch (_) {}
    }

    const timer = setTimeout(() => {
      setIsSyncingData(false);
    }, 450);

    // Tab-level communication for instant preview update
    const handleStorageChange = () => {
      const updated = localStorage.getItem("axotic_public_landing_config");
      if (updated) {
        try {
          setLandingData({
            ...defaultPublicLandingData,
            ...JSON.parse(updated)
          });
        } catch (_) {}
      }
      setIsSyncingData(false);
    };
    window.addEventListener("axotic_db_update", handleStorageChange);

    // 2. Stream real-time configurations securely from live database snapshot
    const unsub = onSnapshot(doc(db, "landing", "public"), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Partial<PublicLandingData>;
        setLandingData({
          ...defaultPublicLandingData,
          ...d,
          subTeams: d.subTeams || defaultPublicLandingData.subTeams,
          buildSpecs: d.buildSpecs || defaultPublicLandingData.buildSpecs,
          trackRecords: d.trackRecords || defaultPublicLandingData.trackRecords,
          achievements: d.achievements || defaultPublicLandingData.achievements,
          galleryPhotos: d.galleryPhotos || defaultPublicLandingData.galleryPhotos,
          showAchievements: d.showAchievements !== undefined ? d.showAchievements : true,
        } as PublicLandingData);
      }
      setIsSyncingData(false);
    }, (err) => {
      console.warn("Could not load public page configurations from Firestore securely.", err.message);
      setIsSyncingData(false);
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("axotic_db_update", handleStorageChange);
      unsub();
    };
  }, []);

  // Smooth throttled scroll spy with RAF to avoid render churn on scroll
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const sectionIds = [
      'intro-section',
      'about-section',
      'builds-section',
      'achievements-section',
      'sponsors-section',
      'contact-section'
    ];

    let rafId: number | null = null;
    let currentActive = 'intro-section';

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rawScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        setIsScrolled(rawScroll > 25);

        let matched = 'intro-section';
        for (let i = sectionIds.length - 1; i >= 0; i--) {
          const el = document.getElementById(sectionIds[i]);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 260) {
              matched = sectionIds[i];
              break;
            }
          }
        }

        if (matched !== currentActive) {
          currentActive = matched;
          setActiveSection(matched);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [landingData]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(landingData.contactEmail || "contact@teamaxotic.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { scrollYProgress } = useScroll();

  return (
    <div 
       id="public-landing-container" 
       className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-[#0f2e46] dark:text-slate-100 flex flex-col items-center pt-20 sm:pt-24 md:pt-28 px-3 sm:px-8 md:px-12 pb-12 relative font-sans antialiased selection:bg-blue-500 selection:text-white"
    >
      {/* Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500 z-[100] origin-left shadow-xs"
        style={{ scaleX: scrollYProgress }}
      />
      
      {/* High-Tech Robotics Engineering & Circuitry Background System */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none transform-gpu">
        {/* Deep Cybernetic Ambient Glow Spots */}
        <div className="absolute -top-[12%] -left-[8%] w-[55vw] h-[55vw] max-w-[720px] max-h-[720px] rounded-full bg-gradient-to-br from-blue-600/20 via-cyan-500/12 to-transparent blur-[110px] dark:from-blue-600/25 dark:via-cyan-400/18" />
        <div className="absolute top-[32%] -right-[12%] w-[50vw] h-[50vw] max-w-[680px] max-h-[680px] rounded-full bg-gradient-to-bl from-indigo-600/18 via-blue-500/12 to-transparent blur-[120px] dark:from-indigo-600/22 dark:via-blue-500/15" />
        <div className="absolute top-[68%] -left-[10%] w-[48vw] h-[48vw] max-w-[620px] max-h-[620px] rounded-full bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-transparent blur-[110px] dark:from-cyan-500/18 dark:via-blue-600/12" />
        <div className="absolute -bottom-[8%] right-[15%] w-[42vw] h-[42vw] max-w-[550px] max-h-[550px] rounded-full bg-gradient-to-tl from-amber-500/10 via-emerald-500/10 to-transparent blur-[100px] dark:from-amber-500/12 dark:via-emerald-500/10" />

        {/* High-Tech Robotics & Engineering SVG Pattern System */}
        <svg className="absolute inset-0 size-full opacity-45 dark:opacity-65 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* 1. Hexagonal Carbon Armor Honeycomb Mesh */}
            <pattern id="roboticHexPattern" width="40" height="69.282" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 20 11.547 L 0 0 L 0 23.094 L 20 34.641 L 40 23.094 Z M 0 34.641 L 20 46.188 L 0 57.735 L 0 80.829 L 20 92.376 L 40 80.829 L 40 57.735 L 20 46.188 Z" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-blue-500/18 dark:text-cyan-400/22" />
              <circle cx="20" cy="11.547" r="1.5" className="fill-blue-500/35 dark:fill-cyan-400/40" />
              <circle cx="20" cy="46.188" r="1.5" className="fill-blue-500/35 dark:fill-cyan-400/40" />
            </pattern>

            {/* 2. PCB Circuit Board Traces & Microchip Nodes */}
            <pattern id="pcbCircuitPattern" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 0 30 L 40 30 L 60 50 L 120 50 M 30 0 L 30 20 L 50 40 L 50 120 M 80 120 L 80 90 L 100 70 L 120 70 M 0 90 L 20 90 L 40 110 L 40 120" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-600/22 dark:text-cyan-400/28" />
              <circle cx="40" cy="30" r="2.2" className="fill-blue-500/45 dark:fill-cyan-300/55" />
              <circle cx="60" cy="50" r="1.8" className="fill-blue-500/45 dark:fill-cyan-300/55" />
              <circle cx="50" cy="40" r="2.2" className="fill-cyan-500/45 dark:fill-cyan-300/55" />
              <circle cx="100" cy="70" r="2.2" className="fill-blue-500/45 dark:fill-cyan-300/55" />
              <circle cx="20" cy="90" r="2.2" className="fill-cyan-500/45 dark:fill-cyan-300/55" />
            </pattern>

            {/* 3. CAD Precision Crosshair Grid */}
            <pattern id="cadGridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.7" className="text-blue-500/12 dark:text-sky-400/18" />
              <path d="M 30 25 L 30 35 M 25 30 L 35 30" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-blue-600/28 dark:text-cyan-400/35" />
              <circle cx="30" cy="30" r="1.2" className="fill-blue-500/30 dark:fill-cyan-400/35" />
            </pattern>

            <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Pattern Fill Layers */}
          <rect width="100%" height="100%" fill="url(#cadGridPattern)" />
          <rect width="100%" height="100%" fill="url(#roboticHexPattern)" />
          <rect width="100%" height="100%" fill="url(#pcbCircuitPattern)" />

          {/* Left Upper Robotics Circuit Bus */}
          <path d="M 0 120 L 140 120 L 220 200 L 220 380 L 160 440 L 0 440" fill="none" stroke="url(#circuitGrad)" strokeWidth="1.5" strokeDasharray="6 4" />
          <circle cx="140" cy="120" r="3.5" fill="#38bdf8" />
          <circle cx="220" cy="200" r="4.5" fill="#38bdf8" className="animate-pulse" />
          <circle cx="220" cy="380" r="3.5" fill="#38bdf8" />
          <circle cx="160" cy="440" r="3" fill="#38bdf8" />

          {/* Right Upper High-Speed Autonomous Optical Encoder Bus */}
          <path d="M 100% 180 L calc(100% - 160px) 180 L calc(100% - 240px) 260 L calc(100% - 240px) 460 L calc(100% - 120px) 580 L 100% 580" fill="none" stroke="url(#circuitGrad)" strokeWidth="1.5" />
          <circle cx="calc(100% - 160px)" cy="180" r="3.5" fill="#38bdf8" />
          <circle cx="calc(100% - 240px)" cy="260" r="4" fill="#06b6d4" className="animate-ping" style={{ animationDuration: '4s' }} />
          <circle cx="calc(100% - 240px)" cy="460" r="3.5" fill="#38bdf8" />

          {/* Lower Combat Weapon & Drivetrain Power Bus */}
          <path d="M 0 calc(100% - 320px) L 180 calc(100% - 320px) L 260 calc(100% - 240px) L 380 calc(100% - 240px)" fill="none" stroke="url(#amberGrad)" strokeWidth="1.5" strokeDasharray="8 6" />
          <circle cx="180" cy="calc(100% - 320px)" r="3.5" fill="#f59e0b" />
          <circle cx="260" cy="calc(100% - 240px)" r="4" fill="#f59e0b" className="animate-pulse" />
          <circle cx="380" cy="calc(100% - 240px)" r="3" fill="#f59e0b" />

          {/* Lower Right Autonomous Navigation Line Track */}
          <path d="M 100% calc(100% - 200px) L calc(100% - 200px) calc(100% - 200px) L calc(100% - 300px) calc(100% - 100px) L calc(100% - 420px) calc(100% - 100px)" fill="none" stroke="url(#circuitGrad)" strokeWidth="1.5" />
          <circle cx="calc(100% - 200px)" cy="calc(100% - 200px)" r="3.5" fill="#38bdf8" />
          <circle cx="calc(100% - 300px)" cy="calc(100% - 100px)" r="4" fill="#38bdf8" />
        </svg>

        {/* 5. CAD Precision Crosshairs & Coordinate Labels */}
        <div className="absolute top-24 left-8 hidden lg:flex flex-col gap-1 text-[9px] font-mono font-bold text-slate-400 dark:text-cyan-400/60 opacity-60">
          <div className="flex items-center gap-1.5"><span className="text-blue-500 font-extrabold">+</span> <span>GRID_LOC // 001.42_LAT</span></div>
          <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">CHASSIS_CAD_LAYER_01</div>
        </div>

        <div className="absolute top-24 right-8 hidden lg:flex flex-col items-end gap-1 text-[9px] font-mono font-bold text-slate-400 dark:text-cyan-400/60 opacity-60">
          <div className="flex items-center gap-1.5"><span>AUTONOMOUS_SYS // READY</span> <span className="text-emerald-500 font-extrabold">+</span></div>
          <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">PID_LOOP_FREQ // 1.2kHz</div>
        </div>

        <div className="absolute bottom-20 left-8 hidden lg:flex flex-col gap-1 text-[9px] font-mono font-bold text-slate-400 dark:text-amber-400/60 opacity-60">
          <div className="flex items-center gap-1.5"><span className="text-amber-500 font-extrabold">+</span> <span>COMBAT_DRIVE // 6S_LIPO</span></div>
          <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">HARDOX_500_ARMOR_ACTIVE</div>
        </div>

        <div className="absolute bottom-20 right-8 hidden lg:flex flex-col items-end gap-1 text-[9px] font-mono font-bold text-slate-400 dark:text-cyan-400/60 opacity-60">
          <div className="flex items-center gap-1.5"><span>AXOTIC_SYS_VER // 2.6.0</span> <span className="text-blue-500 font-extrabold">+</span></div>
          <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">MICROMOUSE_SOLVER_CORE</div>
        </div>

        {/* 6. Subtle Radial Vignette for Center Text Clarity */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_50%_25%,transparent_35%,#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_85%_65%_at_50%_25%,transparent_25%,#070b14_100%)]" />
      </div>
      


      {/* Main Header / Fixed Top Navigation Bar */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 w-full z-50 py-2.5 sm:py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs flex justify-center items-center"
      >
        <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="w-full sm:w-auto flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <img 
                src={activeLogoUrl || undefined} 
                alt="AXOTIC Logo" 
                className="h-9 sm:h-11 md:h-13 w-auto max-w-[45vw] sm:max-w-[220px] md:max-w-[280px] object-contain drop-shadow-xs transition-all" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Mobile Member Login Button */}
            <div className="sm:hidden">
              <button
                onClick={currentUser && onSwitchToDatabase ? onSwitchToDatabase : onOpenLogin}
                className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-[10px] font-bold font-mono tracking-wider flex items-center gap-1.5 shadow-xs uppercase cursor-pointer"
              >
                <Lock className="size-3" /> LOGIN
              </button>
            </div>
          </div>

          {/* Dynamic Animated Tab Navigation - Highlights as you scroll */}
          <nav className="flex items-center gap-1 sm:gap-2 lg:gap-3 overflow-x-auto max-w-full py-1 px-1 scrollbar-none">
            {['Intro', 'About Us', 'Our Builds', 'Achievements', 'Sponsors', 'Contact'].map((item) => {
              const isVisible = 
                (item === 'Intro' && landingData.showIntro !== false) ||
                (item === 'About Us' && landingData.showAboutUs !== false) ||
                (item === 'Our Builds' && landingData.showBuilds !== false) ||
                (item === 'Achievements' && landingData.showAchievements !== false && landingData.achievements && landingData.achievements.length > 0) ||
                (item === 'Sponsors' && landingData.showSponsors !== false) ||
                (item === 'Contact' && landingData.showContactUs !== false);
              
              if (!isVisible) return null;

              const id = 
                item === 'Contact' ? 'contact-section' : 
                item === 'Sponsors' ? 'sponsors-section' : 
                item === 'Achievements' ? 'achievements-section' :
                item === 'Our Builds' ? 'builds-section' : 
                item === 'About Us' ? 'about-section' : 'intro-section';

              const isActive = activeSection === id;

              return (
                <button
                  key={item}
                  onClick={() => {
                    const element = document.getElementById(id);
                    if (element) {
                      const yOffset = -90;
                      const y = element.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0) + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                      setActiveSection(id);
                    }
                  }}
                  className={`relative shrink-0 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold tracking-wider uppercase font-mono rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-950/60 shadow-xs border border-blue-500/30' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-blue-500/15 dark:bg-blue-900/40 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {item}
                </button>
              );
            })}
          </nav>

          {/* Secure member login gateway button (Desktop) */}
          <motion.button
            id="top-nav-portal-btn"
            onClick={currentUser && onSwitchToDatabase ? onSwitchToDatabase : onOpenLogin}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden sm:flex relative group overflow-hidden rounded-xl px-3.5 sm:px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] sm:text-xs font-bold tracking-widest font-mono cursor-pointer shadow-md transition-all hover:shadow-xl hover:shadow-blue-500/20 shrink-0 border border-slate-700/50 dark:border-slate-200/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
              <Lock className="size-3.5" /> 
              <span>{currentUser ? "MEMBER PORTAL" : "SECURE GATEWAY"}</span>
            </span>
          </motion.button>
        </div>
      </motion.header>

      {/* Main Public Page Content Container */}
      <main className="w-full max-w-4xl flex-1 z-10 flex flex-col items-stretch space-y-32 md:space-y-40 pt-10 pb-24">
        {/* SECTION 1: INTRO */}
        {landingData.showIntro !== false && (
          <motion.section 
            id="intro-section"
            initial="hidden"
            animate="visible"
            variants={slowFadeIn}
            className="flex flex-col items-center text-center justify-center py-8 px-4 scroll-mt-32"
          >
            <div className="inline-flex items-center gap-2 px-3.5 tracking-[0.2em] py-1.5 bg-blue-50/90 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full font-mono text-[10px] font-bold uppercase mb-8 border border-blue-200/60 dark:border-blue-700/50 shadow-2xs">
              <Sparkles className="size-3.5 text-blue-500 animate-pulse" /> Welcome to Team AXOTIC
            </div>

            {/* Official AXOTIC Title Logo Emblem */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative mb-6 group flex items-center justify-center"
            >
              <div className="absolute -inset-6 bg-gradient-to-r from-blue-600/25 via-cyan-500/20 to-indigo-600/25 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <img 
                src={activeLogoUrl || undefined} 
                alt="AXOTIC Title Logo" 
                className="relative h-24 sm:h-36 md:h-44 w-auto max-w-[85vw] object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300 select-none"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </motion.div>
            
            <h1 
              className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#0f2e46] to-slate-600 dark:from-white dark:to-slate-300 tracking-tighter leading-[1.1] max-w-4xl mb-6 drop-shadow-xs"
              dangerouslySetInnerHTML={{ __html: (landingData.heroTitle || "").replace("AXOTIC", `<span class="text-blue-600 dark:text-blue-500">AXOTIC</span>`) }}
            />
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-light max-w-2xl leading-relaxed mb-8">
              {landingData.heroSubtitle}
            </p>

            {landingData.showAboutUs !== false && (
              <div className="flex gap-4 mt-4">
                <a 
                  href="#about-section"
                  className="group relative inline-flex items-center justify-center px-8 py-3 text-sm font-bold tracking-widest uppercase text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-full overflow-hidden shadow-lg transition-all hover:scale-105 hover:shadow-blue-500/30"
                >
                  <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
                  <span className="relative flex items-center gap-2">
                    Discover More <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
              </div>
            )}
          </motion.section>
        )}
        {/* SECTION 2: ABOUT US */}
        {landingData.showAboutUs !== false && (
          <motion.section 
            id="about-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={slowFadeIn}
            className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-[2.5rem] p-8 sm:p-14 shadow-lg relative overflow-hidden scroll-mt-32"
          >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
            <div className="md:col-span-4 space-y-3">
              <span className="text-[10px] font-bold tracking-widest text-blue-500 font-mono uppercase block">SECTION 02</span>
              <h2 className="text-3xl sm:text-5xl font-black text-[#0f2e46] dark:text-white tracking-tighter uppercase mb-2">
                {landingData.whoWeAreOriginTitle}
              </h2>
              <div className="w-12 h-1 bg-blue-600 rounded mt-4" />
            </div>

            <div className="md:col-span-8 space-y-8">
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {landingData.whoWeAreOriginDesc}
              </p>

              {/* Multidisciplinary Spec Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-start text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Cpu className="size-24 text-blue-400" />
                  </div>
                  <div className="size-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 border border-blue-500/30">
                    <Cpu className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">CORE 01</span>
                  <span className="text-xl font-bold text-white tracking-tight">Electrical &<br/>Electronic</span>
                  <div className="w-full h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-blue-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                  </div>
                </div>

                <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-start text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Layers className="size-24 text-emerald-400" />
                  </div>
                  <div className="size-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 border border-emerald-500/30">
                    <Layers className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">CORE 02</span>
                  <span className="text-xl font-bold text-white tracking-tight">Mechanical</span>
                  <div className="w-full h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-emerald-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                  </div>
                </div>

                <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-start text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="size-24 text-indigo-400" />
                  </div>
                  <div className="size-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 border border-indigo-500/30">
                    <Activity className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">CORE 03</span>
                  <span className="text-xl font-bold text-white tracking-tight">Biomedical</span>
                  <div className="w-full h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-indigo-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                  </div>
                </div>
              </div>
              {/* Division subteams dynamic integration */}
              {landingData.subTeams && landingData.subTeams.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  <h4 className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase block text-left">
                    Division Sub-Teams Directory
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {landingData.subTeams.map((team, idx) => (
                      <div key={`${team.id}-${idx}`} className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl transition-all">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                          🛡️ {team.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-normal">
                          {team.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
          </motion.section>
        )}

        {/* SECTION 3: OUR BUILDS */}
        {landingData.showBuilds !== false && (
          <motion.section 
            id="builds-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slowFadeIn}
            className="space-y-8 text-left scroll-mt-32"
          >
          <div className="space-y-2">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[10px] font-bold tracking-widest text-blue-500 font-mono uppercase block">SECTION 03</span>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0f2e46] dark:text-white tracking-tighter uppercase mb-6">
              Our Builds
            </h2>
            
            
          </div>

          {/* Grid of Images / Interactive Build Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {isSyncingData ? (
              [1, 2].map(i => (
                <div key={`build-skel-${i}`} className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 space-y-4 animate-pulse shadow-xs">
                  <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md w-full" />
                    <div className="h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md w-3/4" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                  </div>
                </div>
              ))
            ) : landingData.buildSpecs && landingData.buildSpecs.length > 0 ? (
              landingData.buildSpecs.map((spec, idx) => (
                <BuildCard 
                  key={`${spec.id || 'build'}-${idx}`} 
                  spec={spec} 
                  idx={idx} 
                  slowFadeIn={slowFadeIn} 
                  onOpenLightbox={(i: number, imgI: number) => setLightboxImageIndex({idx: i, imgIdx: imgI})} 
                />
              ))
            ) : (
               <div className="col-span-1 md:col-span-2 text-center text-slate-500 dark:text-slate-400 py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                 No active build profiles synchronized.
               </div>
            )}

          </div>
        </motion.section>
        )}

        {/* SECTION 3.5: MISSION STATEMENT & TRACK RECORDS */}
        {landingData.trackRecords && landingData.trackRecords.length > 0 && (
          <motion.section 
            id="records-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slowFadeIn}
            className="space-y-6 text-left scroll-mt-32"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-[10px] font-bold tracking-widest text-blue-500 font-mono uppercase block">SECTION 03.5</span>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#0f2e46] dark:text-white tracking-tighter uppercase mb-6">
                Milestones & Trajectory
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {landingData.trackRecords.map((tr, idx) => (
                <div key={`${tr.id}-${idx}`} className="bg-gradient-to-br from-white dark:from-slate-900 to-slate-50/50 dark:to-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-sm">
                      {tr.statusTag ? tr.statusTag.toUpperCase() : "TARGET"}
                    </span>
                    <h4 className="text-xs font-black text-[#0f2e46] dark:text-white uppercase tracking-wide pt-1">{tr.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">{tr.description}</p>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium font-mono border-t border-slate-100/80 dark:border-slate-800/80 pt-2.5 mt-4">
                    🎯 {tr.badge}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* SECTION 3.6: GALLERY PHOTOS (IF PRESENT) */}
        {landingData.galleryPhotos && landingData.galleryPhotos.length > 0 && (
          <motion.section 
            id="team-photos-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slowFadeIn}
            className="space-y-6 text-left scroll-mt-32"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-[10px] font-bold tracking-widest text-blue-500 font-mono uppercase block">SECTION 03.6</span>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#0f2e46] dark:text-white tracking-tighter uppercase mb-6">
                Team Photos
              </h2>
            </div>
            <div className="relative aspect-video sm:aspect-[21/9] w-full rounded-3xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 group">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={currentPhotoIndex}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="absolute inset-0 size-full"
                >
                  <img
                    src={landingData.galleryPhotos[currentPhotoIndex]?.url || undefined}
                    alt={landingData.galleryPhotos[currentPhotoIndex]?.caption}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                    <p className="text-xs sm:text-sm text-white/90 font-medium font-sans max-w-[70%]">
                      {landingData.galleryPhotos[currentPhotoIndex]?.caption}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              {landingData.galleryPhotos.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? landingData.galleryPhotos!.length - 1 : prev - 1)}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <ChevronLeft className="size-4 sm:size-5" />
                  </button>
                  <button 
                    onClick={() => setCurrentPhotoIndex(prev => (prev + 1) % landingData.galleryPhotos!.length)}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <ChevronRight className="size-4 sm:size-5" />
                  </button>
                  
                  {/* Navigation Dots */}
                  <div className="absolute bottom-6 right-6 flex items-center gap-1.5">
                    {landingData.galleryPhotos.map((_, idx) => (
                      <button
                        key={`dot-${idx}`}
                        className={`transition-all rounded-full ${idx === currentPhotoIndex ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70 dark:bg-slate-900/70'}`}
                        onClick={() => setCurrentPhotoIndex(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.section>
        )}

        {/* SECTION 4: ACHIEVEMENTS & AWARDS */}
        {landingData.showAchievements !== false && landingData.achievements && landingData.achievements.length > 0 && (
          <motion.section 
            id="achievements-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slowFadeIn}
            className="space-y-8 text-left scroll-mt-28"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-[10px] font-bold tracking-widest text-amber-500 font-mono uppercase flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-amber-500" /> SECTION 04 • COMPETITIVE RECORD
                </span>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#0f2e46] dark:text-white tracking-tighter uppercase">
                Achievements & Honors
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-light max-w-2xl leading-relaxed">
                Celebrating team triumphs, championship victories, and engineering design accolades across national and collegiate robotics competitions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isSyncingData ? (
                [1, 2, 3].map(i => (
                  <div key={`ach-skel-${i}`} className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 space-y-4 animate-pulse shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="size-11 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                    </div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                    <div className="h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md w-full" />
                    <div className="h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md w-2/3" />
                  </div>
                ))
              ) : (
                landingData.achievements.map((ach, idx) => {
                const awardLower = (ach.award || "").toLowerCase();
                const isGold = ach.badgeType === "gold" || awardLower.includes("1st") || awardLower.includes("gold") || awardLower.includes("champion");
                const isSilver = ach.badgeType === "silver" || awardLower.includes("2nd") || awardLower.includes("silver") || awardLower.includes("runner");
                const isBronze = ach.badgeType === "bronze" || awardLower.includes("3rd") || awardLower.includes("bronze");

                return (
                  <motion.div
                    key={ach.id || `ach-${idx}`}
                    variants={slowFadeIn}
                    whileHover={{ y: -4 }}
                    className="relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-md transition-all overflow-hidden group"
                  >
                    {/* Top Glow Accent Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isGold 
                        ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" 
                        : isSilver 
                        ? "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500" 
                        : isBronze 
                        ? "bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800" 
                        : "bg-gradient-to-r from-blue-500 to-indigo-600"
                    }`} />

                    <div className="space-y-4">
                      {/* Badge Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                          isGold 
                            ? "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50" 
                            : isSilver
                            ? "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            : isBronze
                            ? "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50"
                            : "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50"
                        }`}>
                          {isGold ? (
                            <Trophy className="size-5.5" />
                          ) : isSilver ? (
                            <Medal className="size-5.5" />
                          ) : isBronze ? (
                            <Medal className="size-5.5" />
                          ) : (
                            <Award className="size-5.5" />
                          )}
                        </div>

                        {ach.yearOrDate && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10.5px] font-bold font-mono tracking-wider">
                            {ach.yearOrDate}
                          </span>
                        )}
                      </div>

                      {/* Award Rank Tag */}
                      <div>
                        <span className={`inline-block text-[11px] font-extrabold uppercase tracking-wider font-mono px-2.5 py-1 rounded-lg border ${
                          isGold 
                            ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60" 
                            : isSilver
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                            : "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60"
                        }`}>
                          {ach.award}
                        </span>
                      </div>

                      {/* Title & Event */}
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-[#0f2e46] dark:text-white leading-snug tracking-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {ach.title}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                          {ach.eventOrCompetition}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                        {ach.description}
                      </p>

                      {/* Photo Thumbnail if provided */}
                      {ach.imageUrl && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAchievement(ach);
                          }}
                          className="pt-2 relative group/photo cursor-pointer overflow-hidden rounded-2xl"
                        >
                          <div className="relative h-36 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
                            <img 
                              src={ach.imageUrl} 
                              alt={ach.title} 
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                              <span className="px-3 py-1.5 rounded-full bg-black/70 border border-white/20 text-white text-[10px] font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 shadow-lg">
                                <ZoomIn className="size-3.5 text-blue-400" /> View Full Photo
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
              )}
            </div>
          </motion.section>
        )}

        {/* SECTION 5: SPONSORS */}
        {landingData.showSponsors !== false && (
        <motion.section 
          id="sponsors-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={slowFadeIn}
          className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-[2.5rem] p-8 sm:p-14 shadow-lg relative overflow-hidden scroll-mt-32"
        >
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-slate-800 rounded-full text-blue-600 dark:text-blue-400 font-mono text-[9px] font-bold tracking-widest uppercase mb-4 border border-blue-100 dark:border-slate-700">
              SECTION 05 • {landingData.sponsorHeader || "Sponsorship"}
            </span>
            
            <h2 className="text-3xl sm:text-5xl font-black text-[#0f2e46] dark:text-white tracking-tighter uppercase mb-8 max-w-3xl">
              {landingData.sponsorTitle || "Support the Build."}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-3">
                  The Ask
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {landingData.sponsorAskDesc}
                </p>
              </div>
              
              {landingData.sponsorBenefitDesc && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-3">
                    The Benefit
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {landingData.sponsorBenefitDesc}
                  </p>
                </div>
              )}
            </div>

            {landingData.sponsors && landingData.sponsors.length > 0 && (
              <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800/50">
                <h3 className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
                  Our Current Sponsors & Partners
                </h3>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                  {landingData.sponsors.map((sponsor) => (
                    <a
                      key={sponsor.id}
                      href={sponsor.websiteUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
                    >
                      {sponsor.logoUrl ? (
                        <div className="h-16 w-32 md:h-20 md:w-40 relative flex items-center justify-center grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">
                          <img 
                            src={sponsor.logoUrl} 
                            alt={sponsor.name} 
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-16 px-6 relative flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 opacity-60 group-hover:opacity-100 transition-all duration-300">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300 tracking-wider">
                            {sponsor.name}
                          </span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>
        )}

        {/* SECTION 5: CONTACT US */}
        {landingData.showContactUs !== false && (
        <motion.section 
          id="contact-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={slowFadeIn}
          className="bg-[#0f2e46] text-white rounded-[2.5rem] p-8 sm:p-14 shadow-2xl relative overflow-hidden scroll-mt-32"
        >
          {/* Subtle neon accents */}
          
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8 z-10 relative">
            <div className="space-y-5 lg:max-w-[60%] flex flex-col justify-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-blue-200 border border-white/5 font-mono text-[9px] font-bold tracking-widest uppercase mb-4">
                  SECTION 05 • CONTACT US
                </span>
                
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-6">
                  Get in Touch
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-350 leading-relaxed font-light">
                  Pushing the limits of robotics takes resources. Connect with us for technical collaborations, media inquiries, or general questions.
                </p>
              </div>

              {/* Contact Email Highlight Row */}
              <div className="pt-6 border-t border-white/10 mt-6 space-y-2 text-left">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                  BUSINESS INQUIRIES
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                  <span className="text-xs sm:text-sm font-semibold font-mono text-white tracking-wide bg-slate-900/40 py-2 px-3 sm:px-3.5 rounded-xl border border-white/10 select-all shrink-0 truncate w-full sm:w-auto">
                    {landingData.contactEmail || "contact@teamaxotic.com"}
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <motion.button
                      onClick={handleCopyEmail}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="p-2 sm:px-3 sm:py-2.5 bg-white dark:bg-slate-900 text-[#0f2e46] dark:text-white text-[10px] font-bold font-mono tracking-wider rounded-xl uppercase hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3 text-emerald-600" /> COPIED!
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> COPY
                        </>
                      )}
                    </motion.button>

                    <motion.a 
                      href={`mailto:${landingData.contactEmail || "contact@teamaxotic.com"}?subject=Team%20AXOTIC%20Sponsorship%20Inquiry`}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="p-2 sm:px-3 sm:py-2.5 bg-blue-600 text-white text-[10px] font-bold font-mono tracking-wider rounded-xl uppercase hover:bg-blue-500 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                    >
                      <Mail className="size-3" /> EMAIL
                    </motion.a>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Channels Container */}
            <div className="w-full lg:w-[35%] bg-slate-900/35 p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-6">
              <div>
                <h4 className="text-[11px] font-bold tracking-widest uppercase text-slate-300 font-mono mb-2">
                  Social Channels
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal font-light">
                  Follow our progress updates, live tournament streams, and fabrication loops.
                </p>
              </div>

              {/* Grid of Social Channels */}
              <div className="space-y-2">
                {landingData.socialChannels && landingData.socialChannels.length > 0 ? (
                  landingData.socialChannels.map((channel, idx) => {
                    const platformLower = channel.platform.toLowerCase();
                    let Icon = Link;
                    let iconColorClass = "text-slate-400";
                    
                    if (platformLower.includes('instagram')) {
                      Icon = Instagram;
                      iconColorClass = "text-pink-400";
                    } else if (platformLower.includes('linkedin')) {
                      Icon = Linkedin;
                      iconColorClass = "text-blue-400";
                    } else if (platformLower.includes('youtube')) {
                      Icon = Youtube;
                      iconColorClass = "text-red-500";
                    }
                    
                    return (
                      <motion.a 
                        key={`social-${channel.id}-${idx}`}
                        href={channel.url} 
                        target="_blank"
                        rel="noreferrer"
                        whileHover={{ scale: 1.02, x: 2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:text-white transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className={`size-4 ${iconColorClass}`} /> {channel.platform}
                        </span>
                        <ExternalLink className="size-3 opacity-60" />
                      </motion.a>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border border-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">No social channels active</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>
        )}

      </main>

      {/* Elegant minimalist footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-5xl flex flex-col sm:flex-row justify-center items-center text-[10px] text-[#0f2e46] dark:text-white/50 tracking-wider font-mono uppercase gap-4 mt-20 pt-8 border-t border-slate-200/40 dark:border-slate-700/40 pb-6 text-center"
      >
        <div className="flex flex-col space-y-1">
          <span>AXOTIC HUB V1.0</span>
          <span>&copy; 2026 all rights reserved</span>
        </div>
      </motion.footer>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImageIndex !== null && landingData.buildSpecs && (
          <BuildLightbox 
            key="lightbox"
            spec={landingData.buildSpecs[lightboxImageIndex.idx]} 
            idx={lightboxImageIndex.idx} 
            initialIdx={lightboxImageIndex.imgIdx} 
            onClose={() => setLightboxImageIndex(null)} 
          />
        )}

        {selectedAchievement !== null && (
          <AchievementLightbox 
            key="ach-lightbox"
            achievement={selectedAchievement}
            onClose={() => setSelectedAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
