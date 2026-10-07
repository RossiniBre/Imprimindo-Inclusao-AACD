package aacd.model;

import java.util.Date;

public class SolicitacaoImpressao {
    private int solicitacaoId;
    private int empresaId;
    private Integer impressoraId;
    private int criadoPor;
    private String titulo;
    private String mongoId;
    private StatusSolicitacao status;
    private String justificativa;
    private Integer canceladoPor;
    private Date dataCriacao;
    private Date dataDecisao;
    private Date dataFinalizacao;

    // criação
    public SolicitacaoImpressao(int empresaId, int criadoPor, int impressoraId,
                                String titulo, String mongoId)
    {
        this.empresaId = validarId(empresaId, "empresa");
        this.criadoPor = validarId(criadoPor, "solicitante");
        this.impressoraId = validarId(impressoraId, "impressora");
        setTitulo(titulo);
        this.mongoId = validarMongoId(mongoId);
        this.status = StatusSolicitacao.PENDENTE;
    }

    // reconstrução
    public SolicitacaoImpressao(int solicitacaoId, int empresaId, int criadoPor,
                                Integer impressoraId, String titulo, String mongoId,
                                StatusSolicitacao status, String justificativa,
                                Integer canceladoPor, Date dataCriacao,
                                Date dataDecisao, Date dataFinalizacao)
    {
        this.solicitacaoId = validarId(solicitacaoId, "solicitação");
        this.empresaId = validarId(empresaId, "empresa");
        this.criadoPor = validarId(criadoPor, "solicitante");
        this.impressoraId = (impressoraId == null) ? null : validarId(impressoraId, "impressora");
        setTitulo(titulo);
        this.mongoId = validarMongoId(mongoId);

        if (status == null) {
            throw new IllegalArgumentException("O status não pode ser nulo");
        }
        this.status = status;

        this.justificativa = justificativa;
        this.canceladoPor = (canceladoPor == null) ? null : validarId(canceladoPor, "usuário que cancelou");
        this.dataCriacao = dataCriacao;
        this.dataDecisao = dataDecisao;
        this.dataFinalizacao = dataFinalizacao;
    }

    private static int validarId(int valor, String nome) {
        if (valor <= 0) {
            throw new IllegalArgumentException("O ID de " + nome + " deve ser maior que zero");
        }
        return valor;
    }

    private static String validarMongoId(String mongoId) {
        if (mongoId == null || !mongoId.matches("[0-9a-fA-F]{24}")) {
            throw new IllegalArgumentException("mongoId deve ter 24 caracteres hexadecimais");
        }
        return mongoId;
    }

    //getters
    public int getSolicitacaoId(){ return this.solicitacaoId; }
    public int getEmpresaId(){ return this.empresaId; }
    public int getCriadoPor(){ return this.criadoPor; }
    public Integer getImpressoraId(){ return this.impressoraId; }
    public String getMongoId(){ return this.mongoId; }
    public StatusSolicitacao getStatus(){ return this.status; }
    public String getTitulo(){ return this.titulo; }
    public String getJustificativa(){ return this.justificativa; }
    public Integer getCanceladoPor(){ return this.canceladoPor; }
    public Date getDataCriacao(){ return this.dataCriacao; }
    public Date getDataDecisao(){ return this.dataDecisao; }
    public Date getDataFinalizacao(){ return this.dataFinalizacao; }

    // setters
    public void setTitulo(String titulo){
        if (titulo == null || titulo.isBlank()){
            throw new IllegalArgumentException("Titulo não pode estar vazio");
        }
        if (titulo.length() > 100){
            throw new IllegalArgumentException("Titulo deve ter no máximo 100 caracteres");
        }
        this.titulo = titulo;
    }

    public void setSolicitacaoId(int solicitacaoId){
        this.solicitacaoId = validarId(solicitacaoId, "solicitação");
    }
}
