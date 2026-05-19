import { apiGet, apiPost, apiDelete } from './api';

export type AIHistoryMessage = {
  role: 'user' | 'ai';
  text: string;
};

export type AISession = {
  id: string;
  user_id: number;
  title: string;
  preview: string | null;
  created_at: string;
  updated_at: string;
};

export type AISessionMessage = {
  id: number;
  session_id: string;
  role: 'user' | 'ai';
  text: string;
  created_at: string;
};

export async function sendAIMessage(
  message: string,
  history: AIHistoryMessage[] = [],
  sessionId?: string | null,
  coords?: {lat: number, lng: number} | null
) {
  const response = await apiPost<{
    answer: string;
    session_id: number | null;
    intent: string;
    intent_confidence: number;
    recommended_ids: number[];
  }>('/chat', {
    message,
    session_id: sessionId ? Number(sessionId) : null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  }, false);

  return {
    response: response.answer,
  };
}

export type ChatResponse = {
  answer: string;
  session_id: number | null;
  intent: string;
  intent_confidence: number;
  recommended_ids: number[];
};

export async function sendChatMessage(params: {
  message: string;
  session_id?: number | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<ChatResponse> {
  return apiPost<ChatResponse>('/chat', params, false);
}

export async function getAISessions() {
  return apiGet<AISession[]>('/ai/sessions', true);
}

export async function createAISession(title: string) {
  return apiPost<AISession>('/ai/sessions', { title }, true);
}

export async function getAISessionMessages(sessionId: string) {
  return apiGet<AISessionMessage[]>(`/ai/sessions/${sessionId}/messages`, true);
}

export async function deleteAISession(sessionId: string) {
  return apiDelete(`/ai/sessions/${sessionId}`, true);
}