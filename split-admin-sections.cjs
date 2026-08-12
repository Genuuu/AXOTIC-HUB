const fs = require('fs');

let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const oldSponsorsBlock = `<div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="size-4 text-rose-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">E. Sponsors & Contact</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Sponsors</span>
                      <input 
                        type="checkbox" 
                        checked={publicPageData.showSponsors !== false}
                        onChange={(e) => setPublicPageData({ ...publicPageData, showSponsors: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Contact</span>
                      <input 
                        type="checkbox" 
                        checked={publicPageData.showContactUs !== false}
                        onChange={(e) => setPublicPageData({ ...publicPageData, showContactUs: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                    </label>
                  </div>
                </div>`;

const newSponsorsBlock = `<div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="size-4 text-rose-400" />
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">E. Sponsors</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show</span>
                    <input 
                      type="checkbox" 
                      checked={publicPageData.showSponsors !== false}
                      onChange={(e) => setPublicPageData({ ...publicPageData, showSponsors: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                  </label>
                </div>`;

code = code.replace(oldSponsorsBlock, newSponsorsBlock);

const oldEmailBlock = `                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Sponsorship Contact Email address</label>
                    <input 
                      type="email"
                      value={publicPageData.contactEmail}
                      onChange={(e) => setPublicPageData({ ...publicPageData, contactEmail: e.target.value })}
                      className="w-full text-xs font-mono px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Social Channels Section */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">`;

const newEmailBlock = `                </div>
              </div>

              {/* F. Contact Us Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-100 dark:border-slate-805">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail size-4 text-blue-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider">F. Contact Us</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wide uppercase">Show</span>
                    <input 
                      type="checkbox" 
                      checked={publicPageData.showContactUs !== false}
                      onChange={(e) => setPublicPageData({ ...publicPageData, showContactUs: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-[12px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"></div>
                  </label>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Contact Email address</label>
                    <input 
                      type="email"
                      value={publicPageData.contactEmail}
                      onChange={(e) => setPublicPageData({ ...publicPageData, contactEmail: e.target.value })}
                      className="w-full text-xs font-mono px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Social Channels Section */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">`;

code = code.replace(oldEmailBlock, newEmailBlock);

// F. Team Photos -> G. Team Photos Gallery
code = code.replace(
  '<h3 className="font-display text-xs font-bold uppercase tracking-wider">F. Team Photos Gallery</h3>', 
  '<h3 className="font-display text-xs font-bold uppercase tracking-wider">G. Team Photos Gallery</h3>'
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
console.log("Splitting successful.");
