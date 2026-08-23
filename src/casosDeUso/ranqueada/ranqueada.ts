import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { RanqueadaGateway } from "../../dominio/gateway/ranqueadaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { calcularDeltaElo, classificarRankingRanqueado, criarPartidaRanqueada, divisaoRanqueada, EntradaFilaRanqueada, EstadoRanqueado, PartidaRanqueada, PunicaoRanqueada, RankingRanqueado } from "../../dominio/entidade/ranqueada";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { eventosRanqueada } from "../../infra/socketio/eventosRanqueada";

export class Ranqueada {
  private constructor(private repo: RanqueadaGateway, private decks: DeckGateway, private usuarios: UsuarioGateway, private inscricoes: InscricaoGateway, private partidasTorneio: PartidaGateway) {}
  public static criar(repo: RanqueadaGateway, decks: DeckGateway, usuarios: UsuarioGateway, inscricoes: InscricaoGateway, partidasTorneio: PartidaGateway) { return new Ranqueada(repo, decks, usuarios, inscricoes, partidasTorneio); }

  public async entrarFila(input: { jogadorId: string; jogadorNome: string; deckId: string }) {
    const deck = await this.decks.buscarPorId(input.deckId);
    if (!deck) throw ErroPersonalizado.criar({ mensagem: "Deck não encontrado.", status: 404 });
    if (deck.usuarioId !== input.jogadorId) throw ErroPersonalizado.criar({ mensagem: "Você só pode jogar com um deck seu.", status: 403 });
    if (deck.travado || deck.torneioId) throw ErroPersonalizado.criar({ mensagem: "Este deck está vinculado a um torneio.", status: 400 });
    if (await this.repo.buscarEntrada(input.jogadorId)) throw ErroPersonalizado.criar({ mensagem: "Você já está na fila.", status: 409 });
    if (!await this.possuiVitoriaEmTorneio(input.jogadorId)) throw ErroPersonalizado.criar({ mensagem: "Para acessar as ranqueadas, você precisa vencer pelo menos uma partida em um evento de torneio.", status: 403 });
    const punicao = await this.repo.buscarPunicao(input.jogadorId);
    if (punicao?.bloqueadoAte && new Date(punicao.bloqueadoAte).getTime() > Date.now()) throw ErroPersonalizado.criar({ mensagem: `Você está bloqueado da fila ranqueada até ${new Date(punicao.bloqueadoAte).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`, status: 403 });
    const usuario = await this.usuarios.buscarPorId(input.jogadorId);
    const nickMTGO = usuario?.nickMTGO?.trim();
    if (!nickMTGO) throw ErroPersonalizado.criar({ mensagem: "Cadastre seu nick MTGO no perfil antes de entrar na fila.", status: 400 });
    const formato = deck.formato.toLowerCase().trim();
    const ranking = await this.obterRanking(input.jogadorId, nickMTGO, formato);
    const divisao = await this.divisaoAtual(ranking);
    const atual = await this.repo.buscarEstado(input.jogadorId, formato);
    if (atual?.partidaId) throw ErroPersonalizado.criar({ mensagem: "Você já possui uma partida em andamento.", status: 409 });
    if (atual?.deckCampanhaId && atual.deckCampanhaId !== deck.id) throw ErroPersonalizado.criar({ mensagem: `O deck da campanha está travado como ${atual.deckCampanhaNome ?? "o deck selecionado"} até o fim das 5 partidas.`, status: 409 });
    const snapshot = atual?.deckCampanha ?? { id: deck.id, nome: deck.nome, formato: deck.formato, maindeck: deck.maindeck, sideboard: deck.sideboard, commander: deck.commander };
    const estado: EstadoRanqueado = atual ? { ...atual, partidasCampanha: atual.partidasCampanha ?? atual.vitoriasCampanha + atual.derrotasCampanha, deckCampanhaId: atual.deckCampanhaId ?? deck.id, deckCampanhaNome: atual.deckCampanhaNome ?? deck.nome, deckCampanha: snapshot } : { jogadorId: input.jogadorId, formato, vitoriasCampanha: 0, derrotasCampanha: 0, partidasCampanha: 0, deckCampanhaId: deck.id, deckCampanhaNome: deck.nome, deckCampanha: snapshot, partidaId: null };
    const entrada: EntradaFilaRanqueada = { jogadorId: input.jogadorId, jogadorNome: nickMTGO, deckId: estado.deckCampanhaId!, deckNome: estado.deckCampanhaNome!, deckSnapshot: estado.deckCampanha!, formato, vitoriasCampanha: estado.vitoriasCampanha, derrotasCampanha: estado.derrotasCampanha, partidasCampanha: estado.partidasCampanha, ultimoOponenteId: estado.ultimoOponenteId ?? null, rating: ranking.rating, divisao, entrouEm: new Date().toISOString() };
    await this.repo.entrarNaFila(entrada, estado);
    await this.tentarParear(entrada);
    this.emitir([input.jogadorId], "fila_atualizada", { formato });
    return this.status(input.jogadorId, formato);
  }

