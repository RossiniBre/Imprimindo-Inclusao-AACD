package aacd.model;

public class Solicitacao {
    private final int id;
    private final int empresaId;
    private final Integer impressoraId;
    private final String titulo;
    private final StatusSolicitacao status;
    private final String justificativa;

    public Solicitacao(int id, int empresaId, Integer impressoraId, String titulo,
            StatusSolicitacao status, String justificativa) {
        this.id = id;
        this.empresaId = empresaId;
        this.impressoraId = impressoraId;
        this.titulo = titulo;
        this.status = status;
        this.justificativa = justificativa;

    }
     public int getId() { return id; }
    public int getEmpresaId() { return empresaId; }
    public Integer getImpressoraId() { return impressoraId; }
    public String getTitulo() { return titulo; }
    public StatusSolicitacao getStatus() { return status; }
    public String getJustificativa() { return justificativa; }
}
