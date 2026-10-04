export type UserRole = "admin" | "moderator" | "member";

export type PermissionKey =
  | "system_settings"
  | "manage_roles"
  | "manage_members"
  | "manage_treasury"
  | "view_audit_logs"
  | "manage_projects"
  | "manage_inventory"
  | "manage_competitions"
  | "manage_tags"
  | "manage_ideas";

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  category: "Administration" | "Robotics Operations" | "Knowledge & Community";
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "system_settings",
    label: "System Settings",
    description: "Modify workspace name, branding logo, return policies, and public landing page",
    category: "Administration"
  },
  {
    key: "manage_roles",
    label: "Role & Permission Governance",
    description: "Create, edit, and delete custom roles, and configure role permission matrix",
    category: "Administration"
  },
  {
    key: "manage_members",
    label: "Member Management",
    description: "Onboard new students/mentors, edit member profiles, and assign roles",
    category: "Administration"
  },
  {
    key: "manage_treasury",
    label: "Treasury & General Fund",
    description: "Deposit funds, record manual transactions, and manage financial ledgers",
    category: "Administration"
  },
  {
    key: "view_audit_logs",
    label: "Audit Logs",
    description: "Access confidential operations security logs and system activity trails",
    category: "Administration"
  },
  {
    key: "manage_projects",
    label: "Project Management",
    description: "Create projects, modify budgets, update status, and manage team allocations",
    category: "Robotics Operations"
  },
  {
    key: "manage_inventory",
    label: "Inventory & Categories",
    description: "Add new stockroom parts, edit component specs, and create categories",
    category: "Robotics Operations"
  },
  {
    key: "manage_competitions",
    label: "Competition Registry",
    description: "Create competitions, register team participants, and log official records",
    category: "Robotics Operations"
  },
  {
    key: "manage_tags",
    label: "Specialty & Division Tags",
    description: "Create, customize, and assign engineering specialty tags and divisions",
    category: "Knowledge & Community"
  },
  {
    key: "manage_ideas",
    label: "Ideas & Proposals",
    description: "Promote build proposals to active projects and moderate concept discussions",
    category: "Knowledge & Community"
  }
];

export const DEFAULT_SPECIALTY_TAGS: string[] = [];

export const DEFAULT_DIVISION_TAGS: string[] = [
  "Hardware & Electronics",
  "Mechanical & CAD",
  "Embedded & Firmware",
  "Business & Outreach",
  "General"
];

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  color: "rose" | "blue" | "purple" | "emerald" | "amber" | "cyan" | "indigo" | "slate";
  clearance: UserRole;
  permissions: PermissionKey[];
  isSystem?: boolean;
}

export const DEFAULT_CUSTOM_ROLES: CustomRole[] = [
  {
    id: "admin",
    name: "Team Lead & Admin",
    description: "Executive team lead with full master administrative clearance and system authority",
    color: "rose",
    clearance: "admin",
    permissions: [
      "system_settings",
      "manage_roles",
      "manage_members",
      "manage_treasury",
      "view_audit_logs",
      "manage_projects",
      "manage_inventory",
      "manage_competitions",
      "manage_tags",
      "manage_ideas"
    ],
    isSystem: true
  },
  {
    id: "moderator",
    name: "Operations Moderator",
    description: "Elevated management clearance to direct operations, projects, parts, and competitions",
    color: "purple",
    clearance: "moderator",
    permissions: [
      "manage_projects",
      "manage_inventory",
      "manage_competitions",
      "manage_ideas",
      "manage_tags",
      "manage_members"
    ],
    isSystem: false
  },
  {
    id: "core_engineer",
    name: "Core Engineer",
    description: "Core robotics engineering division member architecting mission-critical robot systems",
    color: "blue",
    clearance: "member",
    permissions: [
      "manage_projects",
      "manage_inventory",
      "manage_ideas"
    ],
    isSystem: false
  },
  {
    id: "software_lead",
    name: "Lead Software Engineer",
    description: "Directs autonomous navigation, ROS nodes, path planning, and computer vision algorithms",
    color: "indigo",
    clearance: "moderator",
    permissions: [
      "manage_projects",
      "manage_inventory",
      "manage_ideas",
      "manage_tags"
    ],
    isSystem: false
  },
  {
    id: "hardware_lead",
    name: "Hardware & Electrical Lead",
    description: "Designs custom PCBs, power distribution systems, sensors, and actuator circuits",
    color: "amber",
    clearance: "moderator",
    permissions: [
      "manage_projects",
      "manage_inventory",
      "manage_ideas",
      "manage_tags"
    ],
    isSystem: false
  },
  {
    id: "mechanical_lead",
    name: "Mechanical & CAD Engineer",
    description: "Engineers robot chassis structure, drivetrains, kinematics, and rapid CAD fabrication",
    color: "cyan",
    clearance: "member",
    permissions: [
      "manage_projects",
      "manage_inventory",
      "manage_ideas"
    ],
    isSystem: false
  },
  {
    id: "specialist",
    name: "Robotics Specialist",
    description: "Specialized researcher in control theory, sensor fusion, SLAM, and embedded algorithms",
    color: "emerald",
    clearance: "member",
    permissions: [
      "manage_projects",
      "manage_inventory",
      "manage_ideas"
    ],
    isSystem: false
  },
  {
    id: "member",
    name: "Junior Engineer / Apprentice",
    description: "Undergraduate student developer and robotics apprentice working on team projects",
    color: "slate",
    clearance: "member",
    permissions: [
      "manage_ideas"
    ],
    isSystem: false
  },
  {
    id: "mentor",
    name: "Mentor / Alumni Advisor",
    description: "Senior advisor, graduated robotics engineer, or technical faculty mentor",
    color: "purple",
    clearance: "moderator",
    permissions: [
      "manage_projects",
      "manage_competitions",
      "manage_ideas"
    ],
    isSystem: false
  }
];

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  customRoleId?: string;
  customRoleName?: string;
  avatarUrl: string;
  joinedAt: string;
  subTeam: string;
  phoneNumber?: string;
  isOfflineMock?: boolean;
  specifications?: string;
  birthday?: string;
  password?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
  homepageUrl?: string;
}

