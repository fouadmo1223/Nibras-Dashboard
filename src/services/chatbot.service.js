import { apiRequest } from './api-client';

/** Whether OpenRouter is configured — the widget hides entirely when false. */
export const getChatbotStatus = () => apiRequest('/chatbot/status').then((r) => r.data);

/**
 * Sends the whole conversation so far (the server keeps no history) and gets the next reply.
 * The client's own message objects carry extra UI-only fields (id for animation tracking, a
 * local error flag) — stripped here since the DTO rejects unknown fields.
 */
export const sendChatMessage = (messages) =>
  apiRequest('/chatbot/message', {
    method: 'POST',
    body: { context: 'dashboard', messages: messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) },
  }).then((r) => r.data);
