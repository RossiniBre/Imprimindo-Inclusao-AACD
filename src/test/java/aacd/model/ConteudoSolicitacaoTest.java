package aacd.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class ConteudoSolicitacaoTest {

    private static final LocalDate PRAZO = LocalDate.now().plusDays(7);

    // Se Material for enum, troque por Material.values()[0] (ou um valor específico)
    private static Material material() {
        return mock(Material.class);
    }

    private static ConteudoSolicitacao criar(String titulo, String descricao, int quantidade,
                                             int comprimento, int largura, int altura,
                                             String arquivoId, String nomeArquivo) {
        return new ConteudoSolicitacao(titulo, descricao, quantidade, material(),
                comprimento, largura, altura, PRAZO, arquivoId, nomeArquivo);
    }

    private static ConteudoSolicitacao reconstruir(String mongoId, int quantidade) {
        return new ConteudoSolicitacao(mongoId, "Prótese", "Antebraço direito", quantidade, material(),
                180, 60, 40, PRAZO, "arq123", "protese.stl");
    }

    private static ConteudoSolicitacao valido() {
        return criar("Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl");
    }

    @Test
    void criacao_guardaOsCampos() {
        ConteudoSolicitacao c = valido();

        assertEquals("Prótese", c.getTitulo());
        assertEquals("Antebraço direito", c.getDescricao());
        assertEquals(1, c.getQuantidade());
        assertEquals("arq123", c.getArquivoId());
        assertEquals("protese.stl", c.getNomeArquivo());
        assertEquals(PRAZO, c.getPrazoDesejado());
        assertNotNull(c.getMaterial());
        assertNull(c.getMongoId());
    }

    @Test
    void guardaAsMedidasDaPeca() {
        ConteudoSolicitacao c = valido();

        assertEquals(180, c.getComprimentoMm());
        assertEquals(60, c.getLarguraMm());
        assertEquals(40, c.getAlturaMm());
    }

    @Test
    void recusaMedidaZeroOuNegativa() {
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "Antebraço direito", 1, 0, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "Antebraço direito", 1, 180, -5, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "Antebraço direito", 1, 180, 60, 0, "arq123", "protese.stl"));
    }

    @Test
    void materialNuloRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, null, 180, 60, 40, PRAZO, "arq123", "protese.stl"));
    }

    @Test
    void prazoDesejadoNuloEhAceito() {
        ConteudoSolicitacao c = new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, material(), 180, 60, 40, null, "arq123", "protese.stl");
        assertNull(c.getPrazoDesejado());
    }

    @Test
    void tituloVazioOuNuloRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> criar(" ", "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class,
                () -> criar(null, "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void tituloMaiorQueOLimiteRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> criar("a".repeat(101), "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void descricaoVaziaOuNulaRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "  ", 1, 180, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", null, 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void descricaoMaiorQueOLimiteRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "a".repeat(2001), 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void quantidadeForaDoIntervaloRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "Antebraço direito", 0, 180, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "Antebraço direito", 1001, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void quantidadeNoLimiteAceita() {
        ConteudoSolicitacao c = criar("Prótese", "Antebraço direito", 1000, 180, 60, 40,
                "arq123", "protese.stl");
        assertEquals(1000, c.getQuantidade());
    }

    @Test
    void arquivoIdVazioRecusa() {
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "Antebraço direito", 1, 180, 60, 40, " ", "protese.stl"));
        assertThrows(IllegalArgumentException.class,
                () -> criar("Prótese", "Antebraço direito", 1, 180, 60, 40, null, "protese.stl"));
    }

    @Test
    void nomeDoArquivoInvalidoRecusa() {
        for (String nome : new String[]{" ", "pasta/protese.stl", "pasta\\protese.stl",
                "programa.exe", "semextensao"}) {
            assertThrows(IllegalArgumentException.class,
                    () -> criar("Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", nome),
                    "Deveria recusar: " + nome);
        }
    }

    @Test
    void extensoesAceitasIgnoramMaiusculas() {
        for (String nome : new String[]{"a.stl", "a.OBJ", "a.3MF"}) {
            ConteudoSolicitacao c = criar("Prótese", "Antebraço direito", 1, 180, 60, 40,
                    "arq123", nome);
            assertEquals(nome, c.getNomeArquivo());
        }
    }

    @Test
    void reconstrucao_guardaOMongoIdEAsMedidas() {
        ConteudoSolicitacao c = reconstruir("0123456789abcdef01234567", 2);

        assertEquals("0123456789abcdef01234567", c.getMongoId());
        assertEquals(2, c.getQuantidade());
        assertEquals(180, c.getComprimentoMm());
    }

    @Test
    void reconstrucao_mongoIdInvalidoRecusa() {
        assertThrows(IllegalArgumentException.class, () -> reconstruir("xyz", 1));
        assertThrows(IllegalArgumentException.class, () -> reconstruir(null, 1));
    }

    @Test
    void setQuantidade_invalidaNaoAlteraOValorAnterior() {
        ConteudoSolicitacao c = valido();

        assertThrows(IllegalArgumentException.class, () -> c.setQuantidade(0));
        assertEquals(1, c.getQuantidade());
    }

    @Test
    void setMedida_invalidaNaoAlteraOValorAnterior() {
        ConteudoSolicitacao c = valido();

        assertThrows(IllegalArgumentException.class, () -> c.setLarguraMm(0));
        assertEquals(60, c.getLarguraMm());
    }
}