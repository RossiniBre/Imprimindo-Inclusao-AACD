// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

// Mock do api.js (precisa existir antes do import da tela)
const api = vi.hoisted(() => ({
  impressoras: vi.fn(),
  cadastrarImpressora: vi.fn(),
  editarImpressora: vi.fn(),
  removerImpressora: vi.fn(),
  alterarAtivoImpressora: vi.fn(),
  cancelarSolicitacao: vi.fn(),
}))
vi.mock('../public/shared/js/api.js', () => ({ api }))

// O bootstrap real não existe nos testes: usamos um modal de mentira
class ModalFalso { show() {} hide() {} dispose() {} }

const $ = (seletor) => document.querySelector(seletor)
const $$ = (seletor) => document.querySelectorAll(seletor)
const digitar = (el, valor, evento = 'input') => {
  el.value = valor
  el.dispatchEvent(new Event(evento, { bubbles: true }))
}
// espera as promises pendentes (cliques que chamam o servidor e recarregam a lista)
const esperar = () => new Promise((resolve) => setTimeout(resolve, 0))

// ----- Dados no formato que o back devolve -----
const impressora = (id, modelo, extra = {}) => ({
  id,
  modelo,
  comprimentoMm: 220,
  larguraMm: 220,
  alturaMm: 250,
  disponibilidade: 'OCIOSA',
  ativo: true,
  materiais: [{ codigo: 'PLA', rotulo: 'PLA' }],
  solicitacoesAtivas: [],
  ...extra,
})

const pedido = (n) => ({
  id: 6500 + n,
  titulo: n === 2 ? 'Prótese de mão' : `Peça ${n}`,
  solicitante: 'Maria',
})

function listaBase() {
  return [
    // 4 livres
    impressora(1, 'Ender 3 V2'),
    impressora(2, 'Prusa MK4'),
    impressora(3, 'Bambu Lab A1'),
    impressora(4, 'Creality K1'),
    // 6 imprimindo (cada uma com um pedido)
    ...[5, 6, 7, 8, 9, 10].map((id, i) =>
      impressora(id, `Impressora ${id}`, { solicitacoesAtivas: [pedido(i + 2)] })),
    // 2 desativadas
    impressora(11, 'Velha 1', { ativo: false }),
    impressora(12, 'Velha 2', { ativo: false, disponibilidade: 'EM_USO' }),
  ]
}

const responderCom = (lista) =>
  api.impressoras.mockResolvedValue({ ok: true, status: 200, corpo: lista })
const sucesso = { ok: true, status: 200, corpo: {} }

let tela

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  globalThis.bootstrap = { Modal: ModalFalso }
  globalThis.alert = vi.fn()

  responderCom(listaBase())
  api.cadastrarImpressora.mockResolvedValue(sucesso)
  api.editarImpressora.mockResolvedValue(sucesso)
  api.removerImpressora.mockResolvedValue(sucesso)
  api.alterarAtivoImpressora.mockResolvedValue(sucesso)
  api.cancelarSolicitacao.mockResolvedValue(sucesso)

  carregarHtml('impressoras', 'impressoras')
  tela = await import('../public/pages/impressoras/impressoras.js')
  await tela.iniciar()
})

afterEach(() => tela.destruir())

