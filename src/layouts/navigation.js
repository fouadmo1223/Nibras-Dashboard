import { FolderTree, LayoutDashboard, Settings } from 'lucide-react';

/**
 * Sidebar / command-palette navigation. Admin modules add their entries here as they
 * ship (students, courses, orders…) — nothing is listed before its page exists.
 * `permission` hides an entry from users without it (cosmetic; the API enforces access).
 */
export const NAV_GROUPS = [
  {
    key: 'workspace',
    items: [
      { key: 'overview', to: '/', icon: LayoutDashboard, end: true },
      { key: 'categories', to: '/categories', icon: FolderTree, permission: 'categories.manage' },
    ],
  },
  { key: 'system', items: [{ key: 'settings', to: '/settings', icon: Settings }] },
];

export function visibleNavGroups(permissions) {
  const granted = new Set(permissions);
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || granted.has(item.permission)) })).filter(
    (group) => group.items.length > 0,
  );
}
