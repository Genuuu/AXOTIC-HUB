const fs = require('fs');

// 1. Update PublicLanding.tsx (Section 3 text removal)
let landingCode = fs.readFileSync('src/components/PublicLanding.tsx', 'utf8');

const regex1 = /<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed hidden md:block">\s*Click on any build module block below to view its classification specifications in detail\.\s*<\/p>/;
const regex2 = /<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed block md:hidden">\s*Tap any build module below to view its full specifications\.\s*<\/p>/;

landingCode = landingCode.replace(regex1, '');
landingCode = landingCode.replace(regex2, '');

fs.writeFileSync('src/components/PublicLanding.tsx', landingCode);

// 2. Update defaultPublicLandingData.ts
let dataCode = fs.readFileSync('src/components/defaultPublicLandingData.ts', 'utf8');

const oldAsk = /sponsorAskDesc:\s*"Building autonomous robots and horizontal spinner combat systems requires advanced raw substrates\. We are seeking financial backers, equipment sponsors \(LiPo battery arrays, brushless ESC motor units, proprietary aluminum blocks\), or machining partners specializing in CNC milling or precision SLA 3D printing\.",/;

const newAsk = 'sponsorAskDesc: "Developing competitive autonomous robots and advanced combat systems requires high-quality engineering resources. We are actively seeking financial backers, equipment sponsors (such as high-performance battery arrays, brushless ESCs, and aerospace-grade aluminum), and manufacturing partners with expertise in CNC machining or precision SLA 3D printing.",';

const oldBenefit = /sponsorBenefitDesc:\s*"Your company, emblem, or corporate brand will get high-visibility placement across our engineered robot chassis covers, official combat apparel shirts, press media, and custom banners inside this very engineering management applet\.",/;

const newBenefit = 'sponsorBenefitDesc: "In recognition of your support, your organization\'s brand will receive prominent, high-visibility placement across our competition robot chassis, official team apparel, press materials, and integrated digital platforms.",';

dataCode = dataCode.replace(oldAsk, newAsk);
dataCode = dataCode.replace(oldBenefit, newBenefit);

fs.writeFileSync('src/components/defaultPublicLandingData.ts', dataCode);

console.log("Done");
