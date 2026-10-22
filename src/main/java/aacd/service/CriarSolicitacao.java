package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.FuncionarioDao;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoDao;
import aacd.model.*;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.SQLException;

public class CriarSolicitacao {

    @FunctionalInterface
    public interface ProvedorConexao {
        Connection abrir() throws SQLException;
    }

    private final FuncionarioDao funcionarioDao;
    private final ImpressoraDao impressoraDao;
    private final SolicitacaoDao solicitacaoDao;
    private final ConteudoSolicitacaoDao conteudoDao;
    private final ArmazenamentoArquivo armazenamento;
    private final ProvedorConexao conexoes;

    // uso normal (Main)
    public CriarSolicitacao(ConteudoSolicitacaoDao conteudoDao, ArmazenamentoArquivo armazenamento) {
        this(new FuncionarioDao(), new ImpressoraDao(), new SolicitacaoDao(),
                conteudoDao, armazenamento, ConnectionFactory::getConnection);
    }

    // uso em testes
    public CriarSolicitacao(FuncionarioDao funcionarioDao, ImpressoraDao impressoraDao,
                            SolicitacaoDao solicitacaoDao, ConteudoSolicitacaoDao conteudoDao,
                            ArmazenamentoArquivo armazenamento, ProvedorConexao conexoes) {
        this.funcionarioDao = funcionarioDao;
        this.impressoraDao = impressoraDao;
        this.solicitacaoDao = solicitacaoDao;
        this.conteudoDao = conteudoDao;
        this.armazenamento = armazenamento;
        this.conexoes = conexoes;
    }

    public int criar(int usuarioId, int impressoraId, String titulo, String descricao,
                     int quantidade, String nomeArquivo, InputStream arquivo)
            throws SQLException, ArmazenamentoException {

        new ConteudoSolicitacao(titulo, descricao, quantidade, "validacao", nomeArquivo);

        Funcionario funcionario = funcionarioDao.buscarPorUsuarioId(usuarioId);
        if (funcionario == null) {
            throw new IllegalArgumentException("Apenas funcionários podem criar solicitações");
        }
        return gravar(funcionario.getId(), null, impressoraId, titulo, descricao,
                quantidade, nomeArquivo, arquivo);
    }

    public int criarComoAdmin(Usuario admin, int impressoraId, String titulo, String descricao,
                              int quantidade, String nomeArquivo, InputStream arquivo)
            throws SQLException, ArmazenamentoException {

        new ConteudoSolicitacao(titulo, descricao, quantidade, "validacao", nomeArquivo);

        if (admin == null || !"ADMIN".equals(admin.getPerfil()) || !admin.isAtivo()) {
            throw new IllegalArgumentException("Apenas administradores podem criar solicitações como admin");
        }
        return gravar(null, admin.getIdentificador(), impressoraId, titulo, descricao,
                quantidade, nomeArquivo, arquivo);
    }

    private int gravar(Integer funcionarioId, String nomeCriador, int impressoraId,
                       String titulo, String descricao, int quantidade,
                       String nomeArquivo, InputStream arquivo)
            throws SQLException, ArmazenamentoException {

        try (Connection conn = conexoes.abrir()) {
            Impressora impressora = impressoraDao.buscarPorId(conn, impressoraId);
            if (impressora == null || !impressora.isAtivo()) {
                throw new IllegalArgumentException("Impressora inexistente ou inativa");
            }

            String arquivoId = armazenamento.salvar(nomeArquivo, arquivo);
            String mongoId = null;
            try {
                ConteudoSolicitacao conteudo = new ConteudoSolicitacao(
                        titulo, descricao, quantidade, arquivoId, nomeArquivo);
                mongoId = conteudoDao.inserir(conteudo);

                conn.setAutoCommit(false);
                SolicitacaoImpressao solicitacao = (funcionarioId != null)
                        ? new SolicitacaoImpressao(impressora.getEmpresaId(), funcionarioId,
                        impressoraId, titulo, mongoId)
                        : new SolicitacaoImpressao(impressora.getEmpresaId(), impressoraId,
                        titulo, mongoId, nomeCriador);
                int id = solicitacaoDao.inserir(conn, solicitacao);
                conn.commit();
                return id;
            } catch (SQLException | RuntimeException e) {
                try {
                    conn.rollback();
                } catch (SQLException ignorado) {
                }
                if (mongoId != null) {
                    try {
                        conteudoDao.apagar(mongoId);
                    } catch (RuntimeException ignorado) {
                    }
                }
                try {
                    armazenamento.apagar(arquivoId);
                } catch (ArmazenamentoException ignorado) {
                }
                throw e;
            }
        }
    }
}