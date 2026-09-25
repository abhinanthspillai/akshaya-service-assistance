import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Queue } from '../Queue';
import { api } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('Queue.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard metrics and strictly preserves server needs_attention order', async () => {
    const mockDashboardData = {
      status_counts: { WAITING_FOR_CENTRE: 1, UNDER_REVIEW: 1 },
      completed_today: 4,
      rejected_last_30_days: 2,
      buckets: {
        new: 3,
        in_review: 5,
        awaiting_citizen: 2,
        completed_today: 4,
        rejected_last_30_days: 2,
      },
      needs_attention: [
        {
          id: 'first-req-id-1111',
          status: 'UNDER_REVIEW',
          service_name_snapshot: 'Server Priority #1 Income Cert',
          service_type_snapshot: 'A',
          fee_snapshot: 150,
          submitted_at: '2026-09-25T01:00:00Z',
          created_at: '2026-09-25T01:00:00Z',
          updated_at: '2026-09-25T02:00:00Z',
          selected_centre_id: 'c1',
          citizen_id: 'cit1',
        },
        {
          id: 'second-req-id-2222',
          status: 'WAITING_FOR_CENTRE',
          service_name_snapshot: 'Server Priority #2 Caste Cert',
          service_type_snapshot: 'A',
          fee_snapshot: 100,
          submitted_at: '2026-09-24T10:00:00Z',
          created_at: '2026-09-24T10:00:00Z',
          updated_at: '2026-09-24T10:00:00Z',
          selected_centre_id: 'c1',
          citizen_id: 'cit2',
        },
      ],
      recent_activity: [],
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockDashboardData });

    render(
      <BrowserRouter>
        <Queue />
      </BrowserRouter>
    );

    // Verify loading transitions to content
    await waitFor(() => {
      expect(screen.getByText('Akshaya Centre Request Queue')).toBeInTheDocument();
    });

    // Verify metrics cards rendered
    expect(screen.getByText('3')).toBeInTheDocument(); // buckets.new
    expect(screen.getByText('5')).toBeInTheDocument(); // buckets.in_review
    expect(screen.getByText('4')).toBeInTheDocument(); // completed_today

    // Verify items in Needs Attention tab appear in exact server order
    const headings = screen.getAllByRole('heading', { level: 3 });
    const serviceTitles = headings.map((h) => h.textContent);
    expect(serviceTitles[0]).toBe('Server Priority #1 Income Cert');
    expect(serviceTitles[1]).toBe('Server Priority #2 Caste Cert');

    // Verify priority tags
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});
