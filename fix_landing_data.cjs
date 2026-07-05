const fs = require('fs');

let content = fs.readFileSync('src/components/defaultPublicLandingData.ts', 'utf-8');

const newInterfaces = `
export interface SocialChannel {
  id: string;
  platform: string;
  url: string;
}

export interface PublicLandingData {`;

content = content.replace('export interface PublicLandingData {', newInterfaces);

const newFields = `  contactEmail: string;
  socialChannels?: SocialChannel[];`;

content = content.replace('  contactEmail: string;', newFields);

const newDefaults = `  contactEmail: "axotic.kdu@gmail.com",
  socialChannels: [
    { id: "sc-1", platform: "Instagram", url: "https://instagram.com" },
    { id: "sc-2", platform: "LinkedIn", url: "https://linkedin.com" }
  ],`;

content = content.replace('  contactEmail: "axotic.kdu@gmail.com",', newDefaults);

fs.writeFileSync('src/components/defaultPublicLandingData.ts', content);
console.log('Fixed defaultPublicLandingData.ts');
