package aacd.model;

import java.time.Instant;

public class DoacaoResumo {
    private final int id;
    private final String tipo;
    private final String descricao;
    private final int quantidade;
    private final Instant dataManifestacao;
    private final boolean visualizada;
    private final int empresaId;
    private final String empresaNome;
    private final String email;
    private final String telefone;

    public DoacaoResumo(int id, String tipo, String descricao, int quantidade,
                        Instant dataManifestacao, boolean visualizada,
                        int empresaId, String empresaNome, String email, String telefone) {
        this.id = id;
        this.tipo = tipo;
        this.descricao = descricao;
        this.quantidade = quantidade;
        this.dataManifestacao = dataManifestacao;
        this.visualizada = visualizada;
        this.empresaId = empresaId;
        this.empresaNome = empresaNome;
        this.email = email;
        this.telefone = telefone;
    }

    public int getId() { return id; }
    public String getTipo() { return tipo; }
    public String getDescricao() { return descricao; }
    public int getQuantidade() { return quantidade; }
    public Instant getDataManifestacao() { return dataManifestacao; }
    public boolean isVisualizada() { return visualizada; }
    public int getEmpresaId() { return empresaId; }
    public String getEmpresaNome() { return empresaNome; }
    public String getEmail() { return email; }
    public String getTelefone() { return telefone; }
}