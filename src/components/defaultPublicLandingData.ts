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

export interface Achievement {
  id: string;
  title: string;
  eventOrCompetition: string;
  yearOrDate?: string;
  award: string;
  description: string;
  badgeType?: "gold" | "silver" | "bronze" | "award" | "trophy";
  imageUrl?: string;
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
  achievements?: Achievement[];
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
  showAchievements?: boolean;
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
      subtitle: "High-speed wall detection, custom optical encoder arrays, and labyrinth-solving algorithms.",
      imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200, https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=1200, https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200"
    },
    {
      id: "build-combat",
      category: "Combat Robotics",
      title: "Heavy-Duty Arena Fighting Bots",
      subtitle: "Competitive horizontal spinning kinetic combat platforms with Hardox 500 armor and 6S brushless drivetrain.",
      imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200, https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=1200, https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=1200"
    }
  ],
  trackRecords: [],
  achievements: [
    {
      id: "ach-1",
      title: "National Robotics Championship",
      eventOrCompetition: "SLIIT ROBOFEST",
      yearOrDate: "2025",
      award: "1st Place Champions (Gold)",
      description: "Secured first place in the Autonomous category with sub-15 second navigation utilizing custom optical encoder arrays.",
      badgeType: "gold"
    },
    {
      id: "ach-2",
      title: "Heavyweight Arena Combat",
      eventOrCompetition: "National Combat Robotics League",
      yearOrDate: "2024",
      award: "Best Engineered Bot & Runner-Up",
      description: "Awarded Best Engineering Design for high-strength Hardox 500 armor chassis and custom 6S brushless drivetrain system.",
      badgeType: "award"
    },
    {
      id: "ach-3",
      title: "Inter-University Autonomous Challenge",
      eventOrCompetition: "IEEE Tech Challenge",
      yearOrDate: "2024",
      award: "Gold Medal - Autonomous Navigation",
      description: "Fastest autonomous solve with zero collision penalties using high-frequency sensors and adaptive PID algorithms.",
      badgeType: "gold"
    }
  ],
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
  showAchievements: true,
  showContactUs: true,
  showSponsors: true
};
