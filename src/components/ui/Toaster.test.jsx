import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import I18nProvider from '@/i18n/I18nProvider';
import { toast, useToastStore } from '@/stores/toast-store';
import Toaster from './Toaster';

describe('Toaster', () => {
  it('shows API messages with the right role and can be dismissed', async () => {
    render(
      <I18nProvider locale="en">
        <Toaster />
      </I18nProvider>,
    );
    act(() => {
      toast.success('Welcome back, Ada.');
      toast.error('Incorrect email or password.');
    });

    expect(screen.getByRole('status')).toHaveTextContent('Welcome back, Ada.');
    expect(screen.getByRole('alert')).toHaveTextContent('Incorrect email or password.');

    await userEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});
