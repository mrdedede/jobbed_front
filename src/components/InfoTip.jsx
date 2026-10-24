import { useState } from 'react';
import { ActionIcon, Popover, Text } from '@mantine/core';
import { t } from '../l10n.js';

/**
 * A small "i" button that opens a short explanation. A popover, not a hover
 * tooltip, so it works on touch screens and opens with Enter.
 *
 * @param {{label: string, children: import('react').ReactNode}} props `label`
 *     names the topic for screen readers ("About keywords").
 */
export default function InfoTip({ label, children }) {
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} withArrow width={300} position="bottom-start" shadow="md">
      <Popover.Target>
        {/* Focus stays on the button, so Escape is handled here: Mantine only
            listens for it inside the dropdown. */}
        <ActionIcon variant="subtle" color="gray" size="sm" radius="xl"
          aria-label={t('help_about', { topic: label })}
          onClick={() => setOpened((o) => !o)}
          onKeyDown={(event) => event.key === 'Escape' && setOpened(false)}>ⓘ</ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm">{children}</Text>
      </Popover.Dropdown>
    </Popover>
  );
}
