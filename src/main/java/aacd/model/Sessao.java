package aacd.model;

public class Sessao {

    private final int usuarioId;
    private final String perfil;
    private volatile long expiraEm;

    public Sessao(int usuarioId, String perfil, long duracaoMs) {
        this.usuarioId = usuarioId;
        this.perfil = perfil;
        renovar(duracaoMs);
    }

    public int getUsuarioId() { return usuarioId; }
    public String getPerfil() { return perfil; }

    public boolean expirada() {
        return System.currentTimeMillis() > expiraEm;
    }

    public void renovar(long duracaoMs) {
        this.expiraEm = System.currentTimeMillis() + duracaoMs;
    }
}