export type ProjectStatus = "Planning" | "Fabricating" | "Testing" | "Finished" | "Continuous";

export interface BudgetItem {
  id: string;
  name: string;
  unitCost: number;
  quantity: number;
  paidById: string; // member who provided funding
}

export interface GeneralFundAllocation {
  id: string;
  allocationName: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

export interface MemberContribution {
  id: string;
  memberId: string;
  amount: number;
  notes?: string;
  type: "reimbursable" | "donation";
  createdAt: string;
}

export interface PeerTransfer {
  id: string;
  id_? : string; // keeping compatible
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  leaderId: string;
  leaderName: string;
  memberIds: string[];
  memberNames: string[];
  deadline?: string;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  kicadLink?: string;
  budget?: number;
  estimatedCost?: number;
  costSplitType?: "equal" | "custom";
  memberCostSplits?: { [userId: string]: number };
  budgetItems?: BudgetItem[];
  generalFundAllocations?: GeneralFundAllocation[];
  memberContributions?: MemberContribution[];
  peerTransfers?: PeerTransfer[];
}

export interface ProjectLog {
  id: string;
  projectId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  location: string;
  specification: string;
}

export interface AllocatedHardware {
  id: string; // matches inventory item id or unique id
  name: string;
  category: string;
  quantity: number;
  allocatedBy: string;
  allocatedByName: string;
  allocatedAt: string;
}

export type IdeaStatus = "Pending" | "Discussing" | "Promoted";

export interface IdeaComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category?: string;
  createdBy: string;
  creatorName: string;
  creatorAvatar: string;
  createdAt: string;
  updatedAt: string;
  votes: number;
  votedIds: string[];
  status: IdeaStatus;
  promotedProjectId?: string;
  comments?: IdeaComment[];
}

export interface AppNotification {
  id: string;
  message: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  type: "idea_created" | "project_created" | "comment_added" | "competition_created" | "competition_reminder";
  linkId?: string; // e.g., idea id or project id
  readBy: string[]; // array of userIds who have read it
}

export type CompetitionType = "Battlebot" | "Micromouse" | "Task Robot" | "IOT" | "Idea pitch" | "Other";

export interface CompetitionResult {
  memberId: string;
  placement: string;
  award?: string;
  notes?: string;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  link?: string;
  type?: CompetitionType;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  remindUserIds: string[]; // array of userIds who want to be reminded
  isRegistered: boolean; // whether our team is registered for this competition
  registeredName?: string; // official registration name of the team, if registered
  registeredUserIds: string[]; // array of userIds of team members registered to attend/participate
  status?: "scheduled" | "postponed" | "cancelled" | "finished";
  results?: CompetitionResult[];
  teamPlacement?: string;
  teamMedals?: string;
  prizeMoney?: number;
}

export interface AdminLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedByName: string;
  performedByEmail: string;
  createdAt: string;
}



export interface GeneralFundTransaction {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  notes: string;
  date: string;
  recordedBy: string;
}
