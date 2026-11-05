package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.RedefinicaoSenhaDao;
import aacd.dao.UsuarioDao;
import aacd.model.Usuario;
import aacd.util.CodigoRedefinicao;
import aacd.util.EmailValidador;
import aacd.util.Senha;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class RedefinicaoSenhaService {

    private static final int MINUTOS_VALIDADE = 15;
    private static final int SEGUNDOS_ENTRE_PEDIDOS = 60;
    private static final int MAX_TENTATIVAS = 5;
    private static final String ERRO_CODIGO = "Código inválido ou expirado.";

    private final UsuarioDao usuarioDao = new UsuarioDao();
    private final RedefinicaoSenhaDao redefinicaoDao = new RedefinicaoSenhaDao();
    private final EnviadorEmail enviador;
    private final GerenciadorSessoes sessoes;

    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "envio-redefinicao");
        t.setDaemon(true);
        return t;
    });

    public RedefinicaoSenhaService(EnviadorEmail enviador, GerenciadorSessoes sessoes) {
        this.enviador = enviador;
        this.sessoes = sessoes;
    }
    
    public void solicitar(String emailInformado) {
        String email = EmailValidador.normalizar(emailInformado);
        if (email == null || EmailValidador.validar(email) != null) {
            return;
        }
        executor.submit(() -> processarPedido(email));
    }

    private void processarPedido(String email) {
        try {
            Usuario usuario = usuarioDao.buscarPorEmail(email);
            if (usuario == null) return;
            if (redefinicaoDao.pedidoRecente(usuario.getId(), SEGUNDOS_ENTRE_PEDIDOS)) return;

            String codigo = CodigoRedefinicao.gerar();
            redefinicaoDao.salvar(usuario.getId(), Senha.gerarHash(codigo), MINUTOS_VALIDADE);

            enviador.enviar(email,
                    ModeloEmailRedefinicao.assunto(),
                    ModeloEmailRedefinicao.html(usuario.getNome(), codigo, MINUTOS_VALIDADE),
                    ModeloEmailRedefinicao.texto(usuario.getNome(), codigo, MINUTOS_VALIDADE));
        } catch (SQLException | EmailException | RuntimeException e) {
            e.printStackTrace();
        }
    }

    public void redefinir(String emailInformado, String codigo, String novaSenha) throws SQLException {
        if (novaSenha == null || novaSenha.isBlank()) {
            throw new IllegalArgumentException("Senha não pode estar vazia");
        }
        String email = EmailValidador.normalizar(emailInformado);
        if (email == null || codigo == null || !codigo.trim().matches("\\d{6}")) {
            throw new IllegalArgumentException(ERRO_CODIGO);
        }
        codigo = codigo.trim();

        Usuario usuario = usuarioDao.buscarPorEmail(email);
        if (usuario == null) {
            throw new IllegalArgumentException(ERRO_CODIGO);
        }
        int id = usuario.getId();

        if (!redefinicaoDao.registrarTentativa(id, MAX_TENTATIVAS)) {
            throw new IllegalArgumentException(ERRO_CODIGO);
        }
        String hash = redefinicaoDao.buscarHashValido(id);
        if (hash == null || !Senha.confere(codigo, hash)) {
            throw new IllegalArgumentException(ERRO_CODIGO);
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            conn.setAutoCommit(false);
            try {
                if (!redefinicaoDao.marcarUsado(conn, id)) {
                    throw new IllegalArgumentException(ERRO_CODIGO);
                }
                usuarioDao.atualizarSenha(conn, id, Senha.gerarHash(novaSenha));
                conn.commit();
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        }

        sessoes.destruirDoUsuario(id);
    }
}