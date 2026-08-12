const fs = require('fs');

let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const regex = /<h3 className="font-display text-xs font-bold uppercase tracking-wider">E\. Contact Us Settings<\/h3>\s*<\/div>\s*<label className="flex items-center gap-2 cursor-pointer">\s*<span className="text-\[10px\] font-bold text-slate-300 font-mono tracking-wide uppercase">Show Contact<\/span>\s*<input\s*type="checkbox"\s*checked=\{publicPageData\.showContactUs !== false\}\s*onChange=\{\(e\) => setPublicPageData\(\{ \.\.\.publicPageData, showContactUs: e\.target\.checked \}\)\}\s*className="sr-only peer"\s*\/>\s*<div className="w-7 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-\[12px\] peer-checked:after:border-white after:content-\[''\] after:absolute after:top-\[2px\] after:left-\[2px\] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative"><\/div>\s*<\/label>/;

const replacement = `<h3 className="font-display text-xs font-bold uppercase tracking-wider">E. Sponsors & Contact</h3>
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
                  </div>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminSettings.tsx', code);
    console.log("Updated AdminSettings");
} else {
    console.log("Regex didn't match.");
}
