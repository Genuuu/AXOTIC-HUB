import React, { useState, useEffect } from "react";
import { 
  Lock, 
  ArrowRight, 
  ExternalLink, 
  Mail, 
  Copy, 
  Check, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Sparkles, 
  Cpu, 
  Layers, 
  Activity,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import defaultLogoUrl from "../../Images/Logo.png";
import { useWorkspaceSettings } from "../useWorkspaceSettings";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { defaultPublicLandingData, PublicLandingData } from "./defaultPublicLandingData";

interface PublicLandingProps {
  onOpenLogin: () => void;
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

export default function PublicLanding({ onOpenLogin }: PublicLandingProps) {
  const [copied, setCopied] = useState(false);
  const [activeBuild, setActiveBuild] = useState<string | null>(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);
  const [landingData, setLandingData] = useState<PublicLandingData>(defaultPublicLandingData);
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
          galleryPhotos: d.galleryPhotos || defaultPublicLandingData.galleryPhotos,
        } as PublicLandingData);
      }
    }, (err) => {
      console.warn("Could not load public page configurations from Firestore securely.", err.message);
      handleFirestoreError(err, OperationType.GET, "landing/public");
    });

    return () => {
      window.removeEventListener("axotic_db_update", handleStorageChange);
      unsub();
    };
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(landingData.contactEmail || "contact@teamaxotic.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0.8]);

  return (
    <div 
      id="public-landing-container" 
      className="min-h-screen bg-slate-50/60 text-[#0f2e46] flex flex-col items-center p-4 sm:p-8 md:p-12 relative overflow-x-hidden font-sans antialiased"
    >
      {/* Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 z-[100] origin-left"
        style={{ scaleX: scrollYProgress }}
      />
      
      {/* Decorative clean grid backdrop with parallax */}
      <motion.div 
        style={{ y: backgroundY }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none -z-10" 
      />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-20" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl pointer-events-none -z-20" />

      {/* Main Header / Secure Portal Bar */}
      <motion.header 
        style={{ opacity: headerOpacity }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center z-20 py-4 border-b border-slate-200/60 mb-12 gap-4 sticky top-4 bg-slate-50/80 backdrop-blur-md px-6 rounded-2xl"
      >
        <div className="flex items-center space-x-3.5">
          <img 
            src={activeLogoUrl || undefined} 
            alt="AXOTIC Logo" 
            className="h-10 object-contain drop-shadow-sm" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="flex flex-col">
            <span className="font-sans font-extrabold text-sm tracking-[0.18em] text-[#0f2e46] uppercase">
              TEAM AXOTIC
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6 hidden md:flex">
          {['Intro', 'About Us', 'Our Builds', 'Contact'].map((item) => {
            const isVisible = 
              (item === 'Intro' && landingData.showIntro !== false) ||
              (item === 'About Us' && landingData.showAboutUs !== false) ||
              (item === 'Our Builds' && landingData.showBuilds !== false) ||
              (item === 'Contact' && landingData.showContactUs !== false);
            
            if (!isVisible) return null;

            const id = item === 'Contact' ? 'contact-section' : item === 'Our Builds' ? 'builds-section' : item === 'About Us' ? 'about-section' : 'intro-section';
            return (
              <motion.button
                key={item}
                whileHover={{ scale: 1.05, color: '#2563eb' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const element = document.getElementById(id);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="text-xs font-bold tracking-wider text-[#0f2e46]/80 hover:text-blue-600 transition-colors uppercase font-mono cursor-pointer"
              >
                {item}
              </motion.button>
            );
          })}
        </nav>

        {/* Secure login gateway button */}
        <motion.button
          id="top-nav-portal-btn"
          onClick={onOpenLogin}
          whileHover={{ scale: 1.03, backgroundColor: "#0f2e46", color: "#ffffff" }}
          whileTap={{ scale: 0.97 }}
          className="text-xs font-bold tracking-wider text-[#0f2e46] hover:text-white px-5 py-2.5 rounded-xl border border-[#0f2e46]/20 bg-white/70 backdrop-blur-md transition-all duration-200 font-mono cursor-pointer flex items-center gap-2.5 shadow-xs whitespace-nowrap"
        >
          <Lock className="size-3.5" /> SECURE GATEWAY
        </motion.button>
      </motion.header>

      {/* Main Public Page Content Container */}
      <main className="w-full max-w-4xl z-10 flex flex-col items-stretch space-y-20">

        {/* SECTION 1: INTRO */}
        {landingData.showIntro !== false && (
          <motion.section 
            id="intro-section"
            initial="hidden"
            animate="visible"
            variants={slowFadeIn}
            className="flex flex-col items-center text-center justify-center py-8 px-4"
          >
            <div className="inline-flex items-center gap-2 px-3 tracking-[0.2em] py-1 bg-blue-50 text-blue-600 rounded-full font-mono text-[10px] font-bold uppercase mb-6 border border-blue-100/50">
              <Sparkles className="size-3 animate-pulse" /> Welcome to Team AXOTIC
            </div>
            
            <h1 
              className="text-3xl sm:text-5xl md:text-6xl font-black text-[#0f2e46] tracking-tight leading-tight max-w-3xl mb-8"
              dangerouslySetInnerHTML={{ __html: (landingData.heroTitle || "").replace("AXOTIC", `<span class="relative inline-block text-blue-600">AXOTIC<span class="absolute left-0 bottom-0.5 w-full h-[6px] bg-blue-100 -z-10" /></span>`) }}
            />

            <p className="text-sm sm:text-base text-slate-500 font-medium max-w-xl leading-relaxed mb-4">
              {landingData.heroSubtitle}
            </p>

            {landingData.showAboutUs !== false && (
              <div className="flex gap-4 mt-4">
                <a 
                  href="#about-section"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors py-2 px-3 flex items-center gap-1 font-mono"
                >
                  Learn More <ArrowRight className="size-3.5" />
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
            viewport={{ once: true, margin: "-100px" }}
            variants={slowFadeIn}
            className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-sm relative overflow-hidden"
          >
          <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 space-y-3">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase block">SECTION 02</span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f2e46] tracking-tight uppercase">
                {landingData.whoWeAreOriginTitle}
              </h2>
              <div className="w-12 h-1 bg-blue-600 rounded" />
            </div>

            <div className="md:col-span-8 space-y-6">
              <p className="text-sm sm:text-base text-slate-650 leading-relaxed font-normal">
                {landingData.whoWeAreOriginDesc}
              </p>

              {/* Multidisciplinary Spec Badges */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center">
                  <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                    <Cpu className="size-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 block">Electrical</span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center">
                  <div className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                    <Layers className="size-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 block">Mechanical</span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center">
                  <div className="size-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
                    <Activity className="size-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 block">Biomedical</span>
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
                      <div key={`${team.id}-${idx}`} className="bg-slate-50 hover:bg-slate-100/50 border border-slate-150 p-3.5 rounded-xl transition-all">
                        <h5 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                          🛡️ {team.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-normal">
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
            className="space-y-8 text-left"
          >
          <div className="space-y-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase block">SECTION 03</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f2e46] tracking-tight uppercase">
              Our Builds
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
              Hover over or click any build module block below to view its classification specifications.
            </p>
          </div>

          {/* Grid of Images / Interactive Build Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {landingData.buildSpecs && landingData.buildSpecs.length > 0 ? (
              landingData.buildSpecs.map((spec, idx) => (
                <motion.div 
                  key={`${spec.id || 'build'}-${idx}`}
                  id={`build-card-${idx}`}
                  variants={slowFadeIn}
                  className="relative aspect-video sm:aspect-16/10 rounded-3xl overflow-hidden shadow-xs cursor-pointer group border border-slate-200 bg-slate-900 select-none"
                  onClick={() => setLightboxImageIndex(idx)}
                  whileHover={{ y: -6, scale: 1.015 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.img 
                    layoutId={`lightbox-img-${idx}`}
                    src={spec.imageUrl || `https://images.unsplash.com/photo-${idx % 2 === 0 ? '1581091226825-a6a2a5aee158' : '1485827404703-89b55fcc595e'}?auto=format&fit=crop&q=80&w=1000`} 
                    alt={spec.title} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Cover Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent transition-opacity duration-300" />

                  {/* Revealable Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] font-bold font-mono tracking-wider bg-blue-600/90 text-white px-2 py-0.5 rounded uppercase">
                        {spec.category}
                      </span>
                      <h3 className="text-lg font-extrabold text-white leading-snug">
                        {spec.title}
                      </h3>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <span className="text-[10px] font-mono tracking-widest text-blue-300 block uppercase font-bold">
                        CLASSIFIED TOPIC
                      </span>
                      <p className="text-sm font-bold text-white tracking-wide">
                        {spec.subtitle}
                      </p>
                      {spec.technologies && (
                        <p className="text-[10px] text-slate-300 mt-2 font-mono">
                          {spec.technologies}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-[8px] font-bold tracking-widest text-white/80 uppercase py-1 px-2.5 rounded-md font-mono pointer-events-none">
                    CLICK OR HOVER TO REVEAL
                  </div>
                </motion.div>
              ))
            ) : (
               <div className="col-span-2 text-center text-slate-500 py-12 border border-dashed border-slate-200 rounded-3xl">
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
            className="space-y-6 text-left"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase block">SECTION 03.5</span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f2e46] tracking-tight uppercase">
                Milestones & Trajectory
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {landingData.trackRecords.map((tr, idx) => (
                <div key={`${tr.id}-${idx}`} className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/70 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-sm">
                      {tr.statusTag ? tr.statusTag.toUpperCase() : "TARGET"}
                    </span>
                    <h4 className="text-xs font-black text-[#0f2e46] uppercase tracking-wide pt-1">{tr.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-light">{tr.description}</p>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium font-mono border-t border-slate-100/80 pt-2.5 mt-4">
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
            className="space-y-6 text-left"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase block">SECTION 03.6</span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f2e46] tracking-tight uppercase">
                Team Photos
              </h2>
            </div>
            <div className="relative aspect-video sm:aspect-[21/9] w-full rounded-3xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200 group">
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button 
                    onClick={() => setCurrentPhotoIndex(prev => (prev + 1) % landingData.galleryPhotos!.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  
                  {/* Navigation Dots */}
                  <div className="absolute bottom-6 right-6 flex items-center gap-1.5">
                    {landingData.galleryPhotos.map((_, idx) => (
                      <button
                        key={`dot-${idx}`}
                        className={`transition-all rounded-full ${idx === currentPhotoIndex ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                        onClick={() => setCurrentPhotoIndex(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.section>
        )}

        {/* SECTION 4: CONTACT US */}
        {landingData.showContactUs !== false && (
        <motion.section 
          id="contact-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={slowFadeIn}
          className="bg-[#0f2e46] text-white rounded-3xl p-8 sm:p-12 shadow-md relative overflow-hidden"
        >
          {/* Subtle neon accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8 z-10 relative">
            <div className="space-y-5 lg:max-w-[60%] flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-blue-200 border border-white/5 font-mono text-[9px] font-bold tracking-widest uppercase mb-4">
                  SECTION 04 • {landingData.sponsorHeader || "CONTACT US"}
                </span>
                
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase font-mono mb-4">
                  {landingData.sponsorTitle || "Contact Us"}
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-350 leading-relaxed font-light">
                  {landingData.sponsorAskDesc || "Pushing the limits of robotics takes resources. Connect with us for sponsorships, technical collaborations, or general inquiries."}
                </p>
                {landingData.sponsorBenefitDesc && (
                  <p className="text-xs sm:text-sm text-blue-200 leading-relaxed font-normal mt-2">
                    💡 Benefit: {landingData.sponsorBenefitDesc}
                  </p>
                )}
              </div>

              {/* Contact Email Highlight Row */}
              <div className="pt-6 border-t border-white/10 mt-6 space-y-2 text-left">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                  BUSINESS INQUIRIES
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-sm font-semibold font-mono text-white tracking-wide bg-slate-900/40 py-2 px-3.5 rounded-xl border border-white/10 select-all shrink-0">
                    {landingData.contactEmail || "contact@teamaxotic.com"}
                  </span>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={handleCopyEmail}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="p-2 sm:px-3 sm:py-2.5 bg-white text-[#0f2e46] text-[10px] font-bold font-mono tracking-wider rounded-xl uppercase hover:bg-slate-100 flex items-center gap-1.5 shrink-0 cursor-pointer"
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
                      className="p-2 sm:px-3 sm:py-2.5 bg-blue-600 text-white text-[10px] font-bold font-mono tracking-wider rounded-xl uppercase hover:bg-blue-500 flex items-center gap-1.5 shrink-0"
                    >
                      <Mail className="size-3" /> EMAIL DIRECT
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
                <motion.a 
                  href="https://instagram.com" 
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.02, x: 2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Instagram className="size-4 text-pink-400" /> Instagram
                  </span>
                  <ExternalLink className="size-3 opacity-60" />
                </motion.a>

                <motion.a 
                  href="https://linkedin.com" 
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.02, x: 2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Linkedin className="size-4 text-blue-400" /> LinkedIn
                  </span>
                  <ExternalLink className="size-3 opacity-60" />
                </motion.a>

                <motion.a 
                  href="https://youtube.com" 
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.02, x: 2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Youtube className="size-4 text-red-500" /> YouTube
                  </span>
                  <ExternalLink className="size-3 opacity-60" />
                </motion.a>
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
        className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#0f2e46]/50 tracking-wider font-mono uppercase gap-4 mt-20 pt-8 border-t border-slate-200/40 pb-12 text-center sm:text-left"
      >
        <div className="flex flex-col space-y-1">
          <span>AXOTIC HUB V1.0</span>
          <span>&copy; 2026 all rights reserved</span>
        </div>
        <div className="text-[9px] text-slate-400 font-normal">
          Designed with Swiss typographic principles
        </div>
      </motion.footer>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImageIndex !== null && landingData.buildSpecs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
            onClick={() => setLightboxImageIndex(null)}
          >
            <motion.div
              className="relative max-w-6xl w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                layoutId={`lightbox-img-${lightboxImageIndex}`}
                src={landingData.buildSpecs[lightboxImageIndex].imageUrl || `https://images.unsplash.com/photo-${lightboxImageIndex % 2 === 0 ? '1581091226825-a6a2a5aee158' : '1485827404703-89b55fcc595e'}?auto=format&fit=crop&q=80&w=1600`}
                alt={landingData.buildSpecs[lightboxImageIndex].title}
                className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button 
                className="absolute -top-12 right-0 text-white hover:text-red-400 p-2 border border-white/10 bg-black/50 rounded-full backdrop-blur-sm transition-colors" 
                onClick={() => setLightboxImageIndex(null)}
              >
                <X className="size-5" />
              </button>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 text-left border border-white/10 sm:max-w-xl shadow-2xl"
              >
                <p className="text-white text-xl font-extrabold tracking-tight">
                  {landingData.buildSpecs[lightboxImageIndex].title}
                </p>
                <p className="text-white/80 text-sm mt-2 leading-relaxed">
                  {landingData.buildSpecs[lightboxImageIndex].subtitle}
                </p>
                {landingData.buildSpecs[lightboxImageIndex].technologies && (
                  <p className="text-xs text-blue-300 tracking-wider font-mono uppercase mt-4 block">
                    {landingData.buildSpecs[lightboxImageIndex].technologies}
                  </p>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
