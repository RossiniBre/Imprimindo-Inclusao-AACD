import { describe, it, expect, beforeEach } from 'vitest'
import { carregarHtml } from './helpers/carregarTela.js'
import {
  filtrarImpressoras,
  agruparImpressoras,
  ufDaCidade,
  extensaoValida,
  formatarPrazo,
  montarDescricao,
  validar,
  validarPeca,
  validarArquivo,
  checagens,
} from '../public/pages/impressoras-aacd/impressoras-aacd.js'

const rede = [
  { id: 1, modelo: 'Ender 3 V2', disponibilidade: 'OCIOSA', empresa: { id: 10, nome: 'Nexa Engenharia' }, cidade: 'São Paulo, SP', materiais: [{ codigo: 'PLA' }, { codigo: 'PETG' }] },
  { id: 2, modelo: 'Prusa MK4', disponibilidade: 'EM_USO', empresa: { id: 11, nome: 'Órbita Tech' }, cidade: 'Santo André, SP', materiais: [{ codigo: 'ABS' }] },
  { id: 3, modelo: 'Creality K1', disponibilidade: 'OCIOSA', empresa: { id: 11, nome: 'Órbita Tech' }, cidade: 'Santo André, SP', materiais: [{ codigo: 'TPU' }] },
]

const impressora = {
  id: 1, disponibilidade: 'OCIOSA', comprimentoMm: 220, larguraMm: 220, alturaMm: 250,
  materiais: [{ codigo: 'PLA' }, { codigo: 'PETG' }],
}

const peca = {
  arquivo: { name: 'protese.stl', size: 1024 },
  titulo: 'Prótese de mão',
  quantidade: '1',
  material: 'PLA',
  comprimentoMm: '180',
  larguraMm: '95',
  alturaMm: '60',
  prazo: '',
  observacao: '',
}

describe('impressoras da rede: filtros', () => {
  it('"só livres" deixa só as OCIOSA', () => {
    expect(filtrarImpressoras(rede, { soLivres: true }).map((i) => i.id)).toEqual([1, 3])
  })

  it('filtra por material', () => {
    expect(filtrarImpressoras(rede, { material: 'ABS' }).map((i) => i.id)).toEqual([2])
  })

  it('busca ignora acento e maiúsculas e olha empresa, modelo, cidade e material', () => {
    expect(filtrarImpressoras(rede, { busca: 'orbita' }).map((i) => i.id)).toEqual([2, 3])
    expect(filtrarImpressoras(rede, { busca: 'ender' }).map((i) => i.id)).toEqual([1])
    expect(filtrarImpressoras(rede, { busca: 'santo andré' }).map((i) => i.id)).toEqual([2, 3])
    expect(filtrarImpressoras(rede, { busca: 'flexível' }).map((i) => i.id)).toEqual([3])
  })

  it('sem filtros devolve tudo', () => {
    expect(filtrarImpressoras(rede)).toHaveLength(3)
  })
})

describe('impressoras da rede: validação do pedido', () => {
  it('aceita só .stl, .obj e .3mf', () => {
    expect(extensaoValida('peca.STL')).toBe(true)
    expect(extensaoValida('peca.3mf')).toBe(true)
    expect(extensaoValida('peca.pdf')).toBe(false)
    expect(extensaoValida('semextensao')).toBe(false)
  })

  it('arquivo: obrigatório, formato e tamanho', () => {
    expect(validarArquivo(null)).toMatch(/Escolha/)
    expect(validarArquivo({ name: 'a.zip', size: 10 })).toMatch(/Formato/)
    expect(validarArquivo({ name: 'a.stl', size: 51 * 1024 * 1024 })).toMatch(/50 MB/)
    expect(validarArquivo({ name: 'a.stl', size: 10 })).toBeNull()
  })

  it('pedido completo e compatível passa sem erros', () => {
    expect(validar(peca, impressora)).toEqual({})
  })

  it('aponta nome vazio, quantidade fora da faixa e medidas inválidas', () => {
    const erros = validar({ ...peca, titulo: ' ', quantidade: '0', alturaMm: '' }, impressora)
    expect(erros.titulo).toBeTruthy()
    expect(erros.quantidade).toBeTruthy()
    expect(erros.medidas).toBeTruthy()
  })

  it('recusa material que a impressora não aceita e peça maior que a mesa', () => {
    expect(validar({ ...peca, material: 'ABS' }, impressora).material).toMatch(/não trabalha/)
    expect(validar({ ...peca, alturaMm: '300' }, impressora).medidas).toMatch(/não cabe/)
  })

  it('sem medidas da impressora, não acusa tamanho nem material', () => {
    const semMedidas = { id: 9, disponibilidade: 'OCIOSA', materiais: [] }
    expect(validarPeca({ ...peca, alturaMm: '999', material: 'NYLON' }, semMedidas)).toEqual({})
  })

  it('prazo no passado é erro; hoje ou depois passa', () => {
    const hoje = new Date(2026, 10, 9)
    expect(validarPeca({ ...peca, prazo: '2026-11-08' }, impressora, hoje).prazo).toMatch(/já passou/)
    expect(validarPeca({ ...peca, prazo: '2026-11-09' }, impressora, hoje).prazo).toBeUndefined()
  })

  it('monta a descrição com material, prazo e observação', () => {
    expect(formatarPrazo('2026-11-20')).toBe('20/11/2026')
    expect(montarDescricao({ material: 'PLA', prazo: '2026-11-20', observacao: ' Peça infantil. ' }))
      .toBe('Material: PLA. Prazo desejado: 20/11/2026. Peça infantil.')
    expect(montarDescricao({ material: 'TPU' })).toBe('Material: TPU (flexível).')
  })

  it('checagem marca ok, falha e dúvida', () => {
    const ok = checagens(peca, impressora)
    expect(ok.map((c) => c.estado)).toEqual(['ok', 'ok', 'ok'])

    const falha = checagens({ ...peca, material: 'ABS', alturaMm: '400' }, impressora)
    expect(falha.find((c) => c.rotulo === 'Material').estado).toBe('falha')
    expect(falha.find((c) => c.rotulo === 'Tamanho').estado).toBe('falha')

    const duvida = checagens(peca, { id: 2, disponibilidade: 'EM_USO', materiais: [] })
    expect(duvida.find((c) => c.rotulo === 'Material').estado).toBe('duvida')
    expect(duvida.find((c) => c.rotulo === 'Disponibilidade').estado).toBe('duvida')
  })
})

