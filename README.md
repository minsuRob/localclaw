# LocalClaw — OpenClaw + llama.cpp + Gemma 4 E4B 로컬 AI 환경

Mac(Apple Silicon) 또는 Linux 서버에서 **OpenClaw** 게이트웨이와 **llama.cpp**를 통해 **Gemma 4 E4B** 모델을 완전히 로컬에서 실행하는 설정입니다.

---

## 아키텍처

```
Cursor / VS Code (OpenClaw extension)
          │
          ▼
  ┌──────────────────────────┐        Tailscale HTTPS
  │  OpenClaw Gateway/UI     │ <------------------------------┐
  │  ws://127.0.0.1:18789    │                                │
  └──────────┬───────────────┘                                │
             │ host.docker.internal:8080                      │
             ▼                                                │
  ┌─────────────────────┐                                     │
  │    llama-server     │  (Mac 네이티브 / Metal GPU)        │
  │    Gemma 4 E4B      │                                     │
  └─────────────────────┘                                     │
                                                              │
브라우저와 OpenClaw 콘솔 클라이언트는 `https://robertlee-macbookpro.tail15c8bb.ts.net`의 OpenClaw Gateway/UI로 접속하고,
게이트웨이는 로컬 `ws://127.0.0.1:18789`를 Tailscale Funnel로 노출한다.
```

---

## 전략 비교

| 항목 | 전략 A (Mac, 권장) | 전략 B (Linux) |
|------|-------------------|----------------|
| 파일 | `docker-compose.yml` | `docker-compose.linux.yml` |
| OpenClaw | Docker 컨테이너 | Docker 컨테이너 |
| llama.cpp | **호스트 네이티브** (Metal) | Docker (CUDA) |
| GPU 가속 | Apple Metal | NVIDIA CUDA |
| 성능 | 최적 (Metal 직접 접근) | 최적 (CUDA 직접 접근) |
| 설정 복잡도 | 중간 | 낮음 (전부 Docker) |

---

## 빠른 시작 (Mac 전략 A)

### 1단계: 초기 설정

```bash
cd /Users/robertlee/Workspace/Personal/localclaw
chmod +x scripts/*.sh
./scripts/setup.sh
```

`setup.sh`가 자동으로 수행하는 작업:
- 의존성 확인 (Docker, brew, cmake, python3)
- `.env` 파일 생성 (사용자명 자동 치환)
- 필요 디렉토리 생성 (`~/.openclaw`, `./model`)
- llama.cpp 빌드 여부 확인
- 모델 다운로드 여부 확인
- Docker 이미지 pull 및 컨테이너 시작

### 2단계: llama-server 시작

```bash
./scripts/start-llamacpp.sh
```

### 3단계: 연결 테스트

```bash
./scripts/test-connection.sh
```

### OpenClaw 콘솔 클라이언트 설정

브라우저의 OpenClaw Control UI에서 `설정`을 열고 아래 값을 넣습니다.

- `Tailscale Gateway URL`: `https://robertlee-macbookpro.tail15c8bb.ts.net/v1`
- `Gateway Token`(Bearer): **`localclaw/.env`의 `OPENCLAW_GATEWAY_TOKEN` 값과 동일한 문자열**을 넣습니다.  
  최신 OpenClaw는 게이트웨이 시크릿을 plist가 아니라 **`~/.openclaw/service-env/ai.openclaw.gateway.env`의 `OPENCLAW_GATEWAY_PASSWORD`** 로 넘기며, `~/.openclaw/openclaw.json`의 `gateway.auth.password`는 **`${OPENCLAW_GATEWAY_PASSWORD}`** 를 참조합니다. 위 두 값이 어긋나면 GitHub Pages에서는 **401**이 납니다. `.env`의 토큰으로 비밀번호 줄을 맞춘 뒤 `openclaw daemon restart` 하세요. (`openclaw gateway install --force` 는 서비스 env를 다시 만들 수 있으니 이후에도 같은 문자열로 맞춰야 합니다.)
- `Agent ID`: 선택 사항, 기본값은 `main`

루트 Tailscale 주소만 입력해도 내부에서 `/v1`이 붙도록 정규화되지만, 처음부터 API 루트까지 넣는 편이 가장 명확합니다.

### 웹 채팅(apps/chat-web)·파일 도구가 안 될 때

GitHub Pages에 올린 채팅 UI는 브라우저에서 **`POST /v1/chat/completions`(SSE)** 만 호출합니다. 게이트웨이는 이 경로에서도 **풀 에이전트 런타임**(파일 도구 루프)으로 연결하지만, **로컬 llama-server가 모델 응답에 구조화된 `tool_calls`를 거의 주지 않으면** `read`/`edit` 등이 실행되지 않고 모델이 “파일을 읽을 수 없다”고만 답하는 현상이 납니다.

**권장 확인 순서**

1. 맥에서 `openclaw sandbox explain --session agent:main:main` 으로 **sandbox 없음(direct)·파일 도구 allow** 여부 확인.
2. 브라우저에서 게이트웨이 **Control UI**를 연 뒤(테일스케일 호스트의 HTTPS 루트), **`/agents` → Tools → Available Right Now** 에서 `read` 등이 보이는지 확인 (문서상 `tools.effective`).
3. **같은 게이트웨이·같은 프롬프트**를 Control UI 채팅 탭에서 보냈을 때만 파일 도구가 돈다면, 메시지 채널/HTTP 차이를 의심하고, 둘 다 안 되면 **백엔드 모델의 tool_calls 지원**을 의심합니다.

**완화 (설정)**

- Docker: **`OPENCLAW_WORKSPACE_DIR`** = 레포 루트, config workspace = `/home/node/.openclaw/workspace` (`./scripts/sync-openclaw-config.sh --docker`). 네이티브 daemon: `./scripts/sync-openclaw-config.sh --native` 로 호스트 절대경로.
- **도구 호출에 유리한 로컬 모델**(예: 코더 계열 GGUF, 또는 별도 vLLM 인스턴스)을 같은 OpenClaw 카탈로그에 추가하고, 웹 채팅 설정의 **모델 오버라이드(`x-openclaw-model`)** 또는 게이트웨이 기본 모델로 그쪽을 쓴다.
- 일부 OpenAI 호환 서버는 **`tool_choice: "auto"`에서 빈 `tool_calls`** 를 돌려 줍니다. OpenClaw 문서(vLLM 프로바이더 절)와 같은 패턴으로 **`agents.defaults.models["provider/model"].params.extra_body`** 를 **해당 모델 항목에만** 실험할 수 있습니다. **`tool_choice: "required"`** 는 매 턴 도구를 강제하므로 전역 기본값으로 두지 마세요. 병합용 예시: [config/agents.defaults.models.extra-body.example.json](config/agents.defaults.models.extra-body.example.json).

**레포를 채팅으로 수정할 때는** 공식 경로인 **Control UI(WebSocket `chat.send`)** 사용을 권장합니다. GH Pages 클라이언트에서 동일 WS 프로토콜을 옮기는 검토는 [docs/openclaw-gateway-ws-chat-spike.md](docs/openclaw-gateway-ws-chat-spike.md)를 참고하세요.

### Docker 게이트웨이가 localclaw 레포를 보게 하기

기본 `.env`는 **`OPENCLAW_WORKSPACE_DIR` = 이 레포 루트**이며, 컨테이너에는 `/home/node/.openclaw/workspace`로 마운트됩니다. [`config/openclaw.json`](config/openclaw.json)의 `agents.defaults.workspace`도 그 컨테이너 경로(`/home/node/.openclaw/workspace`)를 가리킵니다.

```bash
# 설정 병합 + workspace 경로 (Docker)
./scripts/sync-openclaw-config.sh --docker
docker compose up -d
docker compose restart openclaw-gateway

# 네이티브 openclaw daemon 만 쓸 때 (호스트 절대경로)
./scripts/sync-openclaw-config.sh --native
openclaw daemon restart
```

검증: `./scripts/verify-agent-workspace.sh`

### GitHub Pages에 chat-web 반영

`apps/chat-web/**` 변경 후 **`main`에 push**하면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)이 Pages에 배포합니다. 맥 게이트웨이/에이전트가 git push할 수 있어야 합니다.

```bash
./scripts/deploy-chat-web.sh "feat(chat-web): your message"
```

---

## 빠른 시작 (Linux 전략 B)

```bash
# 1. Tailscale HTTPS 주소 확인
tailscale funnel status

# 2. 브라우저에서 OpenClaw UI 확인
curl https://robertlee-macbookpro.tail15c8bb.ts.net/
```

---

## llama.cpp 빌드 (Mac)

```bash
./scripts/build-llamacpp.sh
```

또는 수동으로:

```bash
git clone https://github.com/ggml-org/llama.cpp ~/llama.cpp
cd ~/llama.cpp
cmake -B build -DGGML_METAL=ON
cmake --build build --config Release -j$(sysctl -n hw.logicalcpu)
```

---

## 모델 다운로드

```bash
./scripts/download-model.sh
```

또는 수동으로:

```bash
pip install huggingface_hub
huggingface-cli download unsloth/gemma-4-E4B-it-GGUF gemma-4-E4B-it-Q6_K.gguf \
  --local-dir ./model
```

---

## 양자화 선택 가이드

Gemma 4 E4B (Interleaved Expert 4B 파라미터)에 대한 양자화별 품질 비교입니다.

| 양자화 | 파일 크기 | PPL (↓낮을수록 좋음) | VRAM/RAM | 권장 상황 |
|--------|-----------|----------------------|-----------|-----------|
| Q8_0   | ~4.5 GB   | 기준값 +0.01         | 8 GB+     | 최고 품질, 충분한 메모리 |
| **Q6_K**   | **~3.5 GB**   | **기준값 +0.05**         | **6 GB+**     | **권장: 품질/성능 최적 균형** |
| Q5_K_M | ~3.0 GB   | 기준값 +0.12         | 6 GB+     | 메모리 절약, 품질 양호 |
| Q4_K_M | ~2.5 GB   | 기준값 +0.35         | 4 GB+     | ⚠️ 비권장 (E4B 특성상 품질 저하 현저) |

> **주의**: Gemma 4 E4B는 MoE(Mixture of Experts) 아키텍처로, Q4_K_M 이하 양자화 시  
> 전문가 라우팅 정확도가 급격히 저하됩니다. **최소 Q5_K_M, 권장 Q6_K** 이상을 사용하세요.

기본 모델 경로는 `./model/gemma-4-E4B-it-Q6_K.gguf`입니다. 다른 양자화 파일을 사용할 때는 `.env`의 `MODEL_FILE`과 `LLAMACPP_MODEL`만 바꾸면 됩니다.

---

## 포트 정보

| 서비스 | 포트 | 설명 |
|--------|------|------|
| llama-server | `127.0.0.1:8080` | llama.cpp OpenAI 호환 API |
| OpenClaw Gateway/UI | `127.0.0.1:18789` / `https://robertlee-macbookpro.tail15c8bb.ts.net` | OpenClaw 게이트웨이 |

`OpenClaw Gateway/UI`는 Tailscale Funnel로 HTTPS 공개되고, `llama-server`는 loopback으로 유지됩니다.

---

## 운영 관리 명령어

### llama-server 관리

```bash
# 시작
./scripts/start-llamacpp.sh

# 중지
./scripts/stop-llamacpp.sh

# 로그 확인
tail -f /tmp/llamacpp-server.log

# 상태 확인
curl http://localhost:8080/health
```

### Docker 관리

```bash
# 컨테이너 상태
docker compose ps

# OpenClaw 로그
docker compose logs -f openclaw-gateway

# 컨테이너 재시작
docker compose restart openclaw-gateway

# 전체 중지
docker compose down

# 전체 삭제 (볼륨 포함)
docker compose down -v
```

### OpenClaw CLI 사용

```bash
docker compose --profile cli run --rm openclaw-cli
```

---

## 트러블슈팅

### llama-server 시작 실패

```bash
# 로그 확인
cat /tmp/llamacpp-server.log

# 모델 파일 확인
ls -lh model/

# Metal 지원 확인
system_profiler SPDisplaysDataType | grep "Metal"
```

### OpenClaw가 llama-server에 연결 못할 때

```bash
# llama-server 직접 연결 테스트
curl http://127.0.0.1:8080/health
```

### Tailscale 공개 주소 확인

```bash
tailscale funnel status
curl https://robertlee-macbookpro.tail15c8bb.ts.net/
```

### 콘솔 클라이언트 인증 확인

```bash
./scripts/test-connection.sh
```

이 스크립트는 Tailscale HTTPS 주소와 `OPENCLAW_GATEWAY_TOKEN`을 기준으로 게이트웨이 SSE 호출까지 검증합니다.

### OpenClaw 게이트웨이 직접 확인

```bash
openclaw status
openclaw gateway probe
```

### OpenClaw 컨테이너 오류

```bash
# 상세 로그
docker compose logs --tail=100 openclaw-gateway

# 컨테이너 내부 접근
docker compose exec openclaw-gateway sh

# 설정 파일 확인
cat ~/.openclaw/config/openclaw.json
```

### 메모리 부족

`.env`에서 컨텍스트 크기 조정:

```env
LLAMACPP_CTX_SIZE=16384  # 32768에서 줄임
```

### Docker Desktop이 시작되지 않음

```bash
open -a Docker
# 완전히 시작될 때까지 대기 후 재시도
```

---

## 파일 구조

```
localclaw/
├── docker-compose.yml          # Mac 전략 A
├── docker-compose.linux.yml    # Linux 전략 B (CUDA)
├── .env.example                # 환경변수 템플릿
├── .gitignore
├── README.md                   # 이 파일
├── scripts/
│   ├── setup.sh                # 전체 환경 초기화 (Mac)
│   ├── sync-openclaw-config.sh # ~/.openclaw config 병합 (docker/native workspace)
│   ├── verify-agent-workspace.sh # 파일 도구·workspace 스모크 테스트
│   ├── deploy-chat-web.sh      # chat-web 빌드 후 main push → Pages
│   ├── start-llamacpp.sh       # llama-server 시작
│   ├── stop-llamacpp.sh        # llama-server 중지
│   ├── build-llamacpp.sh       # llama.cpp 빌드 (Metal)
│   ├── download-model.sh       # Gemma E4B GGUF 다운로드
│   └── test-connection.sh      # E2E 통신 테스트
└── config/
    └── openclaw.json           # OpenClaw provider 설정
```
