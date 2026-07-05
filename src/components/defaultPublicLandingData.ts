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
  technologies: string;
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
  galleryPhotos?: GalleryPhoto[];
  showIntro?: boolean;
  showAboutUs?: boolean;
  showBuilds?: boolean;
  showContactUs?: boolean;
}

export const defaultPublicLandingData: PublicLandingData = {
  heroTitle: "We're AXOTIC",
  heroSubtitle: "Engineering the Future of Autonomous Systems and Combat Robotics.",
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
      technologies: "Computer Vision core nodes, Real-Time Digital Signal Processing (DSP), VL53L0X Time-of-Flight (ToF) arrays."
    },
    {
      id: "build-combat",
      category: "Combat Robotics",
      title: "Heavy-Duty Arena Fighting Bots",
      subtitle: "Competitive horizontal spinning combat platforms for national events.",
      technologies: "Isolated High-Torque Brushless Motor speed control, Kinetic Energy Weapon dynamics, Hardened Steel and Carbon Fiber armor fabrication."
    }
  ],
  trackRecords: [],
  sponsorHeader: "Collaborative Sponsorship",
  sponsorTitle: "SUPPORT THE BUILD. ELEVATE OUR IMPACT.",
  sponsorAskTitle: "The Ask",
  sponsorAskDesc: "Building autonomous robots and horizontal spinner combat systems requires advanced raw substrates. We are seeking financial backers, equipment sponsors (LiPo battery arrays, brushless ESC motor units, proprietary aluminum blocks), or machining partners specializing in CNC milling or precision SLA 3D printing.",
  sponsorBenefitTitle: "The Benefit",
  sponsorBenefitDesc: "Your company, emblem, or corporate brand will get high-visibility placement across our engineered robot chassis covers, official combat apparel shirts, press media, and custom banners inside this very engineering management applet.",
  contactEmail: "axotic.kdu@gmail.com",
  socialChannels: [
    { id: "sc-1", platform: "Instagram", url: "https://instagram.com" },
    { id: "sc-2", platform: "LinkedIn", url: "https://linkedin.com" }
  ],
  galleryPhotos: [],
  showIntro: true,
  showAboutUs: true,
  showBuilds: true,
  showContactUs: true
};
