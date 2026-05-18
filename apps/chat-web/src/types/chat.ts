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
}
