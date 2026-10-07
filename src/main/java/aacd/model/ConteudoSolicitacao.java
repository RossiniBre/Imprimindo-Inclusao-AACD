package aacd.model;

import java.util.Set;

public class ConteudoSolicitacao {
    private static final int TITULO_MAX = 100;
    private static final int DESCRICAO_MAX = 2000;
    private static final int QUANTIDADE_MAX = 1000;
    private static final Set<String> EXTENSOES_ACEITAS = Set.of("stl", "obj", "3mf");

    private String mongoId;
    private String titulo;
    private String descricao;
    private int quantidade;
    private String arquivoId;
    private String nomeArquivo;

    // criação
    public ConteudoSolicitacao(String titulo, String descricao, int quantidade,
                               String arquivoId, String nomeArquivo)
    {
        setTitulo(titulo);
        setDescricao(descricao);
        setQuantidade(quantidade);
        this.arquivoId = validarArquivoId(arquivoId);
        this.nomeArquivo = validarNomeArquivo(nomeArquivo);
    }

    // reconstrução
    public ConteudoSolicitacao(String mongoId, String titulo, String descricao,
                               int quantidade, String arquivoId, String nomeArquivo)
    {
        this(titulo, descricao, quantidade, arquivoId, nomeArquivo);
        this.mongoId = validarObjectId(mongoId, "documento");
    }

    // getters
    public String getMongoId(){ return this.mongoId; }
    public String getTitulo(){ return this.titulo; }
    public String getDescricao(){ return this.descricao; }
    public int getQuantidade(){ return this.quantidade; }
    public String getArquivoId(){ return this.arquivoId; }
    public String getNomeArquivo(){ return this.nomeArquivo; }

    // setters
    public void setTitulo(String titulo){
        if (titulo == null || titulo.isBlank()){
            throw new IllegalArgumentException("Título não pode estar vazio");
        }
        if (titulo.length() > TITULO_MAX){
            throw new IllegalArgumentException("Título deve ter no máximo " + TITULO_MAX + " caracteres");
        }
        this.titulo = titulo;
    }

    public void setDescricao(String descricao){
        if (descricao == null || descricao.isBlank()){
            throw new IllegalArgumentException("Descrição não pode estar vazia");
        }
        if (descricao.length() > DESCRICAO_MAX){
            throw new IllegalArgumentException("Descrição deve ter no máximo " + DESCRICAO_MAX + " caracteres");
        }
        this.descricao = descricao;
    }

    public void setQuantidade(int quantidade){
        if (quantidade <= 0 || quantidade > QUANTIDADE_MAX){
            throw new IllegalArgumentException("Quantidade deve estar entre 1 e " + QUANTIDADE_MAX);
        }
        this.quantidade = quantidade;
    }

    // validações
    private static String validarObjectId(String valor, String nome){
        if (valor == null || !valor.matches("[0-9a-fA-F]{24}")){
            throw new IllegalArgumentException("ID do " + nome + " deve ter 24 caracteres hexadecimais");
        }
        return valor;
    }

    private static String validarNomeArquivo(String nome){
        if (nome == null || nome.isBlank()){
            throw new IllegalArgumentException("Nome do arquivo não pode estar vazio");
        }
        if (nome.length() > 255){
            throw new IllegalArgumentException("Nome do arquivo deve ter no máximo 255 caracteres");
        }
        if (nome.contains("/") || nome.contains("\\")){
            throw new IllegalArgumentException("Nome do arquivo não pode conter barras");
        }
        int ponto = nome.lastIndexOf('.');
        String extensao = (ponto < 0) ? "" : nome.substring(ponto + 1).toLowerCase();
        if (!EXTENSOES_ACEITAS.contains(extensao)){
            throw new IllegalArgumentException("Formato de arquivo inválido. Aceitos: " + EXTENSOES_ACEITAS);
        }
        return nome;
    }

    private static String validarArquivoId(String valor){
        if (valor == null || valor.isBlank()){
            throw new IllegalArgumentException("ID do arquivo não pode estar vazio");
        }
        return valor;
    }
}