  public async sairFila(jogadorId: string) {
    const entrada = await this.repo.buscarEntrada(jogadorId);
    if (entrada) await this.repo.sairDaFila(entrada);
    this.emitir([jogadorId], "fila_atualizada", { naFila: false });
    return { mensagem: "Você saiu da fila." };
  }

  public async abandonarCampanha(jogadorId: string, formato: string) {
    const formatoNormalizado = formato.toLowerCase().trim();
    const estado = await this.repo.buscarEstado(jogadorId, formatoNormalizado);
    if (!estado?.deckCampanhaId) throw ErroPersonalizado.criar({ mensagem: "Você não possui uma campanha ativa neste formato.", status: 404 });
    if (estado.partidaId) throw ErroPersonalizado.criar({ mensagem: "Finalize ou conteste a partida atual antes de abandonar a campanha.", status: 409 });
    const entrada = await this.repo.buscarEntrada(jogadorId);
    if (entrada && entrada.formato !== formatoNormalizado) throw ErroPersonalizado.criar({ mensagem: "Saia da fila atual antes de abandonar esta campanha.", status: 409 });
    const resetada: EstadoRanqueado = { jogadorId, formato: formatoNormalizado, vitoriasCampanha: 0, derrotasCampanha: 0, partidasCampanha: 0, deckCampanhaId: null, deckCampanhaNome: null, deckCampanha: null, ultimoOponenteId: estado.ultimoOponenteId ?? null, partidaId: null };
    if (!await this.repo.abandonarCampanha(resetada, entrada)) throw ErroPersonalizado.criar({ mensagem: "A fila foi alterada. Atualize e tente novamente.", status: 409 });
    this.emitir([jogadorId], "campanha_abandonada", { formato: formatoNormalizado });
    return { mensagem: "Campanha abandonada. Seu rating foi mantido.", campanha: resetada };
  }

  public async status(jogadorId: string, formato?: string) {
    const entrada = await this.repo.buscarEntrada(jogadorId);
    if (entrada) await this.tentarParear(entrada);
    const fila = await this.repo.buscarEntrada(jogadorId);
    const formatoAtual = formato ?? fila?.formato;
    let campanha = formatoAtual ? await this.repo.buscarEstado(jogadorId, formatoAtual) : null;
    let partida = campanha?.partidaId ? await this.repo.buscarPartida(campanha.partidaId) : null;
    if (partida?.status === "aguardando_confirmacao" && partida.confirmarAte && new Date(partida.confirmarAte).getTime() <= Date.now()) {
      try { await this.aplicarResultado(partida, jogadorId, "aguardando_confirmacao"); } catch (error) { if (!(error instanceof ErroPersonalizado) || error.status !== 409) throw error; }
      campanha = formatoAtual ? await this.repo.buscarEstado(jogadorId, formatoAtual) : null;
      partida = campanha?.partidaId ? await this.repo.buscarPartida(campanha.partidaId) : null;
    }
    const ranking = formatoAtual ? await this.repo.buscarRanking(jogadorId, formatoAtual) : null;
    const punicao = await this.repo.buscarPunicao(jogadorId);
    return { naFila: Boolean(fila), fila, campanha, partida, ranking: ranking ? { ...ranking, divisao: divisaoRanqueada(ranking.rating) } : null, punicao };
  }

