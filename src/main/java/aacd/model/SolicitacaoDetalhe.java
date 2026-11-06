package aacd.model;

public record SolicitacaoDetalhe(
        int id,
        String titulo,
        StatusSolicitacao status,
        String justificativa,
        int quantidade,
        int comprimentoMm,
        int larguraMm,
        int alturaMm,
        String nomeArquivo) {

    public static SolicitacaoDetalhe de(SolicitacaoImpressao s, ConteudoSolicitacao c) {
        return new SolicitacaoDetalhe(
                s.getSolicitacaoId(), s.getTitulo(), s.getStatus(), s.getJustificativa(),
                c.getQuantidade(), c.getComprimentoMm(), c.getLarguraMm(),
                c.getAlturaMm(), c.getNomeArquivo());
    }
}