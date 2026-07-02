const FRONTEND_LOCAL_URL = "http://localhost:5173";
const FRONTEND_HOMOLOG_URL = "https://homolog.d32mjk9mbam2cb.amplifyapp.com";
const WORDPRESS_APP_URL = "https://tiagofuguete.com.br/app-torneios";

function parseOrigins(value?: string): string[] {    return (value || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

export function isExecucaoLocal(): boolean {
    const valor = process.env.IS_LOCAL?.trim().toLowerCase();
    return valor === "true" || valor === "1";
}

export function getFrontendUrl(): string {
    if (isExecucaoLocal()) return FRONTEND_LOCAL_URL;

    const configured = process.env.FRONTEND_URL?.trim();
    if (configured && configured !== FRONTEND_LOCAL_URL) {
        return configured;
    }

    return FRONTEND_HOMOLOG_URL;
}

function normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, "");
}

/** Monta URL compartilhável do app (WordPress com appPath fora do ambiente local). */
export function buildFrontendAppLink(internalPath: string): string {
    const normalizedPath = internalPath.startsWith("/") ? internalPath : `/${internalPath}`;

    const configuredBase = process.env.FRONTEND_URL?.trim();
    const shouldUseLocalDirectLink =
        isExecucaoLocal() &&
        (!configuredBase || configuredBase === FRONTEND_LOCAL_URL);

    if (shouldUseLocalDirectLink) {
        return `${FRONTEND_LOCAL_URL}${normalizedPath}`;
    }

    const baseUrl = normalizeBaseUrl(getFrontendAppBaseUrl());
    return `${baseUrl}?appPath=${encodeURIComponent(normalizedPath)}`;
}

function getFrontendAppBaseUrl(): string {
    const configured = process.env.FRONTEND_URL?.trim();
    if (configured && configured !== FRONTEND_LOCAL_URL) {
        return configured;
    }

    return WORDPRESS_APP_URL;
}
export function getCorsOrigin(): string {
    if (isExecucaoLocal()) return FRONTEND_LOCAL_URL;
    return process.env.CORS_ORIGIN || getFrontendUrl();
}

export function getCorsOrigins(): string[] {
    const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);
    const configuredFrontendUrls = parseOrigins(process.env.FRONTEND_URL);
    const fallbackOrigins = [FRONTEND_HOMOLOG_URL, WORDPRESS_APP_URL, "https://tiagofuguete.com.br", FRONTEND_LOCAL_URL];
    const origins = [...configuredOrigins, ...configuredFrontendUrls, ...fallbackOrigins];

    return [...new Set(origins)];
}

export function getS3Bucket(): string {
    return process.env.AWS_S3_BUCKET || "";
}

export function getS3Region(): string {
    return process.env.AWS_S3_REGION || "us-east-1";
}

export function getS3BaseUrl(): string {
    const bucket = getS3Bucket();
    const region = getS3Region();
    return `https://${bucket}.s3.${region}.amazonaws.com`;
}
