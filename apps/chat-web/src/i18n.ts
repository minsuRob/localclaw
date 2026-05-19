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
      "agent_project_root": "호스트 프로젝트 루트 (파일 도구 힌트)",
      "agent_project_root_placeholder": "/Users/you/path/to/localclaw",
      "agent_project_root_help": "게이트웨이가 돌아가는 맥의 레포 절대경로입니다. 비워두면 기본값을 쓰며, 각 채팅 요청에 system 힌트로 넣어 read 등 파일 도구가 이 경로를 기준으로 동작하게 합니다. ~/.openclaw/openclaw.json 의 agents.defaults.workspace 와 같게 두는 것이 좋습니다.",
      "gateway_agent_panel_title": "게이트웨이 에이전트",
      "gateway_agent_panel_body": "이 페이지는 브라우저 MCP 연동이 아니라 Tailscale 게이트웨이의 POST /v1/chat/completions(풀 에이전트 런타임)로 연결됩니다. 파일 접근은 맥에서 열린 에이전트 workspace 설정과 아래 경로 힌트에 따라 결정됩니다.",
      "gateway_agent_project_root_label": "프로젝트 루트 힌트",
      "gateway_agent_project_root_missing": "(설정에서 프로젝트 루트를 지정하세요)",
      "sidebar_close": "사이드바 닫기",
      "open_menu": "채팅 목록 열기",
      "chat_empty_title": "무엇을 도와드릴까요?",
      "error_gateway_unauthorized": "게이트웨이가 요청을 거부했습니다(401). 설정에서 Gateway Token을 서버의 OPENCLAW_GATEWAY_PASSWORD(또는 지정한 비밀)와 동일하게 다시 입력한 뒤 저장하세요.",
      "error_gateway_connect": "OpenClaw 게이트웨이에 연결하지 못했습니다. 주소·네트워크·게이트웨이 실행 여부를 확인하세요.",
      "browser_open_success": "맥의 OpenClaw 전용 브라우저에서 다음 주소를 열었습니다:\n{{url}}\n\n(휴대폰 Chrome 탭이 아니라 게이트웨이 호스트의 관리 브라우저입니다.)",
      "browser_open_failed": "브라우저를 열지 못했습니다. 게이트웨이 설정에 tools.allow에 \"browser\", browser.enabled=true가 있는지, 맥에서 `openclaw browser start`가 되는지 확인하세요.\n\n상세: {{detail}}",
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
      "agent_project_root": "Host project root (file-tool hint)",
      "agent_project_root_placeholder": "/Users/you/path/to/localclaw",
      "agent_project_root_help": "Absolute repo path on the machine running the gateway. Each chat sends this as a system hint so file tools target this tree. Match agents.defaults.workspace in ~/.openclaw/openclaw.json when possible.",
      "gateway_agent_panel_title": "Gateway agent",
      "gateway_agent_panel_body": "This UI talks to the gateway OpenAI-compatible endpoint (full agent runtime), not embedded browser MCP. Filesystem access follows the agent workspace on the host plus the project-root hint below.",
      "gateway_agent_project_root_label": "Project root hint",
      "gateway_agent_project_root_missing": "(Set project root in Settings)",
      "sidebar_close": "Close sidebar",
      "open_menu": "Open chat list",
      "chat_empty_title": "How can I help you today?",
      "error_gateway_unauthorized": "Gateway rejected the request (401). In Settings, paste the same secret as the server's OPENCLAW_GATEWAY_PASSWORD (or configured gateway password), then save.",
      "error_gateway_connect": "Could not reach the OpenClaw gateway. Check URL, network, and that the gateway is running.",
      "browser_open_success": "Opened in the OpenClaw-managed browser on the gateway host:\n{{url}}\n\n(This is not a tab in your phone's Chrome.)",
      "browser_open_failed": "Could not open the browser. Ensure tools.allow includes \"browser\", browser.enabled=true, and `openclaw browser start` works on the Mac.\n\nDetail: {{detail}}",
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
