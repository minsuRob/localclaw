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
      "gateway_token_help": "Funnel은 OpenClaw `password` 인증과 함께 쓰이며, 게이트웨이 시크릿은 보통 `OPENCLAW_GATEWAY_TOKEN`(LaunchAgent plist의 값과 동일)입니다. 여기에는 그 값을 Bearer로 넣으면 됩니다.",
      "agent_id_optional": "Agent ID (선택)",
      "agent_id_placeholder": "main",
      "settings_cancel": "취소",
      "settings_save": "저장",
      "settings_clear_stored_token": "브라우저에 저장된 토큰 지우기",
      "error_gateway_unauthorized": "게이트웨이가 요청을 거부했습니다(401). 설정에서 Gateway Token을 서버의 OPENCLAW_GATEWAY_PASSWORD(또는 지정한 비밀)와 동일하게 다시 입력한 뒤 저장하세요.",
      "error_gateway_connect": "OpenClaw 게이트웨이에 연결하지 못했습니다. 주소·네트워크·게이트웨이 실행 여부를 확인하세요.",
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
      "gateway_token_help": "With Tailscale Funnel the gateway uses password-style auth; the secret is usually `OPENCLAW_GATEWAY_TOKEN` (same value embedded in the LaunchAgent plist). Paste that string here as the Bearer token.",
      "agent_id_optional": "Agent ID (optional)",
      "agent_id_placeholder": "main",
      "settings_cancel": "Cancel",
      "settings_save": "Save",
      "settings_clear_stored_token": "Clear token stored in browser",
      "error_gateway_unauthorized": "Gateway rejected the request (401). In Settings, paste the same secret as the server's OPENCLAW_GATEWAY_PASSWORD (or configured gateway password), then save.",
      "error_gateway_connect": "Could not reach the OpenClaw gateway. Check URL, network, and that the gateway is running.",
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
