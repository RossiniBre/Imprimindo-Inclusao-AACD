package aacd.model;

public class Usuario {
    private int id;
    private String nome;
    private String identificador;
    private String senhaHash;
    private String perfil;
    private boolean ativo;

    public Usuario(int id, String nome, String identificador, String senhaHash, String perfil, boolean ativo){
        if (nome == null || nome.isBlank()){
            throw new IllegalArgumentException("Nome não pode estar vazio");
        }
        this.nome = nome.trim();

        if (identificador == null || identificador.isBlank()) {
            throw new IllegalArgumentException("Login não pode estar vazio");
        }
        this.identificador = identificador.trim().toLowerCase();

        if (senhaHash == null || senhaHash.isBlank()){
            throw new IllegalArgumentException("Senha não pode estar vazio");
        }
        this.senhaHash = senhaHash;

        if (perfil != null && (perfil.equals("ADMIN") || perfil.equals("EMPRESA") || perfil.equals("FUNCIONARIO"))) {
            this.perfil = perfil;
        } else {
            throw new IllegalArgumentException("Perfil inválido!");
        }

        this.id = id;
        this.ativo = ativo;
    }

    public Usuario(String nome, String identificador, String senhaHash, String perfil){
        this(0, nome, identificador, senhaHash, perfil, true);
    }

    //getters
    public int getId(){ return this.id; }
    public String getNome(){ return this.nome; }
    public String getIdentificador(){ return this.identificador; }
    public String getSenhaHash(){ return this.senhaHash; }
    public String getPerfil(){ return this.perfil; }
    public boolean isAtivo(){ return this.ativo; }

    //setter
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
}