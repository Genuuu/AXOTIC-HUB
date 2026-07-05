const fs = require('fs');
let code = fs.readFileSync('src/components/PublicLanding.tsx', 'utf8');

// The new component to add at the end of the file (before export default if possible, or just before)
const buildCardComponent = `
const BuildCard = ({ spec, idx, onOpenLightbox, slowFadeIn }: any) => {
  const images = spec.imageUrl ? spec.imageUrl.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
  const displayImages = images.length > 0 ? images : [\`https://images.unsplash.com/photo-\${idx % 2 === 0 ? '1581091226825-a6a2a5aee158' : '1485827404703-89b55fcc595e'}?auto=format&fit=crop&q=80&w=1000\`];
  
  const [currentIdx, setCurrentIdx] = React.useState(0);

  return (
    <motion.div 
      key={\`\${spec.id || 'build'}-\${idx}\`}
      id={\`build-card-\${idx}\`}
      variants={slowFadeIn}
      className="rounded-3xl overflow-hidden shadow-xs group border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md flex flex-col transition-all"
      whileHover={{ y: -4 }}
    >
      <div className="relative aspect-video sm:aspect-16/10 overflow-hidden bg-slate-100 border-b border-slate-100">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img 
            key={currentIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            src={displayImages[currentIdx]} 
            alt={spec.title} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
            referrerPolicy="no-referrer"
            onClick={() => onOpenLightbox(idx, currentIdx)}
          />
        </AnimatePresence>
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 md:opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none" />
        
        <div className="absolute top-3 left-3 md:top-4 md:left-4 pointer-events-none">
          <span className="text-[9px] font-bold font-mono tracking-wider bg-blue-600 text-white px-2 py-1 rounded uppercase shadow-sm">
            {spec.category}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-black/60 backdrop-blur-md text-[8px] font-bold tracking-widest text-white uppercase py-1.5 px-3 rounded-full font-mono md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none">
          VIEW SPECS
        </div>

        {displayImages.length > 1 && (
          <>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx(prev => prev === 0 ? displayImages.length - 1 : prev - 1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx(prev => (prev + 1) % displayImages.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {displayImages.map((_, i) => (
                <div key={i} className={\`h-1 rounded-full transition-all \${i === currentIdx ? 'w-4 bg-blue-500' : 'w-1.5 bg-white/70'}\`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-5 md:p-6 flex-1 flex flex-col justify-between cursor-pointer" onClick={() => onOpenLightbox(idx, currentIdx)}>
        <div>
          <h3 className="text-base md:text-lg font-black text-slate-800 leading-snug tracking-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {spec.title}
          </h3>
          <p className="text-xs md:text-sm text-slate-500 leading-relaxed line-clamp-3">
            {spec.subtitle}
          </p>
        </div>
        {spec.technologies && (
          <div className="mt-4 pt-4 border-t border-slate-100">
             <span className="text-[9px] font-mono tracking-widest text-slate-400 block uppercase font-bold mb-1.5">
               TECHNOLOGIES
             </span>
             <p className="text-[10px] md:text-xs text-slate-600 font-mono font-medium line-clamp-2">
               {spec.technologies}
             </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
`;

const buildLightboxComponent = `
const BuildLightbox = ({ spec, initialIdx, idx, onClose }: any) => {
  const images = spec.imageUrl ? spec.imageUrl.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
  const displayImages = images.length > 0 ? images : [\`https://images.unsplash.com/photo-\${idx % 2 === 0 ? '1581091226825-a6a2a5aee158' : '1485827404703-89b55fcc595e'}?auto=format&fit=crop&q=80&w=1600\`];
  
  const [currentIdx, setCurrentIdx] = React.useState(initialIdx || 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        className="relative max-w-6xl w-full flex flex-col items-center justify-center group"
        onClick={(e: any) => e.stopPropagation()}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={currentIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            src={displayImages[currentIdx]}
            alt={spec.title}
            className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        
        {displayImages.length > 1 && (
          <>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx((prev: number) => prev === 0 ? displayImages.length - 1 : prev - 1);
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
            >
              <ChevronLeft className="size-5 sm:size-6" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx((prev: number) => (prev + 1) % displayImages.length);
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
            >
              <ChevronRight className="size-5 sm:size-6" />
            </button>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
              {displayImages.map((_: any, i: number) => (
                <div key={i} className={\`h-1.5 rounded-full transition-all \${i === currentIdx ? 'w-6 bg-blue-500' : 'w-2 bg-white/70'}\`} />
              ))}
            </div>
          </>
        )}

        <button 
          className="absolute top-2 right-2 sm:-top-12 sm:right-0 text-white hover:text-red-400 p-2 border border-white/10 bg-black/50 rounded-full backdrop-blur-sm transition-colors z-50" 
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 text-left border border-white/10 sm:max-w-xl shadow-2xl overflow-y-auto max-h-[40vh]"
        >
          <p className="text-white text-xl font-extrabold tracking-tight">
            {spec.title}
          </p>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">
            {spec.subtitle}
          </p>
          {spec.technologies && (
            <p className="text-xs text-blue-300 tracking-wider font-mono uppercase mt-4 block">
              {spec.technologies}
            </p>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
`;

code = code.replace(/export default function PublicLanding/g, buildCardComponent + '\n' + buildLightboxComponent + '\nexport default function PublicLanding');

// replace lightboxImageIndex type from number | null to { idx: number, imgIdx: number } | null
code = code.replace(/const \[lightboxImageIndex, setLightboxImageIndex\] = useState<number \| null>\(null\);/g, "const [lightboxImageIndex, setLightboxImageIndex] = useState<{idx: number, imgIdx: number} | null>(null);");

// replace the map over buildSpecs
const mapRegex = /landingData\.buildSpecs\.map\(\(spec, idx\) => \([\s\S]*?<\/motion\.div>\n\s*\)\)/g;
const newMap = `landingData.buildSpecs.map((spec, idx) => (
                <BuildCard 
                  key={\`\${spec.id || 'build'}-\${idx}\`} 
                  spec={spec} 
                  idx={idx} 
                  slowFadeIn={slowFadeIn} 
                  onOpenLightbox={(i: number, imgI: number) => setLightboxImageIndex({idx: i, imgIdx: imgI})} 
                />
              ))`;

code = code.replace(mapRegex, newMap);

// replace lightbox rendering
const lightboxRegex = /\{lightboxImageIndex !== null && landingData\.buildSpecs && \([\s\S]*?<\/motion\.div>\n\s*\)\}/g;
const newLightbox = `{lightboxImageIndex !== null && landingData.buildSpecs && (
          <BuildLightbox 
            spec={landingData.buildSpecs[lightboxImageIndex.idx]} 
            idx={lightboxImageIndex.idx} 
            initialIdx={lightboxImageIndex.imgIdx} 
            onClose={() => setLightboxImageIndex(null)} 
          />
        )}`;

code = code.replace(lightboxRegex, newLightbox);

fs.writeFileSync('src/components/PublicLanding.tsx', code);
