const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const profileInfo = `                <div className="text-left w-full min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-white truncate block max-w-[100px]" title={effectiveUser.displayName}>
                        {effectiveUser.displayName}
                      </span>
                    </div>
                    {effectiveUser.role === "admin" ? (
                      <span className="bg-blue-500/15 text-blue-400 text-[8px] font-bold px-1.5 py-0.2 rounded border border-blue-500/30 font-mono tracking-wider shrink-0">
                        Admin
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-[8px] font-bold px-1.5 py-0.2 rounded border border-slate-700 font-mono tracking-wider shrink-0">
                        Member
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">{effectiveUser.email}</span>
                </div>`;

const newProfileInfo = `                {!isSidebarCollapsed && (
                  <div className="text-left w-full min-w-0 animate-fade-in">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-bold text-white truncate block max-w-[100px]" title={effectiveUser.displayName}>
                          {effectiveUser.displayName}
                        </span>
                      </div>
                      {effectiveUser.role === "admin" ? (
                        <span className="bg-blue-500/15 text-blue-400 text-[8px] font-bold px-1.5 py-0.2 rounded border border-blue-500/30 font-mono tracking-wider shrink-0">
                          Admin
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 text-[8px] font-bold px-1.5 py-0.2 rounded border border-slate-700 font-mono tracking-wider shrink-0">
                          Member
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">{effectiveUser.email}</span>
                  </div>
                )}`;

content = content.replace(profileInfo, newProfileInfo);

fs.writeFileSync('src/App.tsx', content);
