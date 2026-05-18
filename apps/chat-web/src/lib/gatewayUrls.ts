/** API 베이스(예: https://host/v1)에서 게이트웨이 Origin만 추출 */
export function gatewayOriginFromApiBase(apiBase: string): string | undefined {
  try {
    return new URL(apiBase.trim()).origin;
  } catch {
    return undefined;
  }
}
