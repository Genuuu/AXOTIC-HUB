const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

code = code.replace(
  '{/* Metrics Card A: Ongoing Projects */}\n        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">',
  '{/* Metrics Card A: Ongoing Projects */}\n        <motion.div\n          initial={{ opacity: 0, y: 20 }}\n          animate={{ opacity: 1, y: 0 }}\n          transition={{ duration: 0.4, delay: 0.1 }}\n          className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all"\n        >'
);

code = code.replace(
  '{/* Metrics Card B: Total General Fund Allocations */}\n        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">',
  '{/* Metrics Card B: Total General Fund Allocations */}\n        <motion.div\n          initial={{ opacity: 0, y: 20 }}\n          animate={{ opacity: 1, y: 0 }}\n          transition={{ duration: 0.4, delay: 0.2 }}\n          className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all"\n        >'
);

code = code.replace(
  '{/* Metrics Card C: Low-Stock Shortfalls */}\n        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">',
  '{/* Metrics Card C: Low-Stock Shortfalls */}\n        <motion.div\n          initial={{ opacity: 0, y: 20 }}\n          animate={{ opacity: 1, y: 0 }}\n          transition={{ duration: 0.4, delay: 0.3 }}\n          className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all"\n        >'
);

code = code.replace(
  '{/* Metrics Card D: Active Team Specialists */}\n        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all">',
  '{/* Metrics Card D: Active Team Specialists */}\n        <motion.div\n          initial={{ opacity: 0, y: 20 }}\n          animate={{ opacity: 1, y: 0 }}\n          transition={{ duration: 0.4, delay: 0.4 }}\n          className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-3xs hover:shadow-2xs transition-all"\n        >'
);

// We must also replace the closing divs of these four cards.
// Card A
code = code.replace(
  '          </div>\n        </div>\n\n        {/* Metrics Card B:',
  '          </div>\n        </motion.div>\n\n        {/* Metrics Card B:'
);

// Card B
code = code.replace(
  '          </div>\n        </div>\n\n        {/* Metrics Card C:',
  '          </div>\n        </motion.div>\n\n        {/* Metrics Card C:'
);

// Card C
code = code.replace(
  '          </div>\n        </div>\n\n        {/* Metrics Card D:',
  '          </div>\n        </motion.div>\n\n        {/* Metrics Card D:'
);

// Card D
code = code.replace(
  '          </div>\n        </div>\n      </div>\n\n      {/* 3. CO-LAYOUT COLUMNS */}',
  '          </div>\n        </motion.div>\n      </div>\n\n      {/* 3. CO-LAYOUT COLUMNS */}'
);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
