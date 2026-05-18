import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ko: {
    translation: {
      "new_chat": "새 채팅",
      "settings": "설정",
      "tailscale_gateway_url": "Tailscale Gateway URL",
      "tailscale_gateway_url_placeholder": "https://robertlee-macbookpro.tail15c8bb.ts.net/v1",
      "tailscale_gateway_url_help": "Tailscale HTTPS 주소를 넣으면 콘솔 클라이언트가 게이트웨이 API 루트로 연결합니다.",
      "gateway_token": "Gateway Token",
      "gateway_token_placeholder": "OpenClaw 게이트웨이 토큰",
      "gateway_token_help": "Tailscale은 경로만 담당하고, 실제 인증은 OpenClaw 게이트웨이 토큰으로 처리합니다.",
      "agent_id_optional": "Agent ID (선택)",
      "agent_id_placeholder": "main",
      "settings_cancel": "취소",
      "settings_save": "저장",
      "input_placeholder": "Ask anything",
      "send": "전송",
      "dark_mode": "다크 모드",
      "light_mode": "라이트 모드",
      "mcp_tools": "MCP 도구",
      "no_chats": "채팅 내역이 없습니다.",
      "delete_chat": "채팅 삭제",
      "upload_image": "이미지 업로드",
    }
  },
  en: {
    translation: {
      "new_chat": "New Chat",
      "settings": "Settings",
      "tailscale_gateway_url": "Tailscale Gateway URL",
      "tailscale_gateway_url_placeholder": "https://robertlee-macbookpro.tail15c8bb.ts.net/v1",
      "tailscale_gateway_url_help": "Paste the Tailscale HTTPS address and the console client will connect to the gateway API root.",
      "gateway_token": "Gateway Token",
      "gateway_token_placeholder": "OpenClaw gateway token",
      "gateway_token_help": "Tailscale only handles the route; OpenClaw gateway token handles the actual authentication.",
      "agent_id_optional": "Agent ID (optional)",
      "agent_id_placeholder": "main",
      "settings_cancel": "Cancel",
      "settings_save": "Save",
      "input_placeholder": "Ask anything",
      "send": "Send",
      "dark_mode": "Dark Mode",
      "light_mode": "Light Mode",
      "mcp_tools": "MCP Tools",
      "no_chats": "No chat history.",
      "delete_chat": "Delete Chat",
      "upload_image": "Upload Image",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ko",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
