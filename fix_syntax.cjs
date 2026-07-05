const fs = require('fs');
let content = fs.readFileSync('src/components/PublicLanding.tsx', 'utf-8');

// Revert BuildCard ending
content = content.replace(
  `    </motion.div>\n  );\n});\n\n\nconst BuildLightbox`,
  `    </motion.div>\n  );\n};\n\n\nconst BuildLightbox`
);

// Close BuildLightbox correctly
content = content.replace(
  `            referrerPolicy="no-referrer"\n          />\n        </AnimatePresence>\n      </motion.div>\n    </motion.div>\n  );\n};`,
  `            referrerPolicy="no-referrer"\n          />\n        </AnimatePresence>\n      </motion.div>\n    </motion.div>\n  );\n});`
);

fs.writeFileSync('src/components/PublicLanding.tsx', content);
