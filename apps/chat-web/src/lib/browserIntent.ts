/** 게이트웨이 baseURL (`…/v1`) → HTTP 루트 (`…/` 없이 origin + optional path prefix) */
export function gatewayHttpRoot(baseURL: string): string {
  const trimmed = baseURL.trim();
  try {
    const url = new URL(trimmed);
    const path = url.pathname.replace(/\/+$/, '');
    if (path.endsWith('/v1')) {
      url.pathname = path.slice(0, -3) || '/';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/v1\/?$/, '');
  }
}

const URL_IN_TEXT =
  /https?:\/\/[^\s<>"')\]]+/i;

const NAV_VERB =
  /(?:열어|열기|이동|가줘|가자|띄워|띄우기|open|go to|navigate|visit|browse)\b/i;

const SITE_ALIASES: Record<string, string> = {
  naver: 'https://www.naver.com/',
  네이버: 'https://www.naver.com/',
  google: 'https://www.google.com/',
  구글: 'https://www.google.com/',
  youtube: 'https://www.youtube.com/',
  유튜브: 'https://www.youtube.com/',
};

/** 사용자 메시지에서 브라우저로 열 URL을 추정합니다. */
export function detectBrowserNavigationUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const direct = trimmed.match(URL_IN_TEXT);
  if (direct) return direct[0].replace(/[.,;:!?)]+$/, '');

  const lower = trimmed.toLowerCase();
  if (!NAV_VERB.test(trimmed) && !/(네이버|naver|구글|google|유튜브|youtube)/i.test(trimmed)) {
    return null;
  }

  for (const [key, url] of Object.entries(SITE_ALIASES)) {
    if (lower.includes(key.toLowerCase())) return url;
  }

  const domainMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?([a-z0-9][-a-z0-9]*(?:\.[a-z]{2,})+)/i
  );
  if (domainMatch) {
    const host = domainMatch[1];
    return host.startsWith('http') ? host : `https://${host}/`;
  }

  return null;
}