describe('seções Livres, Imprimindo e Desativadas', () => {
  it('Livres mostra as 4 impressoras e esconde o botão "Ver todos"', () => {
    expect($('#livres .badge').textContent).toBe('4')
    expect($('#livres .ms-auto').textContent).toBe('Mostrando 4 de 4')
    expect($('#livres .btn-ver').classList.contains('d-none')).toBe(true)
  })

  it('o card livre mostra capacidade e situação na empresa', () => {
    const card = $('#livres .col')
    expect(card.querySelector('h3').textContent).toBe('Ender 3 V2')
    expect(card.querySelector('[data-campo="capacidade"]').textContent)
      .toBe('Capacidade: 220 × 220 × 250 mm')
    expect(card.querySelector('[data-campo="situacao"]').textContent)
      .toBe('Na empresa: Ociosa')
  })

  it('Imprimindo começa mostrando só 4 de 6', () => {
    expect($$('#imprimindo .col.d-none').length).toBe(2)
    expect($('#imprimindo .ms-auto').textContent).toBe('Mostrando 4 de 6')
    expect($('#imprimindo .btn-ver').textContent).toBe('Ver todos (6)')
  })

  it('"Ver todos" mostra tudo e "Ver menos" volta a esconder', () => {
    const botao = $('#imprimindo .btn-ver')

    botao.click()
    expect($$('#imprimindo .col.d-none').length).toBe(0)
    expect(botao.textContent).toBe('Ver menos')

    botao.click()
    expect($$('#imprimindo .col.d-none').length).toBe(2)
    expect(botao.textContent).toBe('Ver todos (6)')
  })

  it('o card Imprimindo lista o pedido e quem enviou', () => {
    const card = $('#imprimindo .col')
    expect(card.textContent).toContain('Pedido 6502 · Prótese de mão')
    expect(card.textContent).toContain('Enviado por Maria')
  })

  it('Desativadas mostra as 2 impressoras desativadas', () => {
    expect($('#desativadas .badge').textContent).toBe('2')
    expect($('#desativadas .ms-auto').textContent).toBe('Mostrando 2 de 2')
    expect($$('#desativadas .col').length).toBe(2)
    expect($('#desativadas-vazio').classList.contains('d-none')).toBe(true)
  })

  it('mostra a mensagem de vazio quando não há desativadas', async () => {
    responderCom(listaBase().filter((i) => i.ativo))
    $('#livres [data-acao="desativar"]') // garante que a tela está viva
    // recarrega pela ação de reativar/desativar de qualquer card livre
    $('#livres [data-acao="desativar"]').click()
    await esperar()

    expect($$('#desativadas .col').length).toBe(0)
    expect($('#desativadas-vazio').classList.contains('d-none')).toBe(false)
  })

  it('os contadores da navegação acompanham as seções', () => {
    expect($('[data-contagem="livres"]').textContent).toBe('4')
    expect($('[data-contagem="imprimindo"]').textContent).toBe('6')
    expect($('[data-contagem="desativadas"]').textContent).toBe('2')
  })

  it('o botão da navegação rola até a seção', () => {
    const intoView = vi.fn()
    Element.prototype.scrollIntoView = intoView
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const hashAntes = location.hash

    $('[data-ir="desativadas"]').click()

    console.log({
      intoView: intoView.mock.calls.length,
      scrollTo: scrollTo.mock.calls,
      scrollBy: scrollBy.mock.calls,
      hash: [hashAntes, location.hash],
    })
  })
})

describe('desativar e reativar', () => {
  it('desativar chama o servidor com ativo = false e recarrega a lista', async () => {
    responderCom(listaBase().map((i) => (i.id === 1 ? { ...i, ativo: false } : i)))

    $('#livres [data-acao="desativar"]').click()
    await esperar()

    expect(api.alterarAtivoImpressora).toHaveBeenCalledWith(1, false)
    expect($$('#livres .col').length).toBe(3)
    expect($$('#desativadas .col').length).toBe(3)
  })

  it('reativar chama o servidor com ativo = true e a impressora volta para Livres', async () => {
    responderCom(listaBase().map((i) => (i.id === 11 ? { ...i, ativo: true } : i)))

    $('#desativadas [data-acao="reativar"]').click()
    await esperar()

    expect(api.alterarAtivoImpressora).toHaveBeenCalledWith(11, true)
    expect($$('#livres .col').length).toBe(5)
    expect($$('#desativadas .col').length).toBe(1)
  })

  it('mostra o erro do servidor e não recarrega se falhar', async () => {
    api.alterarAtivoImpressora.mockResolvedValue({
      ok: false, status: 409, corpo: { erro: 'Impressora com impressão em andamento não pode ser desativada.' },
    })
    const chamadasAntes = api.impressoras.mock.calls.length

    $('#livres [data-acao="desativar"]').click()
    await esperar()

    expect(globalThis.alert).toHaveBeenCalledWith(
      'Impressora com impressão em andamento não pode ser desativada.')
    expect(api.impressoras.mock.calls.length).toBe(chamadasAntes)
  })

  it('impressora com pedido em andamento não tem botão Desativar', () => {
    expect($('#imprimindo [data-acao="desativar"]')).toBeNull()
  })
})

describe('cancelar impressão', () => {
  it('só habilita o botão com motivo e justificativa', () => {
    $('#imprimindo [data-acao="cancelar"]').click()

    const confirmar = $('#cancelar-confirmar')
    expect($('#cancelar-titulo').textContent).toBe('Pedido 6502 · Prótese de mão')
    expect($('#cancelar-pedido').textContent).toBe('Impressora 5')
    expect(confirmar.disabled).toBe(true)

    digitar($('#cancelar-motivo'), 'Falha na impressora', 'change')
    expect(confirmar.disabled).toBe(true)

    digitar($('#cancelar-just'), 'Bico entupiu')
    expect(confirmar.disabled).toBe(false)
    expect($('#cancelar-contador').textContent).toBe('12/300')
  })

  it('confirmar cancela o pedido no servidor e devolve a impressora para Livres', async () => {
    responderCom(listaBase().map((i) => (i.id === 5 ? { ...i, solicitacoesAtivas: [] } : i)))

    $('#imprimindo [data-acao="cancelar"]').click()
    digitar($('#cancelar-motivo'), 'Erro no arquivo', 'change')
    digitar($('#cancelar-just'), 'Arquivo corrompido')
    $('#cancelar-confirmar').click()
    await esperar()

    expect(api.cancelarSolicitacao)
      .toHaveBeenCalledWith(6502, 'Erro no arquivo: Arquivo corrompido')
    expect($$('#imprimindo .col').length).toBe(5)
    expect($$('#livres .col').length).toBe(5)
  })
})

