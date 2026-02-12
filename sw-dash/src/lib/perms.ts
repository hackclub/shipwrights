export const PERMS = {
  certs_view: 'certs_view',
  certs_edit: 'certs_edit',
  certs_admin: 'certs_admin',
  certs_override: 'certs_override',
  certs_bounty: 'certs_bounty',
  certs_report: 'certs_report',

  users_view: 'users_view',
  users_add: 'users_add',
  users_edit: 'users_edit',
  users_admin: 'users_admin',

  assign_view: 'assign_view',
  assign_edit: 'assign_edit',
  assign_override: 'assign_override',
  assign_admin: 'assign_admin',

  support_view: 'support_view',
  support_edit: 'support_edit',
  support_admin: 'support_admin',

  payouts_view: 'payouts_view',
  payouts_edit: 'payouts_edit',
  payouts_admin: 'payouts_admin',

  ysws_view: 'ysws_view',
  ysws_edit: 'ysws_edit',
  ysws_admin: 'ysws_admin',

  eng_full: 'eng_full',
  logs_full: 'logs_full',
  analytics_view: 'analytics_view',

  billy_btn: 'billy_btn',
  joe_btn: 'joe_btn',
}

export const NO_ACCESS_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

export const ROLES = {
  megawright: {
    value: 'megawright',
    label: 'Megawright',
    perms: Object.values(PERMS),
  },
  hq: {
    value: 'hq',
    label: 'HQ',
    perms: Object.values(PERMS),
  },
  captain: {
    value: 'captain',
    label: 'Captain',
    perms: [
      PERMS.certs_admin,
      //PERMS.assign_admin,
      PERMS.support_admin,
    ],
  },
  shipwright: {
    value: 'shipwright',
    label: 'Shipwright',
    perms: [
      PERMS.certs_view,
      PERMS.certs_edit,
      PERMS.certs_report,
      //PERMS.assign_view,
      //PERMS.assign_edit,
      PERMS.support_admin,
    ],
  },
  observer: {
    value: 'observer',
    label: 'Observer',
    perms: [
      PERMS.certs_view,
      //PERMS.assign_view,
    ],
  },
  fraudster: {
    value: 'fraudster',
    label: 'Fraudster',
    perms: [
      PERMS.certs_view,
      PERMS.certs_edit,
      PERMS.certs_report,
      PERMS.support_view,
      PERMS.ysws_view,
      PERMS.ysws_edit,
      PERMS.billy_btn,
      PERMS.joe_btn,
    ],
  },
  ysws_reviewer: {
    value: 'ysws_reviewer',
    label: 'YSWS Reviewer',
    perms: [PERMS.ysws_view, PERMS.ysws_edit, PERMS.certs_view],
  },
  sw_ysws: {
    value: 'sw_ysws',
    label: 'SW + YSWS',
    perms: [
      PERMS.certs_view,
      PERMS.certs_edit,
      PERMS.certs_report,
      PERMS.support_admin,
      PERMS.ysws_view,
      PERMS.ysws_edit,
    ],
  },
}

export function can(userRole: string, perm: string): boolean {
  const role = ROLES[userRole as keyof typeof ROLES]
  if (!role) return false

  if (role.perms.includes(perm)) return true

  const permMap: Record<string, string> = {
    [PERMS.certs_view]: PERMS.certs_admin,
    [PERMS.certs_edit]: PERMS.certs_admin,
    [PERMS.certs_override]: PERMS.certs_admin,
    [PERMS.users_view]: PERMS.users_admin,
    [PERMS.users_add]: PERMS.users_admin,
    [PERMS.users_edit]: PERMS.users_admin,
    [PERMS.assign_view]: PERMS.assign_admin,
    [PERMS.assign_edit]: PERMS.assign_admin,
    [PERMS.assign_override]: PERMS.assign_admin,
    [PERMS.support_view]: PERMS.support_admin,
    [PERMS.support_edit]: PERMS.support_admin,
    [PERMS.payouts_view]: PERMS.payouts_admin,
    [PERMS.payouts_edit]: PERMS.payouts_admin,
    [PERMS.ysws_view]: PERMS.ysws_admin,
    [PERMS.ysws_edit]: PERMS.ysws_admin,
  }

  const requiredAdmin = permMap[perm]
  if (requiredAdmin && role.perms.includes(requiredAdmin)) {
    return true
  }

  return false
}

export function getRolePerms(userRole: string): string[] {
  const role = ROLES[userRole as keyof typeof ROLES]
  return role?.perms || []
}
