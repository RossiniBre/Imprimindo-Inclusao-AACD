package aacd.storage;

public class ArquivoNaoEncontradoException extends ArmazenamentoException {
    public ArquivoNaoEncontradoException(String arquivoId) {
        super("Arquivo não encontrado: " + arquivoId);
    }
}