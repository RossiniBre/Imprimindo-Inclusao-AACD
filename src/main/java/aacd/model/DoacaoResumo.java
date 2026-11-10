package aacd.model;

import java.time.Instant;

public class DoacaoResumo {
    private final int id;
    private final String tipo;
    private final String descricao;
    private final int quantidadeImpressoras;
    private final int quantidadeFilamento;
    private final Instant dataManifestacao;
    private final boolean empresaAtiva;
    private final int empresaId;
    private final String empresaNome;
    private final String email;
    private final String telefone;

    public DoacaoResumo(int id, String tipo, String descricao,
                        int quantidadeImpressoras, int quantidadeFilamento,
                        Instant dataManifestacao,
                        int empresaId, String empresaNome, boolean empresaAtiva,
                        String email, String telefone) {
        this.id = id;
        this.tipo = tipo;
        this.descricao = descricao;
        this.quantidadeImpressoras = quantidadeImpressoras;
        this.quantidadeFilamento = quantidadeFilamento;
        this.dataManifestacao = dataManifestacao;
        this.empresaAtiva = empresaAtiva;
        this.empresaId = empresaId;
        this.empresaNome = empresaNome;
        this.email = email;
        this.telefone = telefone;
    }

    public int getId() { return id; }
    public String getTipo() { return tipo; }
    public String getDescricao() { return descricao; }
    public int getQuantidadeImpressoras() { return quantidadeImpressoras; }
    public int getQuantidadeFilamento() { return quantidadeFilamento; }
    public Instant getDataManifestacao() { return dataManifestacao; }
    public boolean isEmpresaAtiva() { return empresaAtiva; }
    public int getEmpresaId() { return empresaId; }
    public String getEmpresaNome() { return empresaNome; }
    public String getEmail() { return email; }
    public String getTelefone() { return telefone; }
}