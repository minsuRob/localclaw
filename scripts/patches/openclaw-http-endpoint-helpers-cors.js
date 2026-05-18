/**
 * Drop-in replacement for OpenClaw dist/http-endpoint-helpers-*.js (filename varies by build).
 * Adds CORS preflight (OPTIONS) + Access-Control-Allow-Origin for POST /v1/chat/completions
 * when Origin is listed in gateway.controlUi.allowedOrigins.
 *
 * Target: OpenClaw 2026.5.7 (Homebrew). After `brew upgrade openclaw`, re-copy from upstream
 * and re-apply this file if GitHub Pages fetch breaks again.
 */
import { n as authorizeOperatorScopesForMethod } from "./method-scopes-CXVBHLXE.js";
import { a as sendMethodNotAllowed, i as sendJson, t as readJsonBodyOrError } from "./http-common-CxRh-el-.js";
import { d as resolveTrustedHttpOperatorScopes, t as authorizeGatewayHttpRequestOrReply } from "./http-auth-utils-stNI7HTF.js";
import { i as getRuntimeConfig } from "./io-E69J4lLI.js";
import { a as normalizeLowercaseStringOrEmpty } from "./string-coerce-Bje8XVt9.js";
import "./http-utils-3xCgv22F.js";
//#region src/gateway/http-endpoint-helpers.ts
function normalizeBrowserOrigin(originRaw) {
	const trimmed = (originRaw ?? "").trim();
	if (!trimmed || trimmed === "null") return null;
	try {
		const url = new URL(trimmed);
		return normalizeLowercaseStringOrEmpty(url.origin);
	} catch {
		return null;
	}
}
function resolveOpenAiHttpCorsAllowlist(cfg) {
	const chat = cfg?.gateway?.http?.endpoints?.chatCompletions?.allowedOrigins;
	const control = cfg?.gateway?.controlUi?.allowedOrigins;
	const merged = [...Array.isArray(chat) ? chat : [], ...Array.isArray(control) ? control : []];
	return merged.map((o) => normalizeLowercaseStringOrEmpty(String(o).trim())).filter(Boolean);
}
function isOriginAllowedForOpenAiHttpCors(originHeader, cfg) {
	const normalized = normalizeBrowserOrigin(originHeader);
	if (!normalized) return false;
	const allow = new Set(resolveOpenAiHttpCorsAllowlist(cfg));
	if (allow.has("*")) return true;
	return allow.has(normalized);
}
function applyOpenAiHttpCorsHeaders(req, res) {
	const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
	if (!origin || !isOriginAllowedForOpenAiHttpCors(origin, getRuntimeConfig())) return;
	res.setHeader("Access-Control-Allow-Origin", origin);
	res.setHeader("Vary", "Origin");
}
async function handleGatewayPostJsonEndpoint(req, res, opts) {
	if (new URL(req.url ?? "/", `http://${req.headers.host || "localhost"}`).pathname !== opts.pathname) return false;
	const method = (req.method || "GET").toUpperCase();
	applyOpenAiHttpCorsHeaders(req, res);
	if (method === "OPTIONS") {
		const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
		if (!isOriginAllowedForOpenAiHttpCors(origin, getRuntimeConfig())) {
			res.statusCode = 403;
			res.setHeader("Content-Type", "text/plain; charset=utf-8");
			res.end("Forbidden");
			return;
		}
		res.statusCode = 204;
		res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Openclaw-Session-Key, X-Openclaw-Agent-Id, X-Openclaw-Password, X-Openclaw-Scopes");
		res.setHeader("Access-Control-Max-Age", "86400");
		res.end();
		return;
	}
	if (method !== "POST") {
		sendMethodNotAllowed(res);
		return;
	}
	const requestAuth = await authorizeGatewayHttpRequestOrReply({
		req,
		res,
		auth: opts.auth,
		trustedProxies: opts.trustedProxies,
		allowRealIpFallback: opts.allowRealIpFallback,
		rateLimiter: opts.rateLimiter
	});
	if (!requestAuth) return;
	if (opts.requiredOperatorMethod) {
		const requestedScopes = opts.resolveOperatorScopes?.(req, requestAuth) ?? resolveTrustedHttpOperatorScopes(req, requestAuth);
		const scopeAuth = authorizeOperatorScopesForMethod(opts.requiredOperatorMethod, requestedScopes);
		if (!scopeAuth.allowed) {
			sendJson(res, 403, {
				ok: false,
				error: {
					type: "forbidden",
					message: `missing scope: ${scopeAuth.missingScope}`
				}
			});
			return;
		}
	}
	const body = await readJsonBodyOrError(req, res, opts.maxBodyBytes);
	if (body === void 0) return;
	return {
		body,
		requestAuth
	};
}
//#endregion
export { handleGatewayPostJsonEndpoint as t };
