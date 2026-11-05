package aacd.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ConteudoSolicitacaoTest {

    private static ConteudoSolicitacao valido() {
        return new ConteudoSolicitacao("Prótese", "Antebraço direito", 1, 180, 60, 40,
                "arq123", "protese.stl");
    }

    @Test
    void criacao_guardaOsCampos() {
        ConteudoSolicitacao c = valido();

        assertEquals("Prótese", c.getTitulo());
        assertEquals("Antebraço direito", c.getDescricao());
        assertEquals(1, c.getQuantidade());
        assertEquals("arq123", c.getArquivoId());
        assertEquals("protese.stl", c.getNomeArquivo());
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
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 0, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, -5, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 0, "arq123", "protese.stl"));
    }

    @Test
    void tituloVazioOuNuloRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                " ", "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                null, "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void tituloMaiorQueOLimiteRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "a".repeat(101), "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void descricaoVaziaOuNulaRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "  ", 1, 180, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", null, 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void descricaoMaiorQueOLimiteRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "a".repeat(2001), 1, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void quantidadeForaDoIntervaloRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 0, 180, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1001, 180, 60, 40, "arq123", "protese.stl"));
    }

    @Test
    void quantidadeNoLimiteAceita() {
        ConteudoSolicitacao c = new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1000, 180, 60, 40, "arq123", "protese.stl");
        assertEquals(1000, c.getQuantidade());
    }

    @Test
    void arquivoIdVazioRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 40, " ", "protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 40, null, "protese.stl"));
    }

    @Test
    void nomeDoArquivoInvalidoRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", " "));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", "pasta/protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", "pasta\\protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", "programa.exe"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(
                "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", "semextensao"));
    }

    @Test
    void extensoesAceitasIgnoramMaiusculas() {
        for (String nome : new String[]{"a.stl", "a.OBJ", "a.3MF"}) {
            ConteudoSolicitacao c = new ConteudoSolicitacao(
                    "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", nome);
            assertEquals(nome, c.getNomeArquivo());
        }
    }

    @Test
    void reconstrucao_guardaOMongoIdEAsMedidas() {
        ConteudoSolicitacao c = new ConteudoSolicitacao("0123456789abcdef01234567",
                "Prótese", "Antebraço direito", 2, 180, 60, 40, "arq123", "protese.stl");

        assertEquals("0123456789abcdef01234567", c.getMongoId());
        assertEquals(2, c.getQuantidade());
        assertEquals(180, c.getComprimentoMm());
    }

    @Test
    void reconstrucao_mongoIdInvalidoRecusa() {
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao("xyz",
                "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
        assertThrows(IllegalArgumentException.class, () -> new ConteudoSolicitacao(null,
                "Prótese", "Antebraço direito", 1, 180, 60, 40, "arq123", "protese.stl"));
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