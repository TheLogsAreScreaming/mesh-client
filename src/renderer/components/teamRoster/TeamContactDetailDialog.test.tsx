import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { hydrateAxeThemeColors } from '@/renderer/lib/a11yTestHelpers';
import type { MemberPresenceSnapshot } from '@/renderer/lib/teamRoster/contactPresence';
import type { TeamMember } from '@/shared/teamRosterTypes';

import { TeamContactDetailDialog } from './TeamContactDetailDialog';

const member: TeamMember = {
  unitId: 3,
  callsign: 'Charlie',
  role: 'GATE',

  isSelf: false,
  onRoster: true,
  createdAt: 1,
  updatedAt: 1,
  links: [
    { protocol: 'meshtastic', durableKey: '10', nodeId: 10, longName: 'C-MT', onRoster: false },
    { protocol: 'meshcore', durableKey: '20', nodeId: 20, longName: 'C-MC', onRoster: true },
  ],
};

const meshtasticLink = member.links[0];
const meshcoreLink = member.links[1];

const presence: MemberPresenceSnapshot = {
  unitId: 3,
  aggregateStatus: 'online',
  lastActive: {
    link: meshcoreLink,
    peerNodeId: 20,
    lastHeardMs: 200,
    status: 'online',
    displayName: 'C-MC',
  },
  links: [
    {
      link: meshtasticLink,
      peerNodeId: 10,
      lastHeardMs: 50,
      status: 'stale',
      displayName: 'C-MT',
    },
    {
      link: meshcoreLink,
      peerNodeId: 20,
      lastHeardMs: 200,
      status: 'online',
      displayName: 'C-MC',
    },
  ],
};

describe('TeamContactDetailDialog', () => {

});
