import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ko: {
    translation: {
      "new_chat": "새 채팅",
      "settings": "설정",
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
