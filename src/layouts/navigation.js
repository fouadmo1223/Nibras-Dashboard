import { BookOpen, FolderTree, GraduationCap, LayoutDashboard, Settings } from 'lucide-react';

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
      { key: 'instructors', to: '/instructors', icon: GraduationCap, permission: 'instructors.manage' },
      { key: 'courses', to: '/courses', icon: BookOpen, permission: 'courses.manage' },
      // Only for an instructor who can manage their own courses' curriculum but not the whole
      // catalog — an admin already sees "courses" above and doesn't need this one too.
      { key: 'myCourses', to: '/my-courses', icon: BookOpen, show: (granted) => granted.has('courses.manage.own') && !granted.has('courses.manage') },
    ],
  },
  { key: 'system', items: [{ key: 'settings', to: '/settings', icon: Settings }] },
];

export function visibleNavGroups(permissions) {
  const granted = new Set(permissions);
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.show ? item.show(granted) : !item.permission || granted.has(item.permission))),
  })).filter((group) => group.items.length > 0);
}
