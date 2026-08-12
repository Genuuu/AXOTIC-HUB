const fs = require('fs');

let code = fs.readFileSync('src/components/PublicLanding.tsx', 'utf8');

const regex1 = /\{?\['Intro', 'About Us', 'Our Builds', 'Contact'\]\.map\(\(item\) => \{/g;
const replacement1 = `{['Intro', 'About Us', 'Our Builds', 'Sponsors', 'Contact'].map((item) => {`;

const regex2 = /\(item === 'Contact' && landingData\.showContactUs !== false\);/g;
const replacement2 = `(item === 'Sponsors' && landingData.showSponsors !== false) ||
              (item === 'Contact' && landingData.showContactUs !== false);`;

const regex3 = /const id = item === 'Contact' \? 'contact-section' : item === 'Our Builds' \? 'builds-section' : item === 'About Us' \? 'about-section' : 'intro-section';/g;
const replacement3 = `const id = item === 'Contact' ? 'contact-section' : item === 'Sponsors' ? 'sponsors-section' : item === 'Our Builds' ? 'builds-section' : item === 'About Us' ? 'about-section' : 'intro-section';`;

code = code.replace(regex1, replacement1);
code = code.replace(regex2, replacement2);
code = code.replace(regex3, replacement3);

fs.writeFileSync('src/components/PublicLanding.tsx', code);
console.log("Updated Nav");
