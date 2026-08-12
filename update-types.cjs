const fs = require('fs');

let dataCode = fs.readFileSync('src/components/defaultPublicLandingData.ts', 'utf8');

const sponsorInterface = `export interface SponsorInfo {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export interface PublicLandingData {`;

dataCode = dataCode.replace('export interface PublicLandingData {', sponsorInterface);

const sponsorsArray = `  socialChannels?: SocialChannel[];
  sponsors?: SponsorInfo[];`;

dataCode = dataCode.replace('  socialChannels?: SocialChannel[];', sponsorsArray);

const defaultSponsors = `  socialChannels: [
    { id: "sc-1", platform: "Instagram", url: "https://instagram.com" },
    { id: "sc-2", platform: "LinkedIn", url: "https://linkedin.com" }
  ],
  sponsors: [],`;

dataCode = dataCode.replace(`  socialChannels: [
    { id: "sc-1", platform: "Instagram", url: "https://instagram.com" },
    { id: "sc-2", platform: "LinkedIn", url: "https://linkedin.com" }
  ],`, defaultSponsors);

fs.writeFileSync('src/components/defaultPublicLandingData.ts', dataCode);
console.log("Updated defaultPublicLandingData.ts");
