export type UserRole = "member" | "admin";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
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
}

export type ProjectStatus = "Planning" | "Fabricating" | "Testing" | "Finished" | "Continuous";

export interface BudgetItem {
  id: string;
  name: string;
  unitCost: number;
  quantity: number;
  paidById: string; // member who provided funding
}

export interface SponsorFunding {
  id: string;
  sponsorName: string;
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
  sponsorFundings?: SponsorFunding[];
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

export interface Competition {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  link?: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  remindUserIds: string[]; // array of userIds who want to be reminded
  isRegistered: boolean; // whether our team is registered for this competition
  registeredName?: string; // official registration name of the team, if registered
  registeredUserIds: string[]; // array of userIds of team members registered to attend/participate
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


