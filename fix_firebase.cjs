const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');

code = code.replace(
  'experimentalForceLongPolling: true',
  'experimentalAutoDetectLongPolling: true'
);
code = code.replace(
  'experimentalForceLongPolling: true',
  'experimentalAutoDetectLongPolling: true'
);

fs.writeFileSync('src/firebase.ts', code);
