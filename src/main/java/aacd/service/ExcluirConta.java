package aacd.service;

import aacd.dao.*;
import aacd.dao.ExclusaoContaDao.SolicitacaoApagada;
import aacd.model.ConteudoSolicitacao;
import aacd.model.Usuario;
import aacd.storage.ArmazenamentoArquivo;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

public class ExcluirConta {

    @FunctionalInterface
    public interface FornecedorConexao {
        Connection abrir() throws SQLException;
    }

    private final UsuarioDao usuarioDao;
    private final ExclusaoContaDao exclusaoDao;
    private final ConteudoSolicitacaoDao conteudoDao;
    private final SolicitacaoEventosDao eventosDao;
    private final ArmazenamentoArquivo armazenamento;
    private final GerenciadorSessoes sessoes;
    private final FornecedorConexao conexoes;
    private final ImpressoraMateriaisDao materiaisDao;

    public ExcluirConta(UsuarioDao usuarioDao, ExclusaoContaDao exclusaoDao,
                        ConteudoSolicitacaoDao conteudoDao, SolicitacaoEventosDao eventosDao,
                        ArmazenamentoArquivo armazenamento, GerenciadorSessoes sessoes,
                        FornecedorConexao conexoes, ImpressoraMateriaisDao materiaisDao) {
        this.usuarioDao = usuarioDao;
        this.exclusaoDao = exclusaoDao;
        this.conteudoDao = conteudoDao;
        this.eventosDao = eventosDao;
        this.armazenamento = armazenamento;
        this.sessoes = sessoes;
        this.conexoes = conexoes;
        this.materiaisDao = materiaisDao;
    }

    public void executar(int alvoId) throws SQLException {
        Usuario alvo = alvoId > 0 ? usuarioDao.buscarPorId(alvoId) : null;
        if (alvo == null) {
            throw new IllegalStateException("Conta não encontrada!");
        }

        String perfil = alvo.getPerfil();
        if (!"EMPRESA".equals(perfil) && !"FUNCIONARIO".equals(perfil)) {
            throw new IllegalArgumentException("Contas de administrador não podem ser excluídas!");
        }

        Apagados apagadas;
        try (Connection conn = conexoes.abrir()) {
            conn.setAutoCommit(false);
            try {
                apagadas = "EMPRESA".equals(perfil)
                        ? apagarEmpresa(conn, alvo.getId())
                        : apagarFuncionario(conn, alvo);
                conn.commit();
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        }

        sessoes.destruirDoUsuario(alvo.getId());
        limparArmazenamentos(apagadas.solicitacoes());
        limparMateriais(apagadas.impressoras());
    }

    private Apagados apagarEmpresa(Connection conn, int usuarioId) throws SQLException {
        Integer empresaId = exclusaoDao.buscarEmpresaId(conn, usuarioId);
        List<SolicitacaoApagada> solicitacoes = List.of();
        List<Integer> impressoras = List.of();

        exclusaoDao.anularCanceladoPor(conn, usuarioId);
        if (empresaId != null) {
            solicitacoes = exclusaoDao.listarSolicitacoesDaEmpresa(conn, empresaId);
            impressoras = exclusaoDao.listarImpressoraIdsDaEmpresa(conn, empresaId);   // antes do DELETE
            exclusaoDao.apagarSolicitacoesDaEmpresa(conn, empresaId);
            exclusaoDao.apagarDoacoesDaEmpresa(conn, empresaId);
            exclusaoDao.apagarImpressorasDaEmpresa(conn, empresaId);
            exclusaoDao.apagarEmpresa(conn, empresaId);
        }
        exclusaoDao.apagarUsuario(conn, usuarioId);
        return new Apagados(solicitacoes, impressoras);
    }

    private Apagados apagarFuncionario(Connection conn, Usuario alvo) throws SQLException {
        int usuarioId = alvo.getId();
        Integer funcionarioId = exclusaoDao.buscarFuncionarioId(conn, usuarioId);

        exclusaoDao.anularCanceladoPor(conn, usuarioId);
        if (funcionarioId != null) {
            exclusaoDao.guardarNomeDoCriador(conn, funcionarioId, alvo.getNome());
            exclusaoDao.apagarFuncionario(conn, funcionarioId);
        }
        exclusaoDao.apagarUsuario(conn, usuarioId);
        return new Apagados(List.of(), List.of());
    }

    private void limparMateriais(List<Integer> impressoraIds) {
        try {
            materiaisDao.apagarVarias(impressoraIds);
        } catch (Exception e) {
            System.err.println("Limpeza incompleta dos materiais das impressoras: " + e.getMessage());
        }
    }

    private void limparArmazenamentos(List<SolicitacaoApagada> solicitacoes) {
        for (SolicitacaoApagada s : solicitacoes) {
            try {
                Optional<ConteudoSolicitacao> conteudo = conteudoDao.buscarPorId(s.mongoId());
                if (conteudo.isPresent()) {
                    armazenamento.apagar(conteudo.get().getArquivoId());
                }
                conteudoDao.apagar(s.mongoId());
                eventosDao.apagar(s.id());
            } catch (Exception e) {
                System.err.println("Limpeza incompleta da solicitação " + s.id() + ": " + e.getMessage());
            }
        }
    }

    private record Apagados(List<SolicitacaoApagada> solicitacoes, List<Integer> impressoras) {}
}