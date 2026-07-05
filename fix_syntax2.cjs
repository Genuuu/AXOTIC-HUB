const fs = require('fs');
let content = fs.readFileSync('src/components/PublicLanding.tsx', 'utf-8');

// Replace the end of BuildLightbox
content = content.replace(
  `      </motion.div>\n    </motion.div>\n  );\n};\n\nexport default function PublicLanding`,
  `      </motion.div>\n    </motion.div>\n  );\n});\n\nexport default function PublicLanding`
);

fs.writeFileSync('src/components/PublicLanding.tsx', content);
