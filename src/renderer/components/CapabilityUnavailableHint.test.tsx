import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { hydrateAxeThemeColors } from '@/renderer/lib/a11yTestHelpers';
import {
  MESHCORE_CAPABILITIES,
  MESHTASTIC_CAPABILITIES,
} from '@/renderer/lib/radio/BaseRadioProvider';

import CapabilityUnavailableHint from './CapabilityUnavailableHint';

describe('CapabilityUnavailableHint', () => {
  it('renders nothing when the feature is available', () => {
    const { container } = render(
      <CapabilityUnavailableHint feature="shutdown" capabilities={MESHTASTIC_CAPABILITIES} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a reason when only the handler is missing', () => {
    render(
      <CapabilityUnavailableHint
        id="hint"
        feature="rebootOta"
        capabilities={MESHCORE_CAPABILITIES}
        handlerMissing
      />,
    );
    expect(screen.getByRole('note')).toHaveAttribute('id', 'hint');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <CapabilityUnavailableHint feature="factoryReset" capabilities={MESHCORE_CAPABILITIES} />,
    );
    hydrateAxeThemeColors(container);
    expect(await axe(container)).toHaveNoViolations();
  });
});
