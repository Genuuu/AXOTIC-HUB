const fs = require('fs');
let code = fs.readFileSync('src/components/PublicLanding.tsx', 'utf8');

// Update imports
code = code.replace(/Cpu,/, 'Cpu,\n  CircuitBoard,\n  Zap,');

// Replace the badges grid
const oldGridRegex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">[\s\S]*?<\/div>\s*\{\/\* Division subteams dynamic integration \*\/\}/;

const newGrid = `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-start text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="size-24 text-amber-400" />
                  </div>
                  <div className="size-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6 border border-amber-500/30">
                    <Zap className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">CORE 01</span>
                  <span className="text-xl font-bold text-white tracking-tight">Electrical</span>
                  <div className="w-full h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-amber-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                  </div>
                </div>

                <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-start text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CircuitBoard className="size-24 text-blue-400" />
                  </div>
                  <div className="size-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 border border-blue-500/30">
                    <CircuitBoard className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">CORE 02</span>
                  <span className="text-xl font-bold text-white tracking-tight">Electronic</span>
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
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">CORE 03</span>
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
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">CORE 04</span>
                  <span className="text-xl font-bold text-white tracking-tight">Biomedical</span>
                  <div className="w-full h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-indigo-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                  </div>
                </div>
              </div>
              {/* Division subteams dynamic integration */}`;

if (oldGridRegex.test(code)) {
    code = code.replace(oldGridRegex, newGrid);
    fs.writeFileSync('src/components/PublicLanding.tsx', code);
    console.log("Updated successfully");
} else {
    console.log("Regex didn't match.");
}

