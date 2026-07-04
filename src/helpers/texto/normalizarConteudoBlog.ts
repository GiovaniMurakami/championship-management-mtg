const BLOG_MARKUP_TAGS = /<(titulo|paragrafo|negrito|italico|link|imagem|lista|item)\b/i;
const BLOCO_SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const TAGS_PERIGOSAS = /<\/?(?:iframe|object|embed|form|input|button|link|meta|style|base)[^>]*>/gi;

function sanitizarTagsPerigosas(conteudo: string): string {
  return conteudo.replace(BLOCO_SCRIPT, "").replace(TAGS_PERIGOSAS, "");
}

export function normalizarConteudoBlog(conteudo: string): string {
  const value = sanitizarTagsPerigosas(conteudo.trim());
  if (!value) return value;
  if (BLOG_MARKUP_TAGS.test(value)) return value;
  if (/<[a-z][\s\S]*>/i.test(value)) return value;

  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<paragrafo>${escaped}</paragrafo>`;
}
