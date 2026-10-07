package aacd.storage;

public class ArmazenamentoException extends Exception {
    public ArmazenamentoException(String mensagem) {
        super(mensagem);
    }

    public ArmazenamentoException(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }
}