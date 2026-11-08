import {
  CircleQuestionMark,
  Clock,
  Crosshair,
  Ghost,
  House,
  LifeBuoy,
  MapPin,
  Repeat,
  Router,
  Target,
  Thermometer,
  User,
  UserCog,
  UserX,
} from 'lucide-react-motion';
import { useTranslation } from 'react-i18next';

import { useIconTrigger } from '@/renderer/lib/icons/iconMotionContext';

interface RoleInfo {
  labelKey: string;
  labelParams?: Record<string, string | number>;
  colorClass: string;
  isBadge: boolean;
  badgeClass?: string;
}

const ROLE_INFO: Record<number, RoleInfo> = {
  0: { labelKey: 'roleInfo.roles.client', colorClass: 'text-ink-400', isBadge: false },
  1: { labelKey: 'roleInfo.roles.clientMute', colorClass: 'text-muted', isBadge: false },
  2: { labelKey: 'roleInfo.roles.router', colorClass: 'text-ink-400', isBadge: false },
  3: { labelKey: 'roleInfo.roles.routerClient', colorClass: 'text-info-400', isBadge: false },
  4: {
    labelKey: 'roleInfo.roles.repeater',
    colorClass: 'text-warning-400',
    isBadge: true,
    badgeClass: 'bg-warning-900/60 text-warning-300 border border-warning-700/40',
  },
  5: { labelKey: 'roleInfo.roles.tracker', colorClass: 'text-success-400', isBadge: false },
  6: { labelKey: 'roleInfo.roles.sensor', colorClass: 'text-teal-400', isBadge: false },
  7: {
    labelKey: 'roleInfo.roles.tak',
    colorClass: 'text-danger-400',
    isBadge: true,
    badgeClass: 'bg-danger-900/60 text-danger-300 border border-danger-700/40',
  },
  8: { labelKey: 'roleInfo.roles.clientHidden', colorClass: 'text-purple-400', isBadge: false },
  9: {
    labelKey: 'roleInfo.roles.lostAndFound',
    colorClass: 'text-pink-300',
    isBadge: true,
    badgeClass: 'bg-pink-900/60 text-pink-300 border border-pink-700/40',
  },
  10: {
    labelKey: 'roleInfo.roles.takTracker',
    colorClass: 'text-danger-300',
    isBadge: true,
    badgeClass: 'bg-danger-950/70 text-danger-200 border border-danger-800/50',
  },
  11: { labelKey: 'roleInfo.roles.routerLate', colorClass: 'text-ink-400', isBadge: false },
  12: { labelKey: 'roleInfo.roles.clientBase', colorClass: 'text-ink-400', isBadge: false },
};

export function getRoleInfo(role: number | undefined): RoleInfo {
  if (role !== undefined && role in ROLE_INFO) return ROLE_INFO[role];
  return {
    labelKey: role !== undefined ? 'roleInfo.unknownRole' : 'roleInfo.placeholderDash',
    labelParams: role !== undefined ? { role } : undefined,
    colorClass: 'text-muted',
    isBadge: false,
  };
}

export function RoleIcon({ role }: { role: number | undefined }) {
  const trigger = useIconTrigger();
  const p = { 'aria-hidden': true as const, className: 'w-3.5 h-3.5', trigger, size: 14 };

  switch (role) {
    case 0:
      return <User {...p} />;
    case 1:
      return <UserX {...p} />;
    case 2:
      return <Router {...p} />;
    case 3:
      return <UserCog {...p} />;
    case 4:
      return <Repeat {...p} />;
    case 5:
      return <MapPin {...p} />;
    case 6:
      return <Thermometer {...p} />;
    case 7:
      return <Crosshair {...p} />;
    case 8:
      return <Ghost {...p} />;
    case 9:
      return <LifeBuoy {...p} />;
    case 10:
      return <Target {...p} />;
    case 11:
      return <Clock {...p} />;
    case 12:
      return <House {...p} />;
    default:
      return <CircleQuestionMark {...p} />;
  }
}

export function RoleDisplay({ role }: { role: number | undefined }) {
  const { t } = useTranslation();
  if (role === undefined) {
    return <span className="text-ink-600 text-label">{t('roleInfo.placeholderDash')}</span>;
  }
  const info = getRoleInfo(role);
  if (info.isBadge && info.badgeClass) {
    return (
      <span
        className={`text-label inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${info.badgeClass}`}
      >
        <RoleIcon role={role} />
        {t(info.labelKey, info.labelParams ?? undefined)}
      </span>
    );
  }
  return (
    <span className={`text-label inline-flex items-center gap-1 ${info.colorClass}`}>
      <RoleIcon role={role} />
      {t(info.labelKey, info.labelParams ?? undefined)}
    </span>
  );
}
