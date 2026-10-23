package aacd.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PrazosSolicitacaoTest {

    @Test
    void pendenteExpiraTrintaDiasDepoisDaCriacao() {
        LocalDateTime criada = LocalDateTime.of(2026, 10, 1, 9, 30);

        assertEquals(LocalDateTime.of(2026, 10, 31, 9, 30),
                PrazosSolicitacao.expiracaoPendente(criada));
    }

    @Test
    void expiracaoAtravessaViradaDeMesEAno() {
        LocalDateTime criada = LocalDateTime.of(2026, 12, 15, 23, 59);

        assertEquals(LocalDateTime.of(2027, 1, 14, 23, 59),
                PrazosSolicitacao.expiracaoPendente(criada));
    }

    @Test
    void expiracaoUsaOPrazoDaConstante() {
        LocalDateTime criada = LocalDateTime.of(2026, 3, 10, 8, 0);

        assertEquals(criada.plusDays(PrazosSolicitacao.PENDENTE_EXPIRA_DIAS),
                PrazosSolicitacao.expiracaoPendente(criada));
    }
}