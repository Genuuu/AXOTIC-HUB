const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const regex = /<label className="block text-\[10px\] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1\.5">The Benefit Description Paragraph<\/label>\s*<textarea\s*rows=\{4\}\s*value=\{publicPageData\.sponsorBenefitDesc\}\s*onChange=\{\(e\) => setPublicPageData\(\{ \.\.\.publicPageData, sponsorBenefitDesc: e\.target\.value \}\)\}\s*className="w-full text-xs p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 leading-relaxed font-sans"\s*\/>\s*<\/div>\s*<\/div>\s*<\/div>/;

const replacement = `<label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">The Benefit Description Paragraph</label>
                    <textarea 
                      rows={4}
                      value={publicPageData.sponsorBenefitDesc}
                      onChange={(e) => setPublicPageData({ ...publicPageData, sponsorBenefitDesc: e.target.value })}
                      className="w-full text-xs p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 leading-relaxed font-sans"
                    />
                  </div>
                </div>
                
                {/* Sponsor Logos Section */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Sponsor Organizations</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Manage logos and links for your sponsors.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = \`sponsor-\${Date.now()}\`;
                        const updatedSponsors = [...(publicPageData.sponsors || []), {
                          id: newId,
                          name: "New Sponsor",
                          websiteUrl: "https://"
                        }];
                        setPublicPageData({ ...publicPageData, sponsors: updatedSponsors });
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Sponsor
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(!publicPageData.sponsors || publicPageData.sponsors.length === 0) ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-mono">No sponsors added yet</p>
                      </div>
                    ) : (
                      publicPageData.sponsors.map((sponsor, idx) => (
                        <div key={sponsor.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400">SPONSOR #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = publicPageData.sponsors?.filter(s => s.id !== sponsor.id);
                                setPublicPageData({ ...publicPageData, sponsors: updated });
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Organization Name</label>
                              <input
                                type="text"
                                value={sponsor.name}
                                onChange={(e) => {
                                  const updated = publicPageData.sponsors?.map(s => 
                                    s.id === sponsor.id ? { ...s, name: e.target.value } : s
                                  );
                                  setPublicPageData({ ...publicPageData, sponsors: updated });
                                }}
                                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Website URL</label>
                              <input
                                type="url"
                                value={sponsor.websiteUrl || ""}
                                onChange={(e) => {
                                  const updated = publicPageData.sponsors?.map(s => 
                                    s.id === sponsor.id ? { ...s, websiteUrl: e.target.value } : s
                                  );
                                  setPublicPageData({ ...publicPageData, sponsors: updated });
                                }}
                                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Logo URL (Optional)</label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="https://..."
                                  value={sponsor.logoUrl || ""}
                                  onChange={(e) => {
                                    const updated = publicPageData.sponsors?.map(s => 
                                      s.id === sponsor.id ? { ...s, logoUrl: e.target.value } : s
                                    );
                                    setPublicPageData({ ...publicPageData, sponsors: updated });
                                  }}
                                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-200 rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                />
                                {sponsor.logoUrl && (
                                  <div className="w-8 h-8 rounded shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                                    <img src={sponsor.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminSettings.tsx', code);
    console.log("Updated AdminSettings");
} else {
    console.log("Regex didn't match.");
}
