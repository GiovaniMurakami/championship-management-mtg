const cores = {
    fundo: "#08060f", card: "#160e2d", borda: "#38245e", texto: "#f5edff",
    suave: "#beafd7", marca: "#c795ff", botao: "#8e39ed",
};

function escaparHtml(valor: string): string {
    return valor.replace(/[&<>'"]/g, (caractere) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[caractere]!);
}

function layoutEmail(conteudo: string, preheader: string): string {
    return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fuguete</title></head>
<body style="margin:0;padding:0;background:${cores.fundo};font-family:Arial,Helvetica,sans-serif;color:${cores.texto};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${cores.fundo};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${cores.card};border:1px solid ${cores.borda};border-radius:16px;overflow:hidden;">
<tr><td style="height:5px;background:${cores.botao};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 12px;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${cores.marca};">FUGUETE</div><div style="margin-top:8px;font-size:13px;color:${cores.suave};">Magic: The Gathering • Torneios e comunidade</div></td></tr>
<tr><td style="padding:20px 40px 36px;">${conteudo}</td></tr>
<tr><td style="padding:24px 40px;border-top:1px solid ${cores.borda};text-align:center;font-size:12px;line-height:18px;color:${cores.suave};">Este é um e-mail automático enviado por Fuguete.<br><a href="https://tiagofuguete.com.br" style="color:${cores.marca};text-decoration:none;">tiagofuguete.com.br</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function criarEmailBoasVindas(nome: string): { html: string; texto: string } {
    const nomeSeguro = escaparHtml(nome);
    return {
        html: layoutEmail(`
<h1 style="margin:0 0 16px;font-size:28px;line-height:36px;color:${cores.texto};">Bem-vindo, ${nomeSeguro}! 👋</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:25px;color:${cores.suave};">Sua conta foi criada com sucesso. Agora você já pode viver seus campeonatos de Magic em um só lugar.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#110a22;border-radius:10px;"><tr><td style="padding:20px;color:${cores.suave};font-size:15px;line-height:24px;">• Inscreva-se em torneios<br>• Organize e acompanhe seus decks<br>• Consulte resultados, rankings e metagame</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:8px;background:${cores.botao};"><a href="https://app.tiagofuguete.com.br" style="display:inline-block;padding:14px 24px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;">Acessar minha conta</a></td></tr></table>`, "Sua conta Fuguete está pronta para jogar."),
        texto: `Bem-vindo, ${nome}!\n\nSua conta Fuguete foi criada com sucesso.\n\nAcesse: https://app.tiagofuguete.com.br\n\nFuguete — Magic: The Gathering, torneios e comunidade.`,
    };
}

export function criarEmailResetSenha(nome: string, link: string): { html: string; texto: string } {
    const nomeSeguro = escaparHtml(nome);
    const linkSeguro = escaparHtml(link);
    return {
        html: layoutEmail(`
<h1 style="margin:0 0 16px;font-size:28px;line-height:36px;color:${cores.texto};">Redefina sua senha</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:25px;color:${cores.suave};">Olá, ${nomeSeguro}. Recebemos uma solicitação para alterar a senha da sua conta.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:25px;color:${cores.suave};">Use o botão abaixo em até <strong style="color:${cores.texto};">1 hora</strong>. Depois disso, será necessário solicitar um novo link.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:8px;background:${cores.botao};"><a href="${linkSeguro}" style="display:inline-block;padding:14px 24px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;">Criar nova senha</a></td></tr></table>
<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:${cores.suave};">Se você não fez esta solicitação, ignore este e-mail. Sua senha continuará a mesma.</p>
<p style="margin:16px 0 0;font-size:12px;line-height:18px;color:${cores.suave};word-break:break-all;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${linkSeguro}" style="color:${cores.marca};">${linkSeguro}</a></p>`, "Use este link para redefinir sua senha Fuguete."),
        texto: `Olá, ${nome}.\n\nRecebemos uma solicitação para redefinir sua senha. O link expira em 1 hora:\n${link}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
    };
}
