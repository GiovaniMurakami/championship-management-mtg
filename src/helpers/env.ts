const FRONTEND_LOCAL_URL = "http://localhost:5173";
const FRONTEND_HOMOLOG_URL = "https://homolog.d32mjk9mbam2cb.amplifyapp.com";

function parseOrigins(value?: string): string[] {
    return (value || "")
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
    return process.env.FRONTEND_URL || FRONTEND_HOMOLOG_URL;
}

export function getCorsOrigin(): string {
    if (isExecucaoLocal()) return FRONTEND_LOCAL_URL;
    return process.env.CORS_ORIGIN || getFrontendUrl();
}

export function getCorsOrigins(): string[] {
    const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);
    const configuredFrontendUrls = parseOrigins(process.env.FRONTEND_URL);
    const fallbackOrigins = [FRONTEND_HOMOLOG_URL, FRONTEND_LOCAL_URL];
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
