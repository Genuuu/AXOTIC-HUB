const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  `h-full overflow-y-auto no-scrollbar`,
  `h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`
);

fs.writeFileSync('src/App.tsx', content);
