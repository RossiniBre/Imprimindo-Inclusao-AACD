package aacd.storage;

import java.io.InputStream;

public interface ArmazenamentoArquivo {
    String salvar(String nomeArquivo, InputStream conteudo) throws ArmazenamentoException;
    InputStream abrir(String arquivoId) throws ArmazenamentoException;
    void apagar(String arquivoId) throws ArmazenamentoException;
}