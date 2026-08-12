export interface SubTeam {
  id: string;
  title: string;
  description: string;
  iconType: "layers" | "cpu" | "compass" | "wrench" | "settings";
}

export interface BuildSpec {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
}

export interface TrackRecord {
  id: string;
  badge: string;
  title: string;
  description: string;
  statusTag: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption?: string;
}


export interface SocialChannel {
  id: string;
  platform: string;
  url: string;
}

export interface SponsorInfo {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export interface PublicLandingData {
  heroTitle: string;
  heroSubtitle: string;
  whoWeAreOriginTitle: string;
  whoWeAreOriginDesc: string;
  whoWeAreMissionTitle: string;
  whoWeAreMissionDesc: string;
  subTeams: SubTeam[];
  buildSpecs: BuildSpec[];
  trackRecords: TrackRecord[];
  sponsorHeader: string;
  sponsorTitle: string;
  sponsorAskTitle: string;
  sponsorAskDesc: string;
  sponsorBenefitTitle: string;
  sponsorBenefitDesc: string;
  contactEmail: string;
  socialChannels?: SocialChannel[];
  sponsors?: SponsorInfo[];
  galleryPhotos?: GalleryPhoto[];
  showIntro?: boolean;
  showAboutUs?: boolean;
  showBuilds?: boolean;
  showContactUs?: boolean;
  showSponsors?: boolean;
}

export const defaultPublicLandingData: PublicLandingData = {
  heroTitle: "We're AXOTIC",
  heroSubtitle: "",
  whoWeAreOriginTitle: "About Us",
  whoWeAreOriginDesc: "We are a team of Electrical, Mechanical, and Biomedical engineering undergraduates. We bridge the gap between theoretical coursework and high-stakes arena competitions, working together to design, fabricate, and program advanced robotics from the ground up.",
  whoWeAreMissionTitle: "",
  whoWeAreMissionDesc: "",
  subTeams: [],
  buildSpecs: [
    {
      id: "build-auto",
      category: "Autonomous Systems",
      title: "Micromouse & High-Speed Line Followers",
      subtitle: "High-speed wall detection and labyrinth-solving vehicles.",
    },
    {
      id: "build-combat",
      category: "Combat Robotics",
      title: "Heavy-Duty Arena Fighting Bots",
      subtitle: "Competitive horizontal spinning combat platforms for national events.",
    }
  ],
  trackRecords: [],
  sponsorHeader: "Collaborative Sponsorship",
  sponsorTitle: "SUPPORT THE BUILD. ELEVATE OUR IMPACT.",
  sponsorAskTitle: "The Ask",
  sponsorAskDesc: "Developing competitive autonomous robots and advanced combat systems requires high-quality engineering resources. We are actively seeking financial backers, equipment sponsors, and manufacturing partners with expertise in CNC machining or precision SLA 3D printing.",
  sponsorBenefitTitle: "The Benefit",
  sponsorBenefitDesc: "In recognition of your support, your organization's brand will receive prominent, high-visibility placement across our competition robot chassis, official team apparel, press materials, and integrated digital platforms.",
  contactEmail: "axotic.kdu@gmail.com",
  socialChannels: [
    { id: "sc-1", platform: "Instagram", url: "https://instagram.com" },
    { id: "sc-2", platform: "LinkedIn", url: "https://linkedin.com" }
  ],
  sponsors: [],
  galleryPhotos: [],
  showIntro: true,
  showAboutUs: true,
  showBuilds: true,
  showContactUs: true,
  showSponsors: true
};
