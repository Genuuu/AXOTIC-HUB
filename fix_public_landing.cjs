const fs = require('fs');

let content = fs.readFileSync('src/components/PublicLanding.tsx', 'utf-8');

// 1. Update BuildLightbox definition to use forwardRef
content = content.replace(
  `const BuildLightbox = ({ spec, initialIdx, idx, onClose }: any) => {`,
  `const BuildLightbox = React.forwardRef(({ spec, initialIdx, idx, onClose }: any, ref: any) => {`
);

content = content.replace(
  /<motion\.div\n\s*initial=\{\{ opacity: 0 \}\}\n\s*animate=\{\{ opacity: 1 \}\}\n\s*exit=\{\{ opacity: 0 \}\}/,
  `<motion.div\n      ref={ref}\n      initial={{ opacity: 0 }}\n      animate={{ opacity: 1 }}\n      exit={{ opacity: 0 }}`
);

// Close the forwardRef
content = content.replace(
  /    <\/motion\.div>\n  \);\n\};\n/,
  `    </motion.div>\n  );\n});\n`
);

// 2. Add key to BuildLightbox
content = content.replace(
  /<BuildLightbox \n\s*spec=\{landingData\.buildSpecs\[lightboxImageIndex\.idx\]\} \n\s*idx=\{lightboxImageIndex\.idx\} \n\s*initialIdx=\{lightboxImageIndex\.imgIdx\} \n\s*onClose=\{.*?\} \n\s*\/>/g,
  `<BuildLightbox \n            key="lightbox"\n            spec={landingData.buildSpecs[lightboxImageIndex.idx]} \n            idx={lightboxImageIndex.idx} \n            initialIdx={lightboxImageIndex.imgIdx} \n            onClose={() => setLightboxImageIndex(null)} \n          />`
);

// 3. Remove blur-3xl divs
content = content.replace(/<div className="absolute[^>]*blur-3xl[^>]*><\/div>/g, '');
content = content.replace(/<div className="absolute[^>]*blur-3xl[^>]*\/>/g, '');


// 4. Replace Multidisciplinary Spec Badges
const oldBadges = `              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="group bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 flex flex-col items-start text-left transition-all duration-300 hover:shadow-xs">
                  <div className="size-10 rounded-xl bg-blue-50/80 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center mb-4 transition-colors">
                    <Cpu className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold mb-1">CORE 01</span>
                  <span className="text-sm font-bold text-slate-800 tracking-tight">Electrical Systems</span>
                </div>

                <div className="group bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 flex flex-col items-start text-left transition-all duration-300 hover:shadow-xs">
                  <div className="size-10 rounded-xl bg-emerald-50/80 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 transition-colors">
                    <Layers className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold mb-1">CORE 02</span>
                  <span className="text-sm font-bold text-slate-800 tracking-tight">Mechanical & CAD</span>
                </div>

                <div className="group bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 flex flex-col items-start text-left transition-all duration-300 hover:shadow-xs">
                  <div className="size-10 rounded-xl bg-indigo-50/80 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 transition-colors">
                    <Activity className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold mb-1">CORE 03</span>
                  <span className="text-sm font-bold text-slate-800 tracking-tight">Biomedical R&D</span>
                </div>
              </div>`;

const newBadges = `              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-start text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Cpu className="size-24 text-blue-400" />
                  </div>
                  <div className="size-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 border border-blue-500/30">
                    <Cpu className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold mb-2">CORE 01</span>
                  <span className="text-xl font-bold text-white tracking-tight">Electrical<br/>Systems</span>
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
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold mb-2">CORE 02</span>
                  <span className="text-xl font-bold text-white tracking-tight">Mechanical<br/>& CAD</span>
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
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold mb-2">CORE 03</span>
                  <span className="text-xl font-bold text-white tracking-tight">Biomedical<br/>R&D</span>
                  <div className="w-full h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-indigo-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                  </div>
                </div>
              </div>`;

content = content.replace(oldBadges, newBadges);

fs.writeFileSync('src/components/PublicLanding.tsx', content);
console.log('Fixed PublicLanding.tsx');
