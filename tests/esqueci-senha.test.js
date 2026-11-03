import { describe, it, expect } from 'vitest'
import { variante, emailValido } from '../public/pages/esqueci-senha/esqueci-senha.js'

describe('tela esqueci minha senha', () => {
  it('usa a variante certa pelo parâmetro da URL', () => {
    expect(variante(new URLSearchParams(''))).toBe('empresa')
    expect(variante(new URLSearchParams('perfil=aacd'))).toBe('aacd')
  })

  it('valida o formato do e-mail antes de enviar', () => {
    expect(emailValido('empresa@exemplo.com.br')).toBe(true)
    expect(emailValido('nome@aacd.com')).toBe(true)
    expect(emailValido('sem-arroba')).toBe(false)
    expect(emailValido('a@b')).toBe(false)
    expect(emailValido('')).toBe(false)
  })
})
