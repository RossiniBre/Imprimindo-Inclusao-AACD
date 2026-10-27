package aacd.service;

import aacd.dao.DoacaoDao;
import aacd.dao.EmpresaDao;
import aacd.model.Empresa;
import aacd.model.TipoDoacao;

import java.sql.SQLException;

public class ManifestarDoacao {

    private static final int DESCRICAO_MAX = 1000;
    private static final int QUANTIDADE_MAX = 10000;

    private final EmpresaDao empresaDao;
    private final DoacaoDao doacaoDao;

    public ManifestarDoacao() {
        this(new EmpresaDao(), new DoacaoDao());
    }

    public ManifestarDoacao(EmpresaDao empresaDao, DoacaoDao doacaoDao) {
        this.empresaDao = empresaDao;
        this.doacaoDao = doacaoDao;
    }

    public int executar(int usuarioId, String tipoTexto, String descricao, String quantidadeTexto) throws SQLException {
        TipoDoacao tipo = lerTipo(tipoTexto);
        int quantidade = lerQuantidade(quantidadeTexto);

        String texto = descricao == null ? "" : descricao.trim();
        if (texto.isEmpty()) {
            throw new IllegalArgumentException("Descrição obrigatória!");
        }
        if (texto.length() > DESCRICAO_MAX) {
            throw new IllegalArgumentException("Descrição deve ter no máximo " + DESCRICAO_MAX + " caracteres!");
        }

        Empresa empresa = empresaDao.buscarPorUsuarioId(usuarioId);
        if (empresa == null) {
            throw new IllegalStateException("Empresa não encontrada!");
        }

        return doacaoDao.inserir(empresa.getId(), tipo, texto, quantidade);
    }

    private TipoDoacao lerTipo(String texto) {
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException("Tipo obrigatório!");
        }
        try {
            return TipoDoacao.valueOf(texto.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Tipo inválido! Use IMPRESSORA, FILAMENTO ou AMBOS.");
        }
    }

    private int lerQuantidade(String texto) {
        if (texto == null || texto.isBlank()) return 1;
        try {
            int q = Integer.parseInt(texto.trim());
            if (q < 1 || q > QUANTIDADE_MAX) {
                throw new IllegalArgumentException("Quantidade deve ficar entre 1 e " + QUANTIDADE_MAX + "!");
            }
            return q;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Quantidade inválida!");
        }
    }
}