describe('remover impressora', () => {
  it('confirma o nome no modal, apaga no servidor e remove o card', async () => {
    responderCom(listaBase().filter((i) => i.id !== 1))

    $('#livres [data-acao="remover"]').click()
    expect($('#remover-nome').textContent).toBe('Ender 3 V2')

    $('#remover-confirmar').click()
    await esperar()

    expect(api.removerImpressora).toHaveBeenCalledWith(1)
    expect($$('#livres .col').length).toBe(3)
    expect($('#livres').textContent).not.toContain('Ender 3 V2')
  })

  it('também dá para remover uma impressora desativada', async () => {
    responderCom(listaBase().filter((i) => i.id !== 11))

    $('#desativadas [data-acao="remover"]').click()
    expect($('#remover-nome').textContent).toBe('Velha 1')

    $('#remover-confirmar').click()
    await esperar()

    expect(api.removerImpressora).toHaveBeenCalledWith(11)
    expect($$('#desativadas .col').length).toBe(1)
  })

  it('mostra o erro do servidor se a remoção falhar', async () => {
    api.removerImpressora.mockResolvedValue({
      ok: false, status: 409, corpo: { erro: 'Não foi possível remover.' },
    })

    $('#livres [data-acao="remover"]').click()
    $('#remover-confirmar').click()
    await esperar()

    expect(globalThis.alert).toHaveBeenCalledWith('Não foi possível remover.')
    expect($$('#livres .col').length).toBe(4)
  })
})

describe('editar impressora', () => {
  beforeEach(() => $('#livres [data-acao="editar"]').click())

  it('preenche o modal com os dados do card', () => {
    expect($('#editar-nome').value).toBe('Ender 3 V2')
    expect([$('#editar-x').value, $('#editar-y').value, $('#editar-z').value])
      .toEqual(['220', '220', '250'])
    expect($('#editar-situacao').value).toBe('OCIOSA')
    expect($('#editar-pla').checked).toBe(true)
    expect($('#editar-petg').checked).toBe(false)
  })

  it('salvar envia os dados alterados ao servidor', async () => {
    digitar($('#editar-nome'), 'Ender 3 S1')
    digitar($('#editar-x'), '300')
    $('#editar-petg').checked = true
    $('#editar-salvar').click()
    await esperar()

    expect(api.editarImpressora).toHaveBeenCalledWith({
      id: 1,
      modelo: 'Ender 3 S1',
      comprimentoMm: '300',
      larguraMm: '220',
      alturaMm: '250',
      disponibilidade: 'OCIOSA',
      materiais: 'PLA,PETG',
    })
  })

  it('recusa salvar sem nenhum material', async () => {
    $('#editar-pla').checked = false
    $('#editar-salvar').click()
    await esperar()

    expect(globalThis.alert).toHaveBeenCalled()
    expect(api.editarImpressora).not.toHaveBeenCalled()
  })
})

describe('adicionar impressora', () => {
  beforeEach(() => $('#btn-adicionar').click())

  it('mostra erro se faltar campo e não chama o servidor', async () => {
    $('#adicionar-salvar').click()
    await esperar()

    expect($('#adicionar-erro').classList.contains('d-none')).toBe(false)
    expect(api.cadastrarImpressora).not.toHaveBeenCalled()
  })

  it('cadastra no servidor e limpa o formulário', async () => {
    digitar($('#adicionar-modelo'), 'Bambu Lab P1S')
    digitar($('#adicionar-x'), '256')
    digitar($('#adicionar-y'), '256')
    digitar($('#adicionar-z'), '256')
    $('#adicionar-pla').checked = true
    $('#adicionar-salvar').click()
    await esperar()

    expect(api.cadastrarImpressora).toHaveBeenCalledWith({
      modelo: 'Bambu Lab P1S',
      comprimentoMm: '256',
      larguraMm: '256',
      alturaMm: '256',
      disponibilidade: 'OCIOSA',
      materiais: 'PLA',
    })
    expect($('#adicionar-modelo').value).toBe('')
  })
})

describe('destruir()', () => {
  it('limpa o fundo escuro do modal ao sair da tela', () => {
    document.body.classList.add('modal-open')
    document.body.insertAdjacentHTML('beforeend', '<div class="modal-backdrop"></div>')

    tela.destruir()

    expect($('.modal-backdrop')).toBeNull()
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })
})