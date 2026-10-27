package aacd.service;

import aacd.dao.ImpressoraDao;
import aacd.dao.ImpressoraMateriaisDao;
import aacd.model.Disponibilidade;
import aacd.model.Material;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ListarImpressorasTest {

    private static final Material MATERIAL = Material.values()[0];

    private ImpressoraDao impressoraDao;
    private ImpressoraMateriaisDao materiaisDao;
    private ListarImpressoras service;

    @BeforeEach
    void preparar() {
        impressoraDao = mock(ImpressoraDao.class);
        materiaisDao = mock(ImpressoraMateriaisDao.class);
        service = new ListarImpressoras(impressoraDao, materiaisDao);
    }

    private ImpressoraDao.ItemPainel painel(int id, int empresaId, String empresa) {
        return new ImpressoraDao.ItemPainel(id, empresaId, empresa, "Modelo " + id,
                Disponibilidade.OCIOSA, true);
    }

    @Test
    void semFiltrosListaTudoComEmpresaEMateriais() throws Exception {
        when(impressoraDao.listarPainel(null, null, null))
                .thenReturn(List.of(painel(1, 7, "Empresa A"), painel(2, 8, "Empresa B")));
        when(materiaisDao.buscarVarias(List.of(1, 2)))
                .thenReturn(Map.of(1, EnumSet.of(MATERIAL), 2, EnumSet.noneOf(Material.class)));

        List<ListarImpressoras.Item> itens = service.listar(null, null, null);

        assertEquals(2, itens.size());
        assertEquals("Empresa A", itens.get(0).impressora().empresa());
        assertEquals(Set.of(MATERIAL), itens.get(0).materiais());
        assertEquals("Empresa B", itens.get(1).impressora().empresa());
        verify(materiaisDao, never()).idsPorMaterial(any());
    }

    @Test
    void filtroPorMaterialUsaOsIdsDoMongoNaConsulta() throws Exception {
        when(materiaisDao.idsPorMaterial(MATERIAL)).thenReturn(List.of(1, 3));
        when(impressoraDao.listarPainel(null, null, List.of(1, 3)))
                .thenReturn(List.of(painel(1, 7, "Empresa A")));
        when(materiaisDao.buscarVarias(List.of(1))).thenReturn(Map.of(1, EnumSet.of(MATERIAL)));

        List<ListarImpressoras.Item> itens = service.listar(null, null, MATERIAL);

        assertEquals(1, itens.size());
        verify(impressoraDao).listarPainel(null, null, List.of(1, 3));
    }

    @Test
    void materialSemNenhumaImpressoraDevolveListaVaziaSemConsultarOMysql() throws Exception {
        when(materiaisDao.idsPorMaterial(MATERIAL)).thenReturn(List.of());

        assertTrue(service.listar(null, null, MATERIAL).isEmpty());

        verifyNoInteractions(impressoraDao);
    }

    @Test
    void repassaEmpresaEDisponibilidadeParaOMysql() throws Exception {
        when(impressoraDao.listarPainel(7, Disponibilidade.OCIOSA, null)).thenReturn(List.of());

        service.listar(7, Disponibilidade.OCIOSA, null);

        verify(impressoraDao).listarPainel(7, Disponibilidade.OCIOSA, null);
    }

    @Test
    void impressoraSemDocumentoNoMongoFicaComMateriaisVazios() throws Exception {
        when(impressoraDao.listarPainel(null, null, null)).thenReturn(List.of(painel(1, 7, "Empresa A")));
        when(materiaisDao.buscarVarias(List.of(1))).thenReturn(Map.of());

        List<ListarImpressoras.Item> itens = service.listar(null, null, null);

        assertTrue(itens.get(0).materiais().isEmpty());
    }

    @Test
    void listaVaziaNaoConsultaOMongoDeNovo() throws Exception {
        when(impressoraDao.listarPainel(null, null, null)).thenReturn(List.of());

        assertTrue(service.listar(null, null, null).isEmpty());

        verify(materiaisDao, never()).buscarVarias(any());
    }
}