  public async registrarResultado(input: { jogadorId: string; partidaId: string; vencedorId: string | null }) {
    const partida = await this.validarPartidaParticipante(input.partidaId, input.jogadorId);
    if (partida.status !== "pendente") throw ErroPersonalizado.criar({ mensagem: "Esta partida já possui um resultado reportado.", status: 409 });
    const ids = [partida.jogador1Id, partida.jogador2Id];
    if (input.vencedorId !== null && !ids.includes(input.vencedorId)) throw ErroPersonalizado.criar({ mensagem: "Vencedor inválido.", status: 400 });
    const agora = new Date();
    const proposta: PartidaRanqueada = { ...partida, status: "aguardando_confirmacao", vencedorId: input.vencedorId, resultadoReportadoPor: input.jogadorId, atualizadoEm: agora.toISOString(), confirmarAte: new Date(agora.getTime() + 90_000).toISOString() };
    if (!await this.repo.atualizarPartida(proposta, "pendente")) throw ErroPersonalizado.criar({ mensagem: "Outro resultado já foi reportado.", status: 409 });
    this.emitir(ids, "resultado_reportado", { partidaId: partida.id });
    return proposta;
  }

  public async confirmarResultado(input: { jogadorId: string; partidaId: string }) {
    const partida = await this.validarPartidaParticipante(input.partidaId, input.jogadorId);
    if (partida.status !== "aguardando_confirmacao") throw ErroPersonalizado.criar({ mensagem: "Não há resultado aguardando confirmação.", status: 409 });
    if (partida.resultadoReportadoPor === input.jogadorId) throw ErroPersonalizado.criar({ mensagem: "O resultado deve ser confirmado pelo adversário.", status: 403 });
    return this.aplicarResultado(partida, input.jogadorId, "aguardando_confirmacao");
  }

  public async contestarResultado(input: { jogadorId: string; partidaId: string; observacao?: string; evidenciaUrl?: string; tipoContestacao?: "resultado" | "deck" }) {
    const partida = await this.validarPartidaParticipante(input.partidaId, input.jogadorId);
    if (partida.status !== "aguardando_confirmacao") throw ErroPersonalizado.criar({ mensagem: "Não há resultado disponível para contestação.", status: 409 });
    if (partida.resultadoReportadoPor === input.jogadorId) throw ErroPersonalizado.criar({ mensagem: "Você não pode contestar o próprio reporte.", status: 403 });
    const tipoContestacao = input.tipoContestacao ?? "resultado";
    if (tipoContestacao === "deck" && !input.evidenciaUrl) throw ErroPersonalizado.criar({ mensagem: "Envie uma foto que comprove a divergência do deck.", status: 400 });
    const acusadoId = tipoContestacao === "deck" ? (partida.jogador1Id === input.jogadorId ? partida.jogador2Id : partida.jogador1Id) : undefined;
    const contestada: PartidaRanqueada = { ...partida, status: "contestada", tipoContestacao, acusadoId, contestadoPor: input.jogadorId, observacaoContestacao: input.observacao?.trim() || null, evidenciaUrl: input.evidenciaUrl ?? null, atualizadoEm: new Date().toISOString() };
    const ids = [partida.jogador1Id, partida.jogador2Id];
    const atuais = await Promise.all(ids.map((id) => this.repo.buscarEstado(id, partida.formato)));
    const estadosLiberados = ids.map((id, i): EstadoRanqueado => ({
      jogadorId: id,
      formato: partida.formato,
      vitoriasCampanha: atuais[i]?.vitoriasCampanha ?? 0,
      derrotasCampanha: atuais[i]?.derrotasCampanha ?? 0,
      partidasCampanha: atuais[i]?.partidasCampanha ?? (atuais[i]?.vitoriasCampanha ?? 0) + (atuais[i]?.derrotasCampanha ?? 0),
      deckCampanhaId: atuais[i]?.deckCampanhaId ?? null,
      deckCampanhaNome: atuais[i]?.deckCampanhaNome ?? null,
      deckCampanha: atuais[i]?.deckCampanha ?? null,
      ultimoOponenteId: atuais[i]?.ultimoOponenteId ?? null,
      partidaId: null,
    }));
    if (!await this.repo.contestarPartida(contestada, estadosLiberados)) throw ErroPersonalizado.criar({ mensagem: "O estado da partida foi alterado. Atualize e tente novamente.", status: 409 });
    this.emitir(ids, "resultado_contestado", { partidaId: partida.id });
    eventosRanqueada.emit("contestacao_atualizada", { partidaId: partida.id });
    return contestada;
  }

