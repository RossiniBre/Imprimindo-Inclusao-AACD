package aacd.service;

import aacd.config.ConnectionFactory;
import aacd.dao.EmpresaDao;
import aacd.dao.ImpressoraDao;
import aacd.model.Empresa;
import aacd.model.Impressora;
import aacd.model.Usuario;

import aacd.dao.ImpressoraMateriaisDao;
import aacd.model.Material;
import java.util.Set;

import java.sql.Connection;
import java.sql.SQLException;

public class CadastrarImpressora {

    private final EmpresaDao empresaDao;
    private final ImpressoraDao impressoraDao;
    private final ImpressoraMateriaisDao materiaisDao;
    private final ExcluirConta.FornecedorConexao conexoes;

    public CadastrarImpressora() {
        this(new EmpresaDao(), new ImpressoraDao(), new ImpressoraMateriaisDao(),
                ConnectionFactory::getConnection);
    }

    public CadastrarImpressora(EmpresaDao empresaDao, ImpressoraDao impressoraDao,
                               ImpressoraMateriaisDao materiaisDao,
                               ExcluirConta.FornecedorConexao conexoes) {
        this.empresaDao = empresaDao;
        this.impressoraDao = impressoraDao;
        this.materiaisDao = materiaisDao;
        this.conexoes = conexoes;
    }

    public int executar(Usuario ator, String modelo, Set<Material> materiais) throws SQLException {
        if (ator == null || !"EMPRESA".equals(ator.getPerfil()) || !ator.isAtivo()) {
            throw new IllegalStateException("Apenas empresas podem cadastrar impressoras!");
        }

        Empresa empresa = empresaDao.buscarPorUsuarioId(ator.getId());
        if (empresa == null) {
            throw new IllegalStateException("Empresa não encontrada!");
        }

        Impressora impressora = new Impressora(empresa.getId(), modelo);
        impressora.setMateriais(materiais);   // recusa nulo e vazio antes de tocar no banco

        int id;
        try (Connection conn = conexoes.abrir()) {
            id = impressoraDao.inserir(conn, impressora);
        }

        try {
            materiaisDao.salvar(id, impressora.getMateriais());
        } catch (RuntimeException e) {
            desfazer(id);
            throw e;
        }
        return id;
    }

    private void desfazer(int impressoraId) {
        try (Connection conn = conexoes.abrir()) {
            impressoraDao.apagar(conn, impressoraId);
        } catch (SQLException e) {
            System.err.println("Impressora " + impressoraId
                    + " ficou sem materiais e não foi desfeita: " + e.getMessage());
        }
    }
}