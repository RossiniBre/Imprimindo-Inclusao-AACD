package aacd.util;

import java.time.LocalDateTime;

public final class PrazosSolicitacao {
    public static final int PENDENTE_EXPIRA_DIAS = 30;
    public static final int FINALIZADA_APAGA_DIAS = 60;
    private PrazosSolicitacao() {}

    public static LocalDateTime expiracaoPendente(LocalDateTime criadaEm) {
        return criadaEm.plusDays(PENDENTE_EXPIRA_DIAS);
    }
}