  public async ajustarResultado(input: { isAdmin: boolean; partidaId: string; vencedorId: string | null; usuarioId: string }) {
    if (!input.isAdmin) throw ErroPersonalizado.criar({ mensagem: "Apenas administradores podem resolver contestações.", status: 403 });
    const partida = await this.repo.buscarPartida(input.partidaId);
    if (!partida) throw ErroPersonalizado.criar({ mensagem: "Partida ranqueada não encontrada.", status: 404 });
    if (partida.status !== "contestada") throw ErroPersonalizado.criar({ mensagem: "A partida não está contestada.", status: 409 });
    if (partida.tipoContestacao === "deck") throw ErroPersonalizado.criar({ mensagem: "Use a resolução de contestação de deck.", status: 400 });
    const ids = [partida.jogador1Id, partida.jogador2Id];
    if (input.vencedorId !== null && !ids.includes(input.vencedorId)) throw ErroPersonalizado.criar({ mensagem: "Vencedor inválido.", status: 400 });
    return this.aplicarResultado({ ...partida, vencedorId: input.vencedorId }, input.usuarioId, "contestada");
  }

  public async resolverContestacaoDeck(input: { isAdmin: boolean; partidaId: string; procedente: boolean; usuarioId: string }) {
    if (!input.isAdmin) throw ErroPersonalizado.criar({ mensagem: "Apenas administradores podem resolver contestações.", status: 403 });
    const partida = await this.repo.buscarPartida(input.partidaId);
    if (!partida || partida.status !== "contestada" || partida.tipoContestacao !== "deck" || !partida.acusadoId) throw ErroPersonalizado.criar({ mensagem: "Contestação de deck não encontrada.", status: 404 });
    const vencedorId = input.procedente ? (partida.acusadoId === partida.jogador1Id ? partida.jogador2Id : partida.jogador1Id) : partida.vencedorId ?? null;
    const resultado = await this.aplicarResultado({ ...partida, vencedorId }, input.usuarioId, "contestada");
    const punicao = input.procedente ? await this.aplicarWarning(partida.acusadoId) : null;
    if (punicao) this.emitir([partida.acusadoId], "punicao_atualizada", { warnings: punicao.warnings, bloqueadoAte: punicao.bloqueadoAte });
    return { ...resultado, warningAplicado: input.procedente, punicao };
  }

  public async ranking(formato: string, jogadorId?: string) {
    return classificarRankingRanqueado(await this.repo.listarRanking(formato.toLowerCase().trim())).slice(0, 100).map((item, i) => ({ ...item, posicao: i + 1, eu: item.jogadorId === jogadorId }));
  }

  public async listarContestacoes(isAdmin: boolean) {
    if (!isAdmin) throw ErroPersonalizado.criar({ mensagem: "Apenas administradores podem listar contestações.", status: 403 });
    return (await this.repo.listarContestadas()).sort((a, b) => (b.atualizadoEm ?? b.criadoEm).localeCompare(a.atualizadoEm ?? a.criadoEm));
  }

  public async historico(jogadorId: string) {
    return (await this.repo.listarHistorico(jogadorId))
      .sort((a, b) => (b.atualizadoEm ?? b.criadoEm).localeCompare(a.atualizadoEm ?? a.criadoEm))
      .slice(0, 100)
      .map((partida) => {
        const jogador1 = partida.jogador1Id === jogadorId;
        const resultado = partida.status !== "finalizada" ? null : partida.vencedorId === null ? "empate" : partida.vencedorId === jogadorId ? "vitoria" : "derrota";
        return { ...partida, oponenteId: jogador1 ? partida.jogador2Id : partida.jogador1Id, oponenteNome: jogador1 ? partida.jogador2Nome : partida.jogador1Nome, meuDeck: jogador1 ? partida.deckJogador1 : partida.deckJogador2, resultado, meuDelta: jogador1 ? partida.deltaJogador1 ?? null : partida.deltaJogador2 ?? null };
      });
  }

  public async processarConfirmacoesExpiradas(agora = new Date()) {
    const pendentes = await this.repo.listarAguardandoConfirmacao();
    let processadas = 0;
    for (const partida of pendentes) {
      if (!partida.confirmarAte || new Date(partida.confirmarAte).getTime() > agora.getTime()) continue;
      try { await this.aplicarResultado(partida, partida.resultadoReportadoPor ?? partida.jogador1Id, "aguardando_confirmacao"); processadas++; }
      catch (error) { if (!(error instanceof ErroPersonalizado) || error.status !== 409) throw error; }
    }
    return { verificadas: pendentes.length, processadas };
  }

  private async aplicarResultado(partida: PartidaRanqueada, atorId: string, statusEsperado: "aguardando_confirmacao" | "contestada") {
    const ids = [partida.jogador1Id, partida.jogador2Id];
    const nomes = [partida.jogador1Nome, partida.jogador2Nome];
    const rankings = await Promise.all(ids.map((id, i) => this.obterRanking(id, nomes[i], partida.formato)));
    const resultado1: 0 | 0.5 | 1 = partida.vencedorId === null ? 0.5 : partida.vencedorId === ids[0] ? 1 : 0;
    const delta1 = calcularDeltaElo(rankings[0].rating, rankings[1].rating, resultado1);
    const agora = new Date().toISOString();
    const novos = rankings.map((r, i): RankingRanqueado => { const resultado = i === 0 ? resultado1 : (1 - resultado1) as 0 | 0.5 | 1; const delta = i === 0 ? delta1 : -delta1; return { ...r, rating: Math.max(0, r.rating + delta), vitorias: r.vitorias + +(resultado === 1), derrotas: r.derrotas + +(resultado === 0), empates: r.empates + +(resultado === 0.5), atualizadoEm: agora }; });
    const anteriores = await Promise.all(ids.map((id) => this.repo.buscarEstado(id, partida.formato)));
    const estados = ids.map((id, i): EstadoRanqueado => { let v = anteriores[i]?.vitoriasCampanha ?? 0; let d = anteriores[i]?.derrotasCampanha ?? 0; let total = (anteriores[i]?.partidasCampanha ?? v + d) + 1; if (partida.vencedorId === id) v++; else if (partida.vencedorId !== null) d++; const encerrouCampanha = total >= 5; if (encerrouCampanha) { v = 0; d = 0; total = 0; } return { jogadorId: id, formato: partida.formato, vitoriasCampanha: v, derrotasCampanha: d, partidasCampanha: total, deckCampanhaId: encerrouCampanha ? null : anteriores[i]?.deckCampanhaId ?? null, deckCampanhaNome: encerrouCampanha ? null : anteriores[i]?.deckCampanhaNome ?? null, deckCampanha: encerrouCampanha ? null : anteriores[i]?.deckCampanha ?? null, ultimoOponenteId: anteriores[i]?.ultimoOponenteId ?? (id === partida.jogador1Id ? partida.jogador2Id : partida.jogador1Id), partidaId: anteriores[i]?.partidaId === partida.id ? null : anteriores[i]?.partidaId ?? null }; });
    const finalizada: PartidaRanqueada = { ...partida, status: "finalizada", deltaJogador1: delta1, deltaJogador2: -delta1, finalizadoEm: agora, atualizadoEm: agora };
    if (!await this.repo.finalizar(finalizada, novos, estados, statusEsperado)) throw ErroPersonalizado.criar({ mensagem: "O resultado já foi processado.", status: 409 });
    this.emitir(ids, "resultado_confirmado", { partidaId: partida.id });
    if (statusEsperado === "contestada") eventosRanqueada.emit("contestacao_atualizada", { partidaId: partida.id });
    const leaderboard = await this.repo.listarRanking(partida.formato);
    const classificados = classificarRankingRanqueado([...leaderboard.filter((item) => !ids.includes(item.jogadorId)), ...novos]);
    const meu = classificados.find((item) => item.jogadorId === atorId);
    return { partida: finalizada, meuRanking: meu ?? null };
  }

