package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ConteudoSolicitacaoDao;
import aacd.dao.FuncionarioDao;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoDao;
import aacd.model.*;
import aacd.storage.ArmazenamentoArquivo;
import aacd.storage.ArmazenamentoException;
import aacd.util.ValidadorVolume;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;

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
                     int quantidade, Material material, int comprimentoMm, int larguraMm, int alturaMm,
                     LocalDate prazoDesejado, String nomeArquivo, InputStream arquivo)
            throws SQLException, ArmazenamentoException {

        validarConteudo(titulo, descricao, quantidade, material,
                comprimentoMm, larguraMm, alturaMm, prazoDesejado, nomeArquivo);

        Funcionario funcionario = funcionarioDao.buscarPorUsuarioId(usuarioId);
        if (funcionario == null) {
            throw new IllegalArgumentException("Apenas funcionários podem criar solicitações");
        }
        return gravar(funcionario.getId(), null, impressoraId, titulo, descricao,
                quantidade, material, comprimentoMm, larguraMm, alturaMm,
                prazoDesejado, nomeArquivo, arquivo);
    }

    public int criarComoAdmin(Usuario admin, int impressoraId, String titulo, String descricao,
                              int quantidade, Material material, int comprimentoMm, int larguraMm, int alturaMm,
                              LocalDate prazoDesejado, String nomeArquivo, InputStream arquivo)
            throws SQLException, ArmazenamentoException {

        validarConteudo(titulo, descricao, quantidade, material,
                comprimentoMm, larguraMm, alturaMm, prazoDesejado, nomeArquivo);

        if (admin == null || !"ADMIN".equals(admin.getPerfil()) || !admin.isAtivo()) {
            throw new IllegalArgumentException("Apenas administradores podem criar solicitações como admin");
        }
        return gravar(null, admin.getNome(), impressoraId, titulo, descricao,
                quantidade, material, comprimentoMm, larguraMm, alturaMm,
                prazoDesejado, nomeArquivo, arquivo);
    }

    private static void validarConteudo(String titulo, String descricao, int quantidade, Material material,
                                        int comprimentoMm, int larguraMm, int alturaMm,
                                        LocalDate prazoDesejado, String nomeArquivo) {
        new ConteudoSolicitacao(titulo, descricao, quantidade, material,
                comprimentoMm, larguraMm, alturaMm, prazoDesejado, "validacao", nomeArquivo);

        if (prazoDesejado != null && prazoDesejado.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("O prazo desejado não pode ser uma data passada");
        }
    }

    private int gravar(Integer funcionarioId, String nomeCriador, int impressoraId,
                       String titulo, String descricao, int quantidade, Material material,
                       int comprimentoMm, int larguraMm, int alturaMm,
                       LocalDate prazoDesejado, String nomeArquivo, InputStream arquivo)
            throws SQLException, ArmazenamentoException {

        try (Connection conn = conexoes.abrir()) {
            Impressora impressora = impressoraDao.buscarPorId(conn, impressoraId);
            if (impressora == null || !impressora.isAtivo()) {
                throw new IllegalArgumentException("Impressora inexistente ou inativa");
            }

            if (!ValidadorVolume.cabe(comprimentoMm, larguraMm, alturaMm,
                    impressora.getComprimentoMm(), impressora.getLarguraMm(), impressora.getAlturaMm())) {
                throw new IllegalArgumentException(
                        "A peça (" + comprimentoMm + " x " + larguraMm + " x " + alturaMm + " mm) "
                                + "não cabe no volume da impressora ("
                                + impressora.getComprimentoMm() + " x " + impressora.getLarguraMm()
                                + " x " + impressora.getAlturaMm() + " mm)");
            }

            String arquivoId = armazenamento.salvar(nomeArquivo, arquivo);
            String mongoId = null;
            try {
                ConteudoSolicitacao conteudo = new ConteudoSolicitacao(
                        titulo, descricao, quantidade, material,
                        comprimentoMm, larguraMm, alturaMm, prazoDesejado, arquivoId, nomeArquivo);
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