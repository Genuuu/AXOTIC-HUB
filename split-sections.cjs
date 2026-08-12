const fs = require('fs');

let code = fs.readFileSync('src/components/PublicLanding.tsx', 'utf8');

const regex = /\{\/\* SECTION 4: CONTACT US \*\/\}\s*\{landingData\.showContactUs !== false && \(\s*<motion\.section\s*id="contact-section"[\s\S]*?className="bg-\[#0f2e46\] text-white rounded-\[2\.5rem\] p-8 sm:p-14 shadow-2xl relative overflow-hidden scroll-mt-32"\s*>\s*\{\/\* Subtle neon accents \*\/\}\s*<div className="flex flex-col lg:flex-row items-stretch justify-between gap-8 z-10 relative">\s*<div className="space-y-5 lg:max-w-\[60%\] flex flex-col justify-between">\s*<div>\s*<span className="inline-flex items-center gap-1\.5 px-3 py-1 bg-white\/10 rounded-full text-blue-200 border border-white\/5 font-mono text-\[9px\] font-bold tracking-widest uppercase mb-4">\s*SECTION 04 • \{landingData\.sponsorHeader \|\| "CONTACT US"\}\s*<\/span>\s*<h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-6">\s*\{landingData\.sponsorTitle \|\| "Contact Us"\}\s*<\/h2>\s*<p className="text-xs sm:text-sm text-slate-350 leading-relaxed font-light">\s*\{landingData\.sponsorAskDesc \|\| "Pushing the limits of robotics takes resources\. Connect with us for sponsorships, technical collaborations, or general inquiries\."\}\s*<\/p>\s*\{landingData\.sponsorBenefitDesc && \(\s*<p className="text-xs sm:text-sm text-blue-200 leading-relaxed font-normal mt-2">\s*💡 Benefit: \{landingData\.sponsorBenefitDesc\}\s*<\/p>\s*\)\}\s*<\/div>\s*\{\/\* Contact Email Highlight Row \*\/\}/;


const replacement = `{/* SECTION 4: SPONSORS */}
        {landingData.showSponsors !== false && (
        <motion.section 
          id="sponsors-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={slowFadeIn}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-14 shadow-2xl relative overflow-hidden scroll-mt-32"
        >
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-slate-800 rounded-full text-blue-600 dark:text-blue-400 font-mono text-[9px] font-bold tracking-widest uppercase mb-4 border border-blue-100 dark:border-slate-700">
              SECTION 04 • {landingData.sponsorHeader || "Sponsorship"}
            </span>
            
            <h2 className="text-3xl sm:text-5xl font-black text-[#0f2e46] dark:text-white tracking-tighter uppercase mb-8 max-w-3xl">
              {landingData.sponsorTitle || "Support the Build."}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
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
          </div>
        </motion.section>
        )}

        {/* SECTION 5: CONTACT US */}
        {landingData.showContactUs !== false && (
        <motion.section 
          id="contact-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={slowFadeIn}
          className="bg-[#0f2e46] text-white rounded-[2.5rem] p-8 sm:p-14 shadow-2xl relative overflow-hidden scroll-mt-32"
        >
          {/* Subtle neon accents */}
          
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8 z-10 relative">
            <div className="space-y-5 lg:max-w-[60%] flex flex-col justify-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-blue-200 border border-white/5 font-mono text-[9px] font-bold tracking-widest uppercase mb-4">
                  SECTION 05 • CONTACT US
                </span>
                
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-6">
                  Get in Touch
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-350 leading-relaxed font-light">
                  Pushing the limits of robotics takes resources. Connect with us for technical collaborations, media inquiries, or general questions.
                </p>
              </div>

              {/* Contact Email Highlight Row */}`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/PublicLanding.tsx', code);
    console.log("Updated PublicLanding");
} else {
    console.log("Regex didn't match.");
}
