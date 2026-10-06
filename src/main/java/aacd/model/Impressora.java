package aacd.model;

public class Impressora {
    private int id;
    private int empresaId;
    private String modelo;
    private Disponibilidade disponibilidade;
    private boolean ativo;

    public Impressora(int id, int empresaId, String modelo, Disponibilidade disponibilidade, boolean ativo) {
        this.id = id;

        if (empresaId <= 0) {
            throw new IllegalArgumentException("Empresa inválida!");
        }
        this.empresaId = empresaId;

        if (modelo == null || modelo.isBlank()){
            throw new IllegalArgumentException("Modelo não pode estar vazio");
        }
        this.modelo = modelo.trim();

        if (disponibilidade == null) {
            throw new IllegalArgumentException("Disponibilidade não pode ser nula");
        }
        this.disponibilidade = disponibilidade;

        this.ativo = ativo;
    }

    public Impressora(int empresaId, String modelo) {
        this(0, empresaId, modelo, Disponibilidade.OCIOSA, true);
    }

    //getters
    public int getId(){ return this.id; }
    public int getEmpresaId(){ return this.empresaId; }
    public String getModelo(){ return this.modelo; }
    public Disponibilidade getDisponibilidade(){ return this.disponibilidade; }
    public boolean isAtivo(){ return this.ativo; }

    //setters
    public void setId(int id){
        if (id > 0){
            this.id = id;
        } else {
            throw new IllegalArgumentException("ID inválido!");
        }
    }

    public void setAtivo(boolean ativo){
        this.ativo = ativo;
    }

    public void setModelo(String modelo) {
        if (modelo == null || modelo.isBlank()) {
            throw new IllegalArgumentException("Modelo não pode estar vazio");
        }
        this.modelo = modelo.trim();
    }
}
