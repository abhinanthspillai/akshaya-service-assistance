import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequestWorkspace } from '../RequestWorkspace';
import { api } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('RequestWorkspace.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRequestData = {
    id: 'req-uuid-1234',
    service_id: 'serv-1',
    status: 'UNDER_REVIEW',
    service_name_snapshot: 'Income Certificate Service',
    service_type_snapshot: 'DOCUMENT_VERIFICATION',
    fee_snapshot: 150,
    submitted_at: '2026-09-25T01:00:00Z',
    completed_at: null,
    cancelled_at: null,
    created_at: '2026-09-25T01:00:00Z',
    updated_at: '2026-09-25T02:00:00Z',
    citizen_id: 'cit-uuid-1',
    selected_centre_id: 'centre-uuid-1',
  };

  const mockHistoryData = [
    {
      id: 'hist-1',
      action: 'start_review',
      from_status: 'ACCEPTED',
      to_status: 'UNDER_REVIEW',
      note: 'Employee started review',
      created_at: '2026-09-25T02:00:00Z',
      actor_id: 'emp-uuid-1',
    },
  ];

  const mockDocsData = [
    {
      id: 'doc-uuid-1',
      original_filename: 'ration_card.pdf',
      requirement_id: 'req-doc-1',
      content_type: 'application/pdf',
      size_bytes: 10240,
      version: 2,
      is_current: true,
      uploaded_at: '2026-09-25T01:30:00Z',
    },
  ];

  const mockServiceData = {
    id: 'serv-1',
    name: 'Income Certificate Service',
    interaction_requirements: [],
  };

  it('renders workspace details, re-uploaded document badge, and opens correction modal', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/requests/req-uuid-1234') return Promise.resolve({ data: mockRequestData });
      if (url === '/requests/req-uuid-1234/history') return Promise.resolve({ data: mockHistoryData });
      if (url === '/requests/req-uuid-1234/documents') return Promise.resolve({ data: mockDocsData });
      if (url === '/requests/req-uuid-1234/document-reviews') return Promise.resolve({ data: [] });
      if (url === '/services/serv-1') return Promise.resolve({ data: mockServiceData });
      if (url === '/requests/req-uuid-1234/interactions') return Promise.resolve({ data: [] });
      if (url === '/requests/req-uuid-1234/messages') return Promise.resolve({ data: [] });
      if (url === '/requests/req-uuid-1234/payments') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={['/employee/requests/req-uuid-1234']}>
        <Routes>
          <Route path="/employee/requests/:id" element={<RequestWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify main header loaded
    await waitFor(() => {
      expect(screen.getByText('Income Certificate Service')).toBeInTheDocument();
    });

    // Verify status badge
    expect(screen.getAllByText(/Under Review/i).length).toBeGreaterThan(0);

    // Verify document filename and version 2 badge
    expect(screen.getByText('ration_card.pdf')).toBeInTheDocument();
    expect(screen.getByText('Re-uploaded (v2)')).toBeInTheDocument();

    // Verify action button "Mark Ready" is available for UNDER_REVIEW
    expect(screen.getByText('Mark Ready for Processing')).toBeInTheDocument();

    // Click "Request Correction" on the document
    const correctBtn = screen.getByText('Request Correction');
    fireEvent.click(correctBtn);

    // Modal should now be visible
    expect(screen.getByText('Request Document Correction')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Detail the issue/i)).toBeInTheDocument();

    // Submit modal
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    const textarea = screen.getByPlaceholderText(/Detail the issue/i);
    fireEvent.change(textarea, { target: { value: 'Document is blurry and unreadable' } });

    const submitModalBtn = screen.getByText('Submit Correction Request');
    fireEvent.click(submitModalBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requests/req-uuid-1234/documents/doc-uuid-1/review',
        {
          decision: 'REPLACEMENT_REQUESTED',
          reason: 'Document is blurry and unreadable',
        }
      );
    });
  });

  it('renders complete request modal and submits completion instructions', async () => {
    const processingRequest = {
      ...mockRequestData,
      status: 'PROCESSING',
    };

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/requests/req-uuid-1234') return Promise.resolve({ data: processingRequest });
      if (url === '/requests/req-uuid-1234/history') return Promise.resolve({ data: mockHistoryData });
      if (url === '/requests/req-uuid-1234/documents') return Promise.resolve({ data: [] });
      if (url === '/requests/req-uuid-1234/document-reviews') return Promise.resolve({ data: [] });
      if (url === '/services/serv-1') return Promise.resolve({ data: mockServiceData });
      if (url === '/requests/req-uuid-1234/interactions') return Promise.resolve({ data: [] });
      if (url === '/requests/req-uuid-1234/messages') return Promise.resolve({ data: [] });
      if (url === '/requests/req-uuid-1234/payments') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <MemoryRouter initialEntries={['/employee/requests/req-uuid-1234']}>
        <Routes>
          <Route path="/employee/requests/:id" element={<RequestWorkspace />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Income Certificate Service')).toBeInTheDocument();
    });

    // For PROCESSING status, "Complete Request" button should be available
    const completeBtn = screen.getByText('Complete Request');
    fireEvent.click(completeBtn);

    // Completion modal opens
    expect(screen.getByText('Complete Service Delivery')).toBeInTheDocument();

    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    const deliverBtn = screen.getByText('Complete & Deliver Output');
    fireEvent.click(deliverBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requests/req-uuid-1234/complete',
        expect.objectContaining({
          collection_instructions: expect.stringContaining('Physical signed document available'),
        })
      );
    });
  });
});
