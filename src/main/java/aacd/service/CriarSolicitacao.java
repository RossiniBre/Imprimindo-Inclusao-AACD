package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.FuncionarioDao;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoDao;
import aacd.model.ConteudoSolicitacao;
import aacd.model.Funcionario;
import aacd.model.Impressora;
import aacd.model.SolicitacaoImpressao;
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
                SolicitacaoImpressao solicitacao = new SolicitacaoImpressao(
                        impressora.getEmpresaId(), funcionario.getId(), impressoraId,
                        titulo, mongoId);
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