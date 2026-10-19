package aacd.service;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import aacd.config.ConnectionFactory;
import aacd.dao.ImpressoraDao;
import aacd.dao.SolicitacaoDao;
import aacd.dao.SolicitacaoEventosDao;
import aacd.model.Impressora;
import aacd.model.Solicitacao;
import aacd.model.StatusSolicitacao;
import aacd.model.Usuario;

public class ResponderSolicitacao {

    private static final int MAX_JUSTIFICATIVA = 500;

    private final SolicitacaoDao solicitacaoDao = new SolicitacaoDao();
    private final SolicitacaoEventosDao eventosDao = new SolicitacaoEventosDao();
    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final PermissaoImpressora permissao = new PermissaoImpressora();

    public void aceitar(Usuario ator, int solicitacaoId, String prazoTexto) throws SQLException {
        validarAtor(ator);
        LocalDate prazo = lerPrazo(prazoTexto);

        responder(ator, solicitacaoId, StatusSolicitacao.EM_ANDAMENTO, null, prazo,
                "Aceita com prazo estimado em " + prazo);
    }

    public void recusar(Usuario ator, int solicitacaoId, String justificativa) throws SQLException {
        validarAtor(ator);
        String motivo = lerJustificativa(justificativa);

        responder(ator, solicitacaoId, StatusSolicitacao.RECUSADA, motivo, null, motivo);
    }

    private void responder(Usuario ator, int solicitacaoId, StatusSolicitacao novoStatus,
                           String justificativa, LocalDate prazo, String observacao)
            throws SQLException {

        try (Connection conn = ConnectionFactory.getConnection()) {
            conn.setAutoCommit(false);
            try {
                Solicitacao solicitacao = solicitacaoDao.buscarSolicitacaoPorId(conn, solicitacaoId);
                if (solicitacao == null) {
                    throw new IllegalArgumentException("Solicitação não encontrada!");
                }

                validarDono(conn, ator, solicitacao);
                //verificação de se ta pendente ou nao  
                if (solicitacao.getStatus() != StatusSolicitacao.PENDENTE) {
                    throw new IllegalStateException("Esta solicitação não está mais pendente!");
                }

                // proteger contra cancelamento simultaneo pela transicao do bd msm
                if (!solicitacaoDao.responder(conn, solicitacaoId, novoStatus, justificativa)) {
                    throw new IllegalStateException("Esta solicitação não está mais pendente!");
                }

                // commit no mongo(rollback se falhar)
                eventosDao.registrarEvento(solicitacaoId, StatusSolicitacao.PENDENTE,
                        novoStatus, ator.getId(), observacao, prazo);
                conn.commit();//comita no SQL
            } catch (SQLException | RuntimeException e) {
                conn.rollback();
                throw e;
            }
        }
    }

    private void validarAtor(Usuario ator) {
        if (ator == null || !"EMPRESA".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas empresas podem responder solicitações!");
        }
    }

    private void validarDono(Connection conn, Usuario ator, Solicitacao solicitacao) throws SQLException {
        if (solicitacao.getImpressoraId() == null) {
            throw new IllegalStateException("Solicitação sem impressora definida!");
        }
        Impressora impressora = impressoraDao.buscarPorId(conn, solicitacao.getImpressoraId());
        if (impressora == null) {
            throw new IllegalStateException("Impressora não encontrada!");
        }
        try {
            permissao.validar(ator, impressora);
        } catch (IllegalStateException e) {
            throw new IllegalArgumentException("Solicitação não encontrada!");
        }
    }

    private LocalDate lerPrazo(String texto) {
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException("Informe o prazo estimado para aceitar!");
        }
        LocalDate prazo;
        try {
            prazo = LocalDate.parse(texto.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Prazo inválido! Use o formato AAAA-MM-DD.");
        }
        if (prazo.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("O prazo não pode estar no passado!");
        }
        return prazo;
    }

    private String lerJustificativa(String texto) {
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException("Informe a justificativa para recusar!");
        }
        String valor = texto.trim();
        if (valor.length() > MAX_JUSTIFICATIVA) {
            throw new IllegalArgumentException(
                    "Justificativa deve ter no máximo " + MAX_JUSTIFICATIVA + " caracteres!");
        }
        return valor;
    }
}