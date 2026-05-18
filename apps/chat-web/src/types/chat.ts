export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  images?: string[]; // Base64 strings
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface OpenClawConfig {
  baseURL: string;
  gatewayToken: string;
  agentId?: string;
  /** 게이트웨이 호스트에서 파일 도구가 사용할 프로젝트 루트(절대경로). 매 요청 시 system 힌트로 전달됩니다. */
  agentProjectRoot?: string;
  /**
   * 게이트웨이에 전달할 `x-openclaw-model` (예: `openai/gemma-...` 또는 도구에 강한 다른 모델 id).
   * 비우면 헤더를 보내지 않아 게이트웨이 기본 모델을 씁니다.
   */
  gatewayModelRef?: string;
}
