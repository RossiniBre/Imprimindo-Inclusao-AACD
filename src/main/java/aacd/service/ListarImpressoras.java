package aacd.service;

import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.model.Disponibilidade;
import aacd.model.Material;

import java.sql.SQLException;
import java.util.*;

public class ListarImpressoras {

    public record Item(ImpressoraDao.ItemPainel impressora, Set<Material> materiais) {}

    private final ImpressoraDao impressoraDao;
    private final ImpressoraMateriaisDao materiaisDao;

    public ListarImpressoras() {
        this(new ImpressoraDao(), new ImpressoraMateriaisDao());
    }

    public ListarImpressoras(ImpressoraDao impressoraDao, ImpressoraMateriaisDao materiaisDao) {
        this.impressoraDao = impressoraDao;
        this.materiaisDao = materiaisDao;
    }

    public List<Item> listar(Integer empresaId, Disponibilidade disponibilidade, Material material)
            throws SQLException {

        List<Integer> ids = null;
        if (material != null) {
            ids = materiaisDao.idsPorMaterial(material);
            if (ids.isEmpty()) {
                return List.of();
            }
        }

        List<ImpressoraDao.ItemPainel> lista =
                impressoraDao.listarPainel(empresaId, disponibilidade, ids);
        if (lista.isEmpty()) {
            return List.of();
        }

        Map<Integer, Set<Material>> materiais = materiaisDao.buscarVarias(
                lista.stream().map(ImpressoraDao.ItemPainel::id).toList());

        List<Item> itens = new ArrayList<>();
        for (ImpressoraDao.ItemPainel p : lista) {
            itens.add(new Item(p, materiais.getOrDefault(p.id(), EnumSet.noneOf(Material.class))));
        }
        return itens;
    }
}