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
}

export type ProjectStatus = "Planning" | "Fabricating" | "Testing" | "Finished";

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

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  createdBy: string;
  creatorName: string;
  creatorAvatar: string;
  createdAt: string;
  updatedAt: string;
  votes: number;
  votedIds: string[];
  status: IdeaStatus;
  promotedProjectId?: string;
}

