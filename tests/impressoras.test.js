// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'

// O bootstrap real não existe nos testes: usamos um modal de mentira
class ModalFalso { show() {} hide() {} dispose() {} }

const $ = (seletor) => document.querySelector(seletor)
const $$ = (seletor) => document.querySelectorAll(seletor)
const digitar = (el, valor, evento = 'input') => {
  el.value = valor
  el.dispatchEvent(new Event(evento, { bubbles: true }))
}

const imprimirPrimeira = () => $('#livres .col .btn-outline-warning').click()
const concluirPrimeira = () => $('#imprimindo .col .btn-outline-success').click()

let tela

beforeEach(async () => {
  vi.resetModules()
  globalThis.bootstrap = { Modal: ModalFalso }
  globalThis.alert = vi.fn()
  carregarHtml('impressoras', 'impressoras')
  tela = await import('../public/pages/impressoras/impressoras.js')
  tela.iniciar()
})

afterEach(() => tela.destruir())

describe('seções Livres e Imprimindo', () => {
  it('Livres mostra as 4 impressoras e esconde o botão "Ver todos"', () => {
    expect($('#livres .badge').textContent).toBe('4')
    expect($('#livres .ms-auto').textContent).toBe('Mostrando 4 de 4')
    expect($('#livres .btn-ver').classList.contains('d-none')).toBe(true)
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
})

describe('fluxo de impressão', () => {
  it('Imprimir move a impressora de Livres para Imprimindo com o próximo pedido', () => {
    imprimirPrimeira()

    expect($$('#livres .col').length).toBe(3)
    expect($$('#imprimindo .col').length).toBe(7)
    expect($('#imprimindo').textContent).toContain('Pedido 6520 · Órtese de cotovelo')
    expect($('#livres .ms-auto').textContent).toBe('Mostrando 3 de 3')
  })

  it('Concluir devolve a impressora para Livres', () => {
    concluirPrimeira()

    expect($$('#imprimindo .col').length).toBe(5)
    expect($$('#livres .col').length).toBe(5)
    expect($('#livres .ms-auto').textContent).toBe('Mostrando 5 de 5')
  })

  it('avisa quando acabam os pedidos pendentes da AACD', () => {
    for (let i = 0; i < 5; i++) {
      imprimirPrimeira()
      concluirPrimeira()
    }
    expect(globalThis.alert).not.toHaveBeenCalled()

    imprimirPrimeira() // 6º pedido: a fila já acabou

    expect(globalThis.alert).toHaveBeenCalledTimes(1)
    expect($$('#livres .col').length).toBe(4)
  })
})

describe('cancelar impressão', () => {
  it('só habilita o botão com motivo e justificativa', () => {
    $('#imprimindo .col .btn-outline-danger').click()

    const confirmar = $('#cancelar-confirmar')
    expect($('#cancelar-titulo').textContent).toBe('Pedido 6502 · Prótese de mão')
    expect(confirmar.disabled).toBe(true)

    digitar($('#cancelar-motivo'), 'Falha na impressora', 'change')
    expect(confirmar.disabled).toBe(true)

    digitar($('#cancelar-just'), 'Bico entupiu')
    expect(confirmar.disabled).toBe(false)
    expect($('#cancelar-contador').textContent).toBe('12/300')
  })

  it('confirmar devolve a impressora para Livres', () => {
    $('#imprimindo .col .btn-outline-danger').click()
    digitar($('#cancelar-motivo'), 'Erro no arquivo', 'change')
    digitar($('#cancelar-just'), 'Arquivo corrompido')
    $('#cancelar-confirmar').click()

    expect($$('#imprimindo .col').length).toBe(5)
    expect($$('#livres .col').length).toBe(5)
  })
})

describe('remover impressora', () => {
  it('confirma o nome no modal e remove o card', () => {
    $('#livres .col .btn-outline-danger').click()
    expect($('#remover-nome').textContent).toBe('Ender 3 V2')

    $('#remover-confirmar').click()
    expect($$('#livres .col').length).toBe(3)
    expect($('#livres').textContent).not.toContain('Ender 3 V2')
  })
})

describe('editar impressora', () => {
  beforeEach(() => $('#livres .col .btn-outline-secondary').click())

  it('preenche o modal com os dados do card', () => {
    expect($('#editar-nome').value).toBe('Ender 3 V2')
    expect([$('#editar-x').value, $('#editar-y').value, $('#editar-z').value]).toEqual(['220', '220', '250'])
    expect($('#editar-filamento').checked).toBe(true)
  })

  it('salvar atualiza nome, capacidade e selo de filamento', () => {
    digitar($('#editar-nome'), 'Ender 3 S1')
    digitar($('#editar-x'), '300')
    $('#editar-filamento').checked = false
    $('#editar-salvar').click()

    const card = $('#livres .col')
    expect(card.querySelector('h3').textContent).toBe('Ender 3 S1')
    expect(card.querySelector('p').textContent).toBe('Capacidade: 300 × 220 × 250 mm')
    expect(card.querySelector('.badge').textContent).toBe('Sem filamento')
  })

  it('esconde o campo "Tipo" quando a tecnologia não é FDM', () => {
    digitar($('#editar-tecnologia'), 'SLA', 'change')
    expect($('#editar-tipo-div').classList.contains('d-none')).toBe(true)

    digitar($('#editar-tecnologia'), 'FDM', 'change')
    expect($('#editar-tipo-div').classList.contains('d-none')).toBe(false)
  })
})

describe('adicionar impressora', () => {
  beforeEach(() => $('#btn-adicionar').click())

  it('mostra erro se faltar campo e não cria o card', () => {
    $('#adicionar-salvar').click()

    expect($('#adicionar-erro').classList.contains('d-none')).toBe(false)
    expect($$('#livres .col').length).toBe(4)
  })

  it('cria o card em Livres e limpa o formulário', () => {
    digitar($('#adicionar-modelo'), 'Bambu Lab P1S')
    digitar($('#adicionar-x'), '256')
    digitar($('#adicionar-y'), '256')
    digitar($('#adicionar-z'), '256')
    $('#adicionar-filamento').checked = true
    $('#adicionar-salvar').click()

    const cards = $$('#livres .col')
    const novo = cards[cards.length - 1]
    expect(cards.length).toBe(5)
    expect(novo.querySelector('h3').textContent).toBe('Bambu Lab P1S')
    expect(novo.querySelector('p').textContent).toBe('Capacidade: 256 × 256 × 256 mm')
    expect(novo.querySelector('.badge').textContent).toBe('Filamento incluso')
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