# OpenClaw Gateway WebSocket 채팅 스파이크 (GH Pages 클라이언트 이관용)

## 배경

- 공식 **WebChat / Control UI**는 게이트웨이 **WebSocket**으로 `chat.history`, `chat.send`, `chat.abort` 등을 사용합니다 ([OpenClaw WebChat 문서](https://docs.openclaw.ai/web/webchat)).
- 이 레포의 **`apps/chat-web`** 은 정적 호스팅(GitHub Pages)에서 **`POST /v1/chat/completions`(SSE)** 만 호출합니다. 게이트웨이는 해당 HTTP 경로에서도 에이전트 파이프라인으로 연결하지만, **표준 클라이언트와 완전히 동일한 UX·재연결·히스토리 동작을 보장하려면 WS 경로를 맞추는 편이 안전**합니다.

## 스파이크 시 검증할 항목

1. **인증**: 브라우저에서 WSS 연결 시 Bearer/패스워드 전달 방식(헤더·서브프로토콜·쿼리 금지 여부 등)과 CORS/HTTPS 제약.
2. **세션**: `sessionId`, `x-openclaw-session-key`, Control UI가 기억하는 backing session과의 정합성.
3. **스트리밍 이벤트**: `chat`, `agent`, `presence`, `tick`, `health` 등 이벤트 타입별로 SSE와 다른 부분.
4. **실패 모드**: 재연결, 중복 전송(`chat.send` idempotency), 부분 응답 유지.

## 제안되는 단계

1. 로컬에서 브라우저 개발자 도구로 Control UI의 WS 프레임을 캡처해 최소 `chat.send` 페이로드 형식을 고정한다.
2. `apps/chat-web`에 **선택적 “WS 모드”** 토글을 두거나, 별도 빌드 타깃으로 프로토타입 컴포넌트를 추가한다.
3. Tailscale HTTPS와 동일 출처가 아닐 때의 **쿠키·토큰 노출**을 피하기 위해 Bearer만 헤더로 보내는 패턴을 유지한다.

## 참고

- 현 단계에서는 **파일 도구 신뢰도**를 높이려면 도구 호출 가능 모델 + Control UI 사용이 더 빠른 운영 경로입니다 ([README.md](../README.md) “웹 채팅·파일 도구” 절).
