import { describe, it, expect } from 'vitest'
import { rota, lerHash, resolver } from '../shared/js/router.js'

rota('/404', { pagina: 'nao-encontrada', publica: true })
rota('/login', { pagina: 'login', publica: true })

describe('lerHash', () => {
  it('separa caminho e parâmetros', () => {
    const { caminho, params } = lerHash('#/redefinir-senha?token=abc')
    expect(caminho).toBe('/redefinir-senha')
    expect(params.get('token')).toBe('abc')
  })

  it('hash vazio vira "/"', () => {
    expect(lerHash('').caminho).toBe('/')
  })
})

describe('resolver', () => {
  it('acha a rota registrada', () => {
    expect(resolver('#/login').pagina).toBe('login')
  })

  it('endereço desconhecido cai na 404', () => {
    expect(resolver('#/nao-existe').pagina).toBe('nao-encontrada')
  })
})