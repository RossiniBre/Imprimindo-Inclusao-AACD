# language: pt
# Card: https://github.com/RossiniBre/Imprimindo-Inclusao-AACD/issues/12
@US-12
Funcionalidade: Login de empresa

  Cenário: Empresa desativada pela AACD não consegue entrar
    Dado uma empresa cadastrada e desativada pela AACD
    Quando ela faz login com CNPJ e senha corretos
    Então o login é recusado
    E a conta continua desativada

  Cenário: Empresa que desativou a própria conta reativa ao entrar
    Dado uma empresa que desativou a própria conta
    Quando ela faz login com CNPJ e senha corretos
    Então o login é aceito
    E a conta volta a ficar ativa