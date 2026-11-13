# language: pt
# Card: https://github.com/RossiniBre/Imprimindo-Inclusao-AACD/issues/20
@US-20
Funcionalidade: Resposta da empresa à solicitação de impressão

  Cenário: Empresa recusa sem informar justificativa
    Dado uma solicitação pendente para a empresa
    Quando a empresa tenta recusar sem informar justificativa
    Então a recusa é rejeitada
    E a solicitação continua pendente

  Cenário: Empresa recusa informando justificativa
    Dado uma solicitação pendente para a empresa
    Quando a empresa recusa informando uma justificativa
    Então a solicitação passa para o status recusada
    E a justificativa fica registrada