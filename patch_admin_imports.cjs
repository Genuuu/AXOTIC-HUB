const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const additionalIcons = ['PackageOpen', 'Lightbulb', 'Compass', 'Trophy', 'Trash2'];
additionalIcons.forEach(icon => {
  if (!code.includes(icon + ',')) {
    code = code.replace(
      '} from "lucide-react";',
      `  ${icon},\n} from "lucide-react";`
    );
  }
});

fs.writeFileSync('src/components/AdminSettings.tsx', code);
