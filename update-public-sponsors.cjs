const fs = require('fs');
let code = fs.readFileSync('src/components/PublicLanding.tsx', 'utf8');

const regex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">\s*<div>\s*<h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-3">\s*The Ask\s*<\/h3>\s*<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">\s*\{landingData\.sponsorAskDesc\}\s*<\/p>\s*<\/div>\s*\{landingData\.sponsorBenefitDesc && \(\s*<div>\s*<h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-3">\s*The Benefit\s*<\/h3>\s*<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">\s*\{landingData\.sponsorBenefitDesc\}\s*<\/p>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/motion\.section>/;

const replacement = `<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
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
        </motion.section>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/PublicLanding.tsx', code);
    console.log("Updated PublicLanding");
} else {
    console.log("Regex didn't match.");
}
