const fs = require('fs');
let dataCode = fs.readFileSync('src/components/defaultPublicLandingData.ts', 'utf8');

const oldAsk = /sponsorAskDesc: "Developing competitive autonomous robots and advanced combat systems requires high-quality engineering resources\. We are actively seeking financial backers, equipment sponsors \(such as high-performance battery arrays, brushless ESCs, and aerospace-grade aluminum\), and manufacturing partners with expertise in CNC machining or precision SLA 3D printing\.",/;
const newAsk = 'sponsorAskDesc: "Developing competitive autonomous robots and advanced combat systems requires high-quality engineering resources. We are actively seeking financial backers, equipment sponsors, and manufacturing partners with expertise in CNC machining or precision SLA 3D printing.",';

dataCode = dataCode.replace(oldAsk, newAsk);
fs.writeFileSync('src/components/defaultPublicLandingData.ts', dataCode);

console.log("Updated");
