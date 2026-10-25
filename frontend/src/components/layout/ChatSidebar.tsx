import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, ChevronLeft, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../../lib/api';

export interface ChatMessage {
  id: string;
  request_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  body: string;
  is_system: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  request_id: string;
  service_name: string;
  request_status: string;
  is_terminal: boolean;
  other_party_name: string;
  other_party_role: string;
  last_message: ChatMessage | null;
  unread_count: number;
  updated_at: string;
}

interface ChatSidebarProps {
  currentUserId?: string;
}

export function ChatSidebar({ currentUserId }: ChatSidebarProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    return sessionStorage.getItem('sahaya_chat_open') === 'true';
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return sessionStorage.getItem('sahaya_chat_active_conv') || null;
  });

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [totalUnread, setTotalUnread] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Save session states
  useEffect(() => {
    sessionStorage.setItem('sahaya_chat_open', isOpen ? 'true' : 'false');
  }, [isOpen]);

  useEffect(() => {
    if (activeConversationId) {
      sessionStorage.setItem('sahaya_chat_active_conv', activeConversationId);
    } else {
      sessionStorage.removeItem('sahaya_chat_active_conv');
    }
  }, [activeConversationId]);

  // Handle open request thread from outside event
  useEffect(() => {
    const handleOpenThread = async (e: Event) => {
      const customEvent = e as CustomEvent<{ requestId: string }>;
      const requestId = customEvent.detail?.requestId;
      if (!requestId) return;

      setIsOpen(true);
      try {
        const res = await api.get<ConversationItem>(`/conversations/request/${requestId}`);
        const conv = res.data;
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conv.id);
          return exists ? prev.map((c) => (c.id === conv.id ? conv : c)) : [conv, ...prev];
        });
        setActiveConversationId(conv.id);
      } catch (err: unknown) {
        const anyErr = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(anyErr.response?.data?.detail || 'Chat is not available for this request.');
      }
    };

    window.addEventListener('openChatThread', handleOpenThread as EventListener);
    return () => window.removeEventListener('openChatThread', handleOpenThread as EventListener);
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await api.get<{ unread_count: number }>('/conversations/unread-count');
      setTotalUnread(res.data.unread_count);
    } catch {
      // ignore silently
    }
  }, []);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await api.get<ConversationItem[]>('/conversations/');
      setConversations(res.data);
      // also calculate unread
      const unread = res.data.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
      setTotalUnread(unread);
    } catch {
      // ignore silently
    }
  }, []);

  // Mark active thread read
  const markAsRead = useCallback(async (convId: string) => {
    try {
      await api.post(`/conversations/${convId}/read`);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
      fetchUnreadCount();
      // Notify layout notifications badge
      window.dispatchEvent(new Event('chatRead'));
    } catch {
      // ignore
    }
  }, [fetchUnreadCount]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string, isInitial = false) => {
    if (document.hidden) return;
    if (isInitial) setIsLoadingMessages(true);
    try {
      const res = await api.get<ChatMessage[]>(`/conversations/${convId}/messages`);
      setMessages(res.data);
      markAsRead(convId);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      setErrorMessage(anyErr.response?.data?.detail || 'Failed to load messages.');
    } finally {
      if (isInitial) setIsLoadingMessages(false);
    }
  }, [markAsRead]);

  // Initial and unread polling (~30s when closed)
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      if (!isOpen) {
        fetchUnreadCount();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, isOpen]);

  // Polling when open (~5s for messages/conversations)
  useEffect(() => {
    if (!isOpen) return;
    fetchConversations();

    if (activeConversationId) {
      fetchMessages(activeConversationId, true);
    }

    const interval = setInterval(() => {
      if (activeConversationId) {
        fetchMessages(activeConversationId, false);
      } else {
        fetchConversations();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, activeConversationId, fetchConversations, fetchMessages]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Esc key closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus trap / focus first element on open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  // Send message
  const handleSendMessage = async () => {
    if (!activeConversationId || !inputMessage.trim() || isSending) return;
    const trimmed = inputMessage.trim();
    if (trimmed.length > 1000) return;

    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await api.post<ChatMessage>(`/conversations/${activeConversationId}/messages`, {
        body: trimmed,
      });
      setMessages((prev) => [...prev, res.data]);
      setInputMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      fetchConversations();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      setErrorMessage(anyErr.response?.data?.detail || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by day
  const groupMessagesByDay = (msgs: ChatMessage[]) => {
    const groups: { [dateStr: string]: ChatMessage[] } = {};
    for (const msg of msgs) {
      const date = new Date(msg.created_at);
      const dateStr = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(msg);
    }
    return groups;
  };

  const messageGroups = groupMessagesByDay(messages);

  return (
    <>
      {/* Floating launcher icon button (bottom-right) */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open Chat"
        aria-expanded={isOpen}
        className={clsx(
          'fixed z-40 flex items-center justify-center rounded-full shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-mono-border',
          'bg-mono-text text-mono-bg hover:bg-black',
          'bottom-20 right-6 w-14 h-14',
          isOpen && 'pointer-events-none opacity-0 scale-90'
        )}
      >
        <MessageSquare size={24} strokeWidth={2.2} />
        {totalUnread > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-mono-bg shadow-sm"
            aria-label={`${totalUnread} unread messages`}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Backdrop overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Chat Panel (right side) */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Service Request Chat"
        aria-modal="true"
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-mono-bg border-l border-mono-border shadow-2xl transition-transform duration-300 ease-in-out outline-none',
          'w-full md:w-[380px]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Panel Header */}
        <div className="h-16 px-4 border-b border-mono-border flex items-center justify-between bg-mono-bg shrink-0">
          {activeConversation ? (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => {
                  setActiveConversationId(null);
                  setErrorMessage(null);
                  fetchConversations();
                }}
                className="p-1.5 rounded-lg text-mono-muted hover:text-mono-text hover:bg-mono-surface transition-colors"
                aria-label="Back to conversations list"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-mono-text truncate">
                  {activeConversation.other_party_name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-mono-muted truncate">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      const targetRoute =
                        activeConversation.other_party_role === 'Staff'
                          ? `/requests/${activeConversation.request_id}`
                          : `/employee/requests/${activeConversation.request_id}`;
                      navigate(targetRoute);
                    }}
                    className="hover:underline text-mono-text font-medium"
                    title="View Request"
                  >
                    #{activeConversation.request_id.slice(0, 8)}
                  </button>
                  <span>·</span>
                  <span className="truncate">{activeConversation.service_name}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-bold text-mono-text">Messages</h2>
              <p className="text-xs text-mono-muted">Accepted request conversations</p>
            </div>
          )}

          {/* Minimise / Close button */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="p-2 rounded-lg text-mono-muted hover:text-mono-text hover:bg-mono-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 flex flex-col min-h-0 bg-mono-surface/30">
          {errorMessage && (
            <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* VIEW 1: Conversations List */}
          {!activeConversationId && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-mono-muted">
                  <div className="w-12 h-12 rounded-full bg-mono-surface flex items-center justify-center mb-3">
                    <MessageSquare size={24} className="text-mono-muted" />
                  </div>
                  <p className="text-sm font-medium text-mono-text mb-1">No conversations yet</p>
                  <p className="text-xs text-mono-muted">
                    Chat becomes available once a request is accepted.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setErrorMessage(null);
                    }}
                    className="w-full text-left p-3.5 bg-mono-bg rounded-xl border border-mono-border hover:border-mono-text/30 hover:shadow-sm transition-all flex flex-col gap-1 group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-mono-text truncate">
                        {conv.other_party_name}
                      </span>
                      {conv.last_message && (
                        <span className="text-[11px] text-mono-muted shrink-0">
                          {new Date(conv.last_message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-medium text-mono-muted truncate">
                      #{conv.request_id.slice(0, 8)} · {conv.service_name}
                    </div>

                    <div className="flex items-center justify-between w-full mt-1">
                      <p className="text-xs text-mono-muted truncate max-w-[280px]">
                        {conv.last_message ? conv.last_message.body : 'No messages yet.'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-mono-text shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* VIEW 2: Thread View */}
          {activeConversationId && (
            <div className="flex-1 flex flex-col min-h-0 bg-mono-bg">
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-mono-muted" size={24} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-mono-muted">
                    <p className="text-xs">No messages in this thread yet. Send a message to start.</p>
                  </div>
                ) : (
                  Object.entries(messageGroups).map(([dateStr, msgs]) => (
                    <div key={dateStr} className="space-y-3">
                      {/* Date divider */}
                      <div className="flex items-center justify-center my-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-mono-surface text-[10px] font-medium text-mono-muted border border-mono-border">
                          {dateStr}
                        </span>
                      </div>

                      {msgs.map((msg) => {
                        if (msg.is_system) {
                          return (
                            <div key={msg.id} className="flex justify-center my-1.5">
                              <span className="text-[11px] italic text-mono-muted bg-mono-surface/50 px-3 py-1 rounded-md border border-mono-border/60">
                                {msg.body}
                              </span>
                            </div>
                          );
                        }

                        const isMine = msg.sender_id === currentUserId;

                        return (
                          <div
                            key={msg.id}
                            className={clsx(
                              'flex flex-col max-w-[82%]',
                              isMine ? 'ml-auto items-end' : 'mr-auto items-start'
                            )}
                          >
                            <div
                              className={clsx(
                                'px-3.5 py-2.5 rounded-2xl text-xs break-words whitespace-pre-wrap leading-relaxed shadow-xs',
                                isMine
                                  ? 'bg-mono-text text-mono-bg rounded-br-xs'
                                  : 'bg-mono-surface text-mono-text rounded-bl-xs border border-mono-border'
                              )}
                            >
                              {msg.body}
                            </div>
                            <span className="text-[10px] text-mono-muted mt-1 px-1">
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Thread Input or Read-Only Notice */}
              <div className="p-3 border-t border-mono-border bg-mono-bg shrink-0">
                {activeConversation?.is_terminal ? (
                  <div className="p-2.5 bg-mono-surface rounded-xl text-center border border-mono-border">
                    <p className="text-xs text-mono-muted font-medium">
                      This request has been completed or closed. This chat thread is now read-only.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative flex items-end gap-2 bg-mono-surface rounded-xl p-2 border border-mono-border focus-within:border-mono-text/40 transition-colors">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputMessage}
                        onChange={(e) => {
                          if (e.target.value.length <= 1000) {
                            setInputMessage(e.target.value);
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a message... (Enter to send)"
                        className="flex-1 max-h-24 bg-transparent text-xs text-mono-text placeholder-mono-muted focus:outline-none resize-none p-1 leading-relaxed"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isSending}
                        aria-label="Send message"
                        className={clsx(
                          'p-2 rounded-lg bg-mono-text text-mono-bg transition-all shrink-0',
                          'hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed'
                        )}
                      >
                        {isSending ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-mono-muted px-1">
                      <span>Shift + Enter for new line</span>
                      <span className={clsx(inputMessage.length > 900 && 'text-red-600 font-bold')}>
                        {inputMessage.length}/1000
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
