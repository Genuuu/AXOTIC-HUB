const fs = require('fs');

let content = fs.readFileSync('src/components/PublicLanding.tsx', 'utf-8');

const dynamicSocials = `              {/* Grid of Social Channels */}
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
                        key={\`social-\$\{channel.id\}-\$\{idx\}\`}
                        href={channel.url} 
                        target="_blank"
                        rel="noreferrer"
                        whileHover={{ scale: 1.02, x: 2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:text-white transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className={\`size-4 \$\{iconColorClass\}\`} /> {channel.platform}
                        </span>
                        <ExternalLink className="size-3 opacity-60" />
                      </motion.a>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border border-white/5 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-mono">No social channels active</p>
                  </div>
                )}
              </div>`;

const currentSocials = `              {/* Grid of Social Channels */}
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
              </div>`;

content = content.replace(currentSocials, dynamicSocials);

fs.writeFileSync('src/components/PublicLanding.tsx', content);
console.log('Fixed PublicLanding.tsx');