  private async obterRanking(id: string, nome: string, formato: string): Promise<RankingRanqueado> { const existente = await this.repo.buscarRanking(id, formato); return existente ? { ...existente, jogadorNome: nome } : { jogadorId: id, jogadorNome: nome, formato, rating: 1000, vitorias: 0, derrotas: 0, empates: 0, atualizadoEm: new Date().toISOString() }; }
  private async divisaoAtual(ranking: RankingRanqueado) {
    const leaderboard = await this.repo.listarRanking(ranking.formato);
    return classificarRankingRanqueado([...leaderboard.filter((item) => item.jogadorId !== ranking.jogadorId), ranking]).find((item) => item.jogadorId === ranking.jogadorId)!.divisao;
  }
  private async tentarParear(entrada: EntradaFilaRanqueada) {
    const todos = (await this.repo.listarFila(entrada.formato)).filter((c) => c.jogadorId !== entrada.jogadorId);
    const ehRevanche = (c: EntradaFilaRanqueada) => entrada.ultimoOponenteId === c.jogadorId || c.ultimoOponenteId === entrada.jogadorId;
    const esperouTrintaSegundos = (e: EntradaFilaRanqueada) => Date.now() - new Date(e.entrouEm).getTime() >= 30_000;
    const ordenar = (lista: EntradaFilaRanqueada[]) => lista.sort((a, b) => this.custo(entrada, a) - this.custo(entrada, b));
    const diferentes = ordenar(todos.filter((c) => !ehRevanche(c)));
    const revanches = esperouTrintaSegundos(entrada) ? ordenar(todos.filter((c) => ehRevanche(c) && esperouTrintaSegundos(c))) : [];
    for (const candidato of [...diferentes, ...revanches]) { const partida = criarPartidaRanqueada(entrada, candidato); if (await this.repo.parear(entrada, candidato, partida)) { this.emitir([entrada.jogadorId, candidato.jogadorId], "partida_encontrada", { partidaId: partida.id, formato: partida.formato }); return; } }
  }
  private custo(a: EntradaFilaRanqueada, b: EntradaFilaRanqueada) { return Math.abs(a.vitoriasCampanha - b.vitoriasCampanha) * 100 + Math.abs(a.derrotasCampanha - b.derrotasCampanha) * 120 + Math.abs(a.rating - b.rating) * 0.1; }
  private async validarPartidaParticipante(partidaId: string, jogadorId: string) { const partida = await this.repo.buscarPartida(partidaId); if (!partida) throw ErroPersonalizado.criar({ mensagem: "Partida ranqueada não encontrada.", status: 404 }); if (![partida.jogador1Id, partida.jogador2Id].includes(jogadorId)) throw ErroPersonalizado.criar({ mensagem: "Você não participa desta partida.", status: 403 }); return partida; }
  private async possuiVitoriaEmTorneio(jogadorId: string) {
    const inscricoes = await this.inscricoes.listarPorUsuario(jogadorId);
    const torneioIds = [...new Set(inscricoes.map((inscricao) => inscricao.torneioId))];
    if (torneioIds.length === 0) return false;
    const partidas = await this.partidasTorneio.listarPorTorneios(torneioIds);
    return partidas.some((partida) => {
      if (partida.status !== "finalizada" || partida.jogador2Id === null) return false;
      if (partida.jogador1Id === jogadorId) return partida.vitoriasJogador1 > partida.vitoriasJogador2;
      if (partida.jogador2Id === jogadorId) return partida.vitoriasJogador2 > partida.vitoriasJogador1;
      return false;
    });
  }
  private emitir(jogadorIds: string[], evento: string, payload: Record<string, unknown>) { for (const jogadorId of jogadorIds) eventosRanqueada.emit(evento, { ...payload, jogadorId }); }
  private async aplicarWarning(jogadorId: string): Promise<PunicaoRanqueada> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const atual = await this.repo.buscarPunicao(jogadorId);
      const warnings = (atual?.warnings ?? 0) + 1;
      const punicao: PunicaoRanqueada = { jogadorId, warnings, bloqueadoAte: warnings >= 3 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : atual?.bloqueadoAte ?? null, atualizadoEm: new Date().toISOString() };
      if (await this.repo.salvarPunicao(punicao, atual?.warnings ?? 0)) return punicao;
    }
    throw new Error("Não foi possível aplicar o warning por conflito de concorrência.");
  }
}
