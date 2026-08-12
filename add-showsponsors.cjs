const fs = require('fs');

let typesCode = fs.readFileSync('src/types.ts', 'utf8');
typesCode = typesCode.replace(/showContactUs\?: boolean;/g, 'showContactUs?: boolean;\n  showSponsors?: boolean;');
fs.writeFileSync('src/types.ts', typesCode);

let dataCode = fs.readFileSync('src/components/defaultPublicLandingData.ts', 'utf8');
dataCode = dataCode.replace(/showContactUs\?: boolean;/g, 'showContactUs?: boolean;\n  showSponsors?: boolean;');
dataCode = dataCode.replace(/showContactUs: true/g, 'showContactUs: true,\n  showSponsors: true');
fs.writeFileSync('src/components/defaultPublicLandingData.ts', dataCode);