describe('impressoras da rede: tela', () => {
  beforeEach(() => carregarHtml('impressoras-aacd', 'impressoras-aacd'))

  it('tem busca, botão de filtros, as três seções e os modais escondidos', () => {
    expect(document.querySelector('#busca')).not.toBeNull()
    expect(document.querySelector('#botao-filtro')).not.toBeNull()
 
    // o select de material e o "só livres" saíram: em uso também recebe pedidos
    expect(document.querySelector('#filtro-material')).toBeNull()
    expect(document.querySelector('#so-livres')).toBeNull()
 
    for (const secao of ['#grupo-livres', '#grupo-em-uso', '#grupo-desativadas']) {
      expect(document.querySelector(secao)).not.toBeNull()
    }
 
    expect(document.querySelector('#modal-solicitacao').hidden).toBe(true)
    expect(document.querySelector('#modal-filtros').hidden).toBe(true)
  })

  it('o formulário tem os campos que o back exige', () => {
    for (const nome of ['arquivo', 'titulo', 'quantidade', 'comprimentoMm', 'larguraMm', 'alturaMm']) {
      expect(document.querySelector(`#form-solicitacao [name="${nome}"]`), nome).not.toBeNull()
    }
    expect(document.querySelector('#campo-arquivo').accept).toBe('.stl,.obj,.3mf')
  })
})

describe('impressoras da rede: seções e filtro por UF', () => {
  const imp = (id, extra = {}) => ({
    id,
    modelo: `Modelo ${id}`,
    empresa: { id: 1, nome: 'Mackenzie' },
    cidade: 'São Paulo, SP',
    uf: 'SP',
    disponibilidade: 'OCIOSA',
    ativo: true,
    ...extra,
  })
 
  it('agrupa em livres, em uso e desativadas', () => {
    const grupos = agruparImpressoras([
      imp(1),
      imp(2, { disponibilidade: 'EM_USO' }),
      imp(3, { ativo: false }),
    ])
 
    expect(grupos.livres.map((i) => i.id)).toEqual([1])
    expect(grupos.emUso.map((i) => i.id)).toEqual([2])
    expect(grupos.desativadas.map((i) => i.id)).toEqual([3])
  })
 
  it('desativada vai para Desativadas mesmo estando ociosa ou em uso', () => {
    const grupos = agruparImpressoras([
      imp(1, { ativo: false, disponibilidade: 'OCIOSA' }),
      imp(2, { ativo: false, disponibilidade: 'EM_USO' }),
    ])
 
    expect(grupos.desativadas).toHaveLength(2)
    expect(grupos.livres).toHaveLength(0)
    expect(grupos.emUso).toHaveLength(0)
  })
 
  it('sem o campo "ativo", a impressora conta como ativa', () => {
    const semCampo = imp(1)
    delete semCampo.ativo
    const grupos = agruparImpressoras([semCampo])

    expect(grupos.livres).toHaveLength(1)
    expect(grupos.desativadas).toHaveLength(0)
  })
 
  it('sem filtros, as impressoras em uso continuam na lista', () => {
    const lista = [imp(1), imp(2, { disponibilidade: 'EM_USO' })]
 
    expect(filtrarImpressoras(lista, {})).toHaveLength(2)
  })
 
  it('filtra por UF, com "ou" entre as UFs marcadas', () => {
    const lista = [
      imp(1),
      imp(2, { uf: 'RJ', cidade: 'Rio de Janeiro, RJ' }),
      imp(3, { uf: 'MG', cidade: 'Belo Horizonte, MG' }),
    ]
 
    expect(filtrarImpressoras(lista, { ufs: ['SP'] }).map((i) => i.id)).toEqual([1])
    expect(filtrarImpressoras(lista, { ufs: ['SP', 'RJ'] }).map((i) => i.id)).toEqual([1, 2])
  })
 
  it('tira a UF do fim da cidade', () => {
    expect(ufDaCidade('São Paulo, SP')).toBe('SP')
    expect(ufDaCidade('Rio de Janeiro - RJ')).toBe('RJ')
    expect(ufDaCidade('')).toBe('')
    expect(ufDaCidade(undefined)).toBe('')
  })
})