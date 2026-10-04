import { CustomRole, DEFAULT_CUSTOM_ROLES, UserRole, PermissionKey, UserProfile } from "./types";

export interface RoleBadgeStyle {
  name: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
}

export const ROLE_COLOR_MAP: Record<string, { badge: string; border: string; dot: string }> = {
  rose: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60",
    border: "border-t-rose-500",
    dot: "bg-rose-500"
  },
  blue: {
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60",
    border: "border-t-blue-500",
    dot: "bg-blue-500"
  },
  purple: {
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60",
    border: "border-t-purple-500",
    dot: "bg-purple-500"
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60",
    border: "border-t-emerald-500",
    dot: "bg-emerald-500"
  },
  amber: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60",
    border: "border-t-amber-500",
    dot: "bg-amber-500"
  },
  cyan: {
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900/60",
    border: "border-t-cyan-500",
    dot: "bg-cyan-500"
  },
  indigo: {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60",
    border: "border-t-indigo-500",
    dot: "bg-indigo-500"
  },
  slate: {
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    border: "border-t-slate-400",
    dot: "bg-slate-400"
  }
};

export function resolveMemberRole(
  customRoleId?: string,
  customRoleName?: string,
  fallbackRole: UserRole = "member",
  customRoles: CustomRole[] = DEFAULT_CUSTOM_ROLES
): RoleBadgeStyle {
  // If explicitly matching customRoleId
  if (customRoleId) {
    const found = customRoles.find(r => r.id === customRoleId);
    if (found) {
      const colors = ROLE_COLOR_MAP[found.color] || ROLE_COLOR_MAP.blue;
      return {
        name: found.name,
        badgeClass: colors.badge,
        borderClass: colors.border,
        dotClass: colors.dot
      };
    }
  }

  // If customRoleName provided and matches an active role
  if (customRoleName) {
    const found = customRoles.find(r => r.name.toLowerCase() === customRoleName.toLowerCase());
    if (found) {
      const colors = ROLE_COLOR_MAP[found.color] || ROLE_COLOR_MAP.blue;
      return {
        name: found.name,
        badgeClass: colors.badge,
        borderClass: colors.border,
        dotClass: colors.dot
      };
    }
  }

  // Fallback to active role matching clearance from customRoles
  if (fallbackRole === "admin") {
    const adminRole = customRoles.find(r => r.clearance === "admin");
    if (adminRole) {
      const colors = ROLE_COLOR_MAP[adminRole.color] || ROLE_COLOR_MAP.rose;
      return {
        name: adminRole.name,
        badgeClass: colors.badge,
        borderClass: colors.border,
        dotClass: colors.dot
      };
    }
    return {
      name: "Team Lead & Admin",
      badgeClass: ROLE_COLOR_MAP.rose.badge,
      borderClass: ROLE_COLOR_MAP.rose.border,
      dotClass: ROLE_COLOR_MAP.rose.dot
    };
  }

  if (fallbackRole === "moderator") {
    const modRole = customRoles.find(r => r.clearance === "moderator");
    if (modRole) {
      const colors = ROLE_COLOR_MAP[modRole.color] || ROLE_COLOR_MAP.purple;
      return {
        name: modRole.name,
        badgeClass: colors.badge,
        borderClass: colors.border,
        dotClass: colors.dot
      };
    }
    return {
      name: "Operations Moderator",
      badgeClass: ROLE_COLOR_MAP.purple.badge,
      borderClass: ROLE_COLOR_MAP.purple.border,
      dotClass: ROLE_COLOR_MAP.purple.dot
    };
  }

  const memberRole = customRoles.find(r => r.clearance === "member") || customRoles.find(r => r.clearance !== "admin") || customRoles[0];
  if (memberRole) {
    const colors = ROLE_COLOR_MAP[memberRole.color] || ROLE_COLOR_MAP.blue;
    return {
      name: memberRole.name,
      badgeClass: colors.badge,
      borderClass: colors.border,
      dotClass: colors.dot
    };
  }

  return {
    name: "Core Engineer",
    badgeClass: ROLE_COLOR_MAP.blue.badge,
    borderClass: ROLE_COLOR_MAP.blue.border,
    dotClass: ROLE_COLOR_MAP.blue.dot
  };
}

export function getClearanceBadge(role: UserRole): { text: string; badgeClass: string } {
  switch (role) {
    case "admin":
      return {
        text: "Master Admin",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60"
      };
    case "moderator":
      return {
        text: "Moderator",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60"
      };
    case "member":
    default:
      return {
        text: "Standard Member",
        badgeClass: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      };
  }
}

export function hasPermission(
  user?: UserProfile | null,
  permission?: PermissionKey,
  customRoles: CustomRole[] = DEFAULT_CUSTOM_ROLES
): boolean {
  if (!user || !permission) return false;

  // Master Admin has all permissions unconditionally
  if (user.role === "admin" || user.email?.toLowerCase() === "genukakisara@gmail.com") {
    return true;
  }

  // Look up custom role
  const role = customRoles.find(
    r => r.id === user.customRoleId || 
    (user.customRoleName && r.name.toLowerCase() === user.customRoleName.toLowerCase()) ||
    (!user.customRoleId && !user.customRoleName && r.id === user.role)
  );

  if (role && role.permissions && Array.isArray(role.permissions)) {
    return role.permissions.includes(permission);
  }

  // Default fallback for moderator vs member
  if (user.role === "moderator") {
    return [
      "manage_projects",
      "manage_inventory",
      "manage_competitions",
      "manage_ideas",
      "manage_tags",
      "manage_members"
    ].includes(permission);
  }

  return false;
}
