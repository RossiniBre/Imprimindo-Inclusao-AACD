package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.dao.SolicitacaoAtivaDao;
import aacd.model.Disponibilidade;
import aacd.model.Impressora;
import aacd.model.Material;
import aacd.model.Usuario;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Set;

public class EditarImpressora {

    private final ImpressoraDao impressoraDao = new ImpressoraDao();
    private final PermissaoImpressora permissao = new PermissaoImpressora();
    private final ImpressoraMateriaisDao materiaisDao = new ImpressoraMateriaisDao();
    private final SolicitacaoAtivaDao solicitacaoDao = new SolicitacaoAtivaDao();
    
    public void executar(Usuario ator, int impressoraId, String modelo, Set<Material> materiais)
            throws SQLException {
        executar(ator, impressoraId, modelo, materiais, null, null, null);
    }

    public void executar(Usuario ator, int impressoraId, String modelo, Set<Material> materiais,
                         Integer comprimentoMm, Integer larguraMm, Integer alturaMm)
            throws SQLException {
        executar(ator, impressoraId, modelo, materiais, comprimentoMm, larguraMm, alturaMm, null);
    }

    public void executar(Usuario ator, int impressoraId, String modelo, Set<Material> materiais,
                         Integer comprimentoMm, Integer larguraMm, Integer alturaMm,
                         Disponibilidade disponibilidade)
            throws SQLException {
        if (ator == null || !ator.isAtivo()) {
            throw new IllegalStateException("Usuário inválido!");
        }

        try (Connection conn = ConnectionFactory.getConnection()) {
            Impressora impressora = impressoraDao.buscarPorId(conn, impressoraId);
            if (impressora == null || !impressora.isAtivo()) {
                throw new IllegalStateException("Impressora não encontrada!");
            }

            try {
                permissao.validar(ator, impressora);
            } catch (IllegalStateException e) {
                throw new IllegalStateException("Impressora não encontrada!");
            }

            if (solicitacaoDao.existeAtivo(conn, impressoraId)) {
                throw new IllegalStateException(
                        "Impressora com impressão em andamento não pode ser editada.");
            }

            impressora.setModelo(modelo);
            if (comprimentoMm != null) impressora.setComprimentoMm(comprimentoMm);
            if (larguraMm != null)     impressora.setLarguraMm(larguraMm);
            if (alturaMm != null)      impressora.setAlturaMm(alturaMm);
            if (disponibilidade != null) impressora.setDisponibilidade(disponibilidade);
            if (materiais != null) {
                impressora.setMateriais(materiais);   // recusa vazio, mesma regra do cadastro
            }

            impressoraDao.atualizarDados(conn, impressoraId, impressora.getModelo(),
                    impressora.getComprimentoMm(), impressora.getLarguraMm(),
                    impressora.getAlturaMm(),
                    impressora.getDisponibilidade());

            if (materiais != null) {
                materiaisDao.salvar(impressoraId, impressora.getMateriais());
            }
        }
    }
}