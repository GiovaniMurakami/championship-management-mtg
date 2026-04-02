const FRONTEND_LOCAL_URL = "http://localhost:5173";

export function isExecucaoLocal(): boolean {
    const valor = process.env.IS_LOCAL?.trim().toLowerCase();
    return valor === "true" || valor === "1";
}

export function getFrontendUrl(): string {
    if (isExecucaoLocal()) return FRONTEND_LOCAL_URL;
    return process.env.FRONTEND_URL || FRONTEND_LOCAL_URL;
}

export function getCorsOrigin(): string {
    if (isExecucaoLocal()) return FRONTEND_LOCAL_URL;
    return process.env.CORS_ORIGIN || getFrontendUrl();
}
