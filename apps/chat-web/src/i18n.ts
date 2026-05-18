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
      "gateway_agent_tools_hint": "레포를 실제로 고치려면 백엔드(llama-server 등)가 OpenAI 호환 tool_calls를 반환해야 합니다. Gemma만으로 도구가 안 뜨면 설정에서 도구에 강한 모델로 바꾸거나 OpenClaw Control UI 채팅을 쓰세요.",
      "gateway_open_control_ui": "OpenClaw Control UI 열기 (채팅·도구 권장)",
      "gateway_model_ref_optional": "모델 오버라이드 (x-openclaw-model, 선택)",
      "gateway_model_ref_placeholder": "openai/gemma-4-E4B-it-Q6_K.gguf",
      "gateway_model_ref_help": "비우면 게이트웨이 기본 모델입니다. 채팅마다 HTTP 헤더 x-openclaw-model 로 전달됩니다. ID는 맥에서 openclaw models list 로 확인하세요. 파일 수정용으로 도구 호출이 잘 되는 다른 로컬 모델을 따로 올렸다면 그 provider/model 키를 넣습니다.",
      "gateway_deploy_hint": "GitHub Pages 배포: 맥 게이트웨이에서 apps/chat-web 수정 후 main 브랜치에 push하면 Actions가 자동 배포합니다. (./scripts/deploy-chat-web.sh)",
      "gateway_agent_project_root_label": "프로젝트 루트 힌트",
      "gateway_agent_project_root_missing": "(설정에서 프로젝트 루트를 지정하세요)",
      "sidebar_close": "사이드바 닫기",
      "open_menu": "채팅 목록 열기",
      "chat_empty_title": "무엇을 도와드릴까요?",
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
      "agent_project_root": "Host project root (file-tool hint)",
      "agent_project_root_placeholder": "/Users/you/path/to/localclaw",
      "agent_project_root_help": "Absolute repo path on the machine running the gateway. Each chat sends this as a system hint so file tools target this tree. Match agents.defaults.workspace in ~/.openclaw/openclaw.json when possible.",
      "gateway_agent_panel_title": "Gateway agent",
      "gateway_agent_panel_body": "This UI talks to the gateway OpenAI-compatible endpoint (full agent runtime), not embedded browser MCP. Filesystem access follows the agent workspace on the host plus the project-root hint below.",
      "gateway_agent_tools_hint": "Repo edits require the backend (e.g. llama-server) to return structured OpenAI-style tool_calls. If Gemma rarely invokes tools, switch to a tool-strong model in Settings or use OpenClaw Control UI chat.",
      "gateway_open_control_ui": "Open OpenClaw Control UI (recommended for tools)",
      "gateway_model_ref_optional": "Model override (x-openclaw-model, optional)",
      "gateway_model_ref_placeholder": "openai/gemma-4-E4B-it-Q6_K.gguf",
      "gateway_model_ref_help": "Leave empty to use the gateway default. Sent as the x-openclaw-model header each request. Run openclaw models list on the gateway host for IDs. Use a tool-capable local model key when you run a separate coding model.",
      "gateway_deploy_hint": "GitHub Pages: after editing apps/chat-web on the gateway host, push to main — Actions deploys automatically. (./scripts/deploy-chat-web.sh)",
      "gateway_agent_project_root_label": "Project root hint",
      "gateway_agent_project_root_missing": "(Set project root in Settings)",
      "sidebar_close": "Close sidebar",
      "open_menu": "Open chat list",
      "chat_empty_title": "How can I help you today?",
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
