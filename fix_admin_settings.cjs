const fs = require('fs');

let content = fs.readFileSync('src/components/AdminSettings.tsx', 'utf-8');

const socialFields = `                  <div>
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
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Link className="size-4 text-blue-600" /> Social Channels
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Configure social media links displayed in the footer.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newId = \`sc-\$\{Date.now()\}\`;
                      const updatedChannels = [...(publicPageData.socialChannels || []), {
                        id: newId,
                        platform: "Website",
                        url: "https://"
                      }];
                      setPublicPageData({ ...publicPageData, socialChannels: updatedChannels });
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus className="size-3" /> Add Channel
                  </button>
                </div>
                
                <div className="space-y-4">
                  {!(publicPageData.socialChannels && publicPageData.socialChannels.length > 0) ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500 font-mono">No social channels configured.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {publicPageData.socialChannels.map((channel, index) => (
                        <div key={channel.id} className="relative p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="absolute top-2 right-2">
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = (publicPageData.socialChannels || []).filter(c => c.id !== channel.id);
                                setPublicPageData({ ...publicPageData, socialChannels: filtered });
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-slate-900 transition-colors"
                              title="Delete Channel"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          
                          <div className="space-y-3 mt-4">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">Platform Name</label>
                              <input 
                                type="text"
                                value={channel.platform}
                                onChange={(e) => {
                                  const updated = [...(publicPageData.socialChannels || [])];
                                  updated[index] = { ...channel, platform: e.target.value };
                                  setPublicPageData({ ...publicPageData, socialChannels: updated });
                                }}
                                className="w-full text-xs font-medium px-2 py-1.5 bg-white border border-slate-200 rounded dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">URL</label>
                              <input 
                                type="url"
                                value={channel.url}
                                onChange={(e) => {
                                  const updated = [...(publicPageData.socialChannels || [])];
                                  updated[index] = { ...channel, url: e.target.value };
                                  setPublicPageData({ ...publicPageData, socialChannels: updated });
                                }}
                                className="w-full text-[11px] font-mono px-2 py-1.5 bg-white border border-slate-200 rounded dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-hidden"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>`;

content = content.replace(
`                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono mb-1.5">Sponsorship Contact Email address</label>
                    <input 
                      type="email"
                      value={publicPageData.contactEmail}
                      onChange={(e) => setPublicPageData({ ...publicPageData, contactEmail: e.target.value })}
                      className="w-full text-xs font-mono px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>`, socialFields);

fs.writeFileSync('src/components/AdminSettings.tsx', content);
console.log('Fixed AdminSettings.tsx');
