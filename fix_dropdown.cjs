const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

code = code.replace(
  '<option value="">Who paid?</option>',
  '<option value="">Who paid?</option>\n                                  <option value="general_fund">General Fund</option>'
);

fs.writeFileSync('src/components/ProjectHub.tsx', code);
