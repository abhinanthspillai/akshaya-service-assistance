import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ChatSidebar } from '../ChatSidebar';
import { api } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ChatSidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders collapsed floating icon button with unread count badge', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/conversations/unread-count') {
        return Promise.resolve({ data: { unread_count: 3 } });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <BrowserRouter>
        <ChatSidebar currentUserId="citizen-1" />
      </BrowserRouter>
    );

    const button = screen.getByLabelText('Open Chat');
    expect(button).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('opens panel and renders conversations list', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/conversations/unread-count') {
        return Promise.resolve({ data: { unread_count: 1 } });
      }
      if (url === '/conversations/') {
        return Promise.resolve({
          data: [
            {
              id: 'conv-1',
              request_id: 'req-12345678-0000',
              service_name: 'Income Certificate',
              request_status: 'ACCEPTED',
              is_terminal: false,
              other_party_name: 'Staff Sharma',
              other_party_role: 'Staff',
              last_message: {
                id: 'msg-1',
                request_id: 'req-12345678-0000',
                conversation_id: 'conv-1',
                sender_id: 'staff-1',
                body: 'Hello there!',
                is_system: false,
                read_at: null,
                created_at: new Date().toISOString(),
              },
              unread_count: 1,
              updated_at: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <BrowserRouter>
        <ChatSidebar currentUserId="citizen-1" />
      </BrowserRouter>
    );

    const openBtn = screen.getByLabelText('Open Chat');
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByText('Staff Sharma')).toBeInTheDocument();
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });

  it('opens thread view, displays messages and sends a new message', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/conversations/unread-count') {
        return Promise.resolve({ data: { unread_count: 0 } });
      }
      if (url === '/conversations/') {
        return Promise.resolve({
          data: [
            {
              id: 'conv-1',
              request_id: 'req-12345678-0000',
              service_name: 'Income Certificate',
              request_status: 'ACCEPTED',
              is_terminal: false,
              other_party_name: 'Staff Sharma',
              other_party_role: 'Staff',
              last_message: null,
              unread_count: 0,
              updated_at: new Date().toISOString(),
            },
          ],
        });
      }
      if (url === '/conversations/conv-1/messages') {
        return Promise.resolve({
          data: [
            {
              id: 'msg-1',
              request_id: 'req-12345678-0000',
              conversation_id: 'conv-1',
              sender_id: 'staff-1',
              body: 'Welcome to Akshaya service chat',
              is_system: false,
              read_at: null,
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url === '/conversations/conv-1/read') {
        return Promise.resolve({ data: { detail: 'ok' } });
      }
      if (url === '/conversations/conv-1/messages') {
        return Promise.resolve({
          data: {
            id: 'msg-2',
            request_id: 'req-12345678-0000',
            conversation_id: 'conv-1',
            sender_id: 'citizen-1',
            body: 'Thank you for your help!',
            is_system: false,
            read_at: null,
            created_at: new Date().toISOString(),
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <BrowserRouter>
        <ChatSidebar currentUserId="citizen-1" />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByLabelText('Open Chat'));

    await waitFor(() => {
      expect(screen.getByText('Staff Sharma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Staff Sharma'));

    await waitFor(() => {
      expect(screen.getByText('Welcome to Akshaya service chat')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Write a message/);
    fireEvent.change(input, { target: { value: 'Thank you for your help!' } });

    const sendBtn = screen.getByLabelText('Send message');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Thank you for your help!')).toBeInTheDocument();
    });
  });

  it('renders read-only notice when conversation is terminal', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/conversations/unread-count') {
        return Promise.resolve({ data: { unread_count: 0 } });
      }
      if (url === '/conversations/') {
        return Promise.resolve({
          data: [
            {
              id: 'conv-closed',
              request_id: 'req-closed-0000',
              service_name: 'Income Certificate',
              request_status: 'COMPLETED',
              is_terminal: true,
              other_party_name: 'Staff Sharma',
              other_party_role: 'Staff',
              last_message: null,
              unread_count: 0,
              updated_at: new Date().toISOString(),
            },
          ],
        });
      }
      if (url === '/conversations/conv-closed/messages') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <BrowserRouter>
        <ChatSidebar currentUserId="citizen-1" />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByLabelText('Open Chat'));

    await waitFor(() => {
      expect(screen.getByText('Staff Sharma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Staff Sharma'));

    await waitFor(() => {
      expect(
        screen.getByText(/This request has been completed or closed/i)
      ).toBeInTheDocument();
    });
  });
});
