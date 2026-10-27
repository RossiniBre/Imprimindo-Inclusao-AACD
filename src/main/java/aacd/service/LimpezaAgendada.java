package aacd.service;

import aacd.util.PrazosSolicitacao;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

public class LimpezaAgendada {

    private static final Logger LOG = Logger.getLogger(LimpezaAgendada.class.getName());

    private final LimparSolicitacoes limpeza;
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "limpeza-solicitacoes");
        t.setDaemon(true);
        return t;
    });

    public LimpezaAgendada(LimparSolicitacoes limpeza) {
        this.limpeza = limpeza;
    }

    public void iniciar() {
        executor.scheduleAtFixedRate(this::rodar, 0, 1, TimeUnit.DAYS);
    }

    public void parar() {
        executor.shutdown();
    }

    void rodar() {
        try {
            LimparSolicitacoes.Resultado r = limpeza.executar(
                    PrazosSolicitacao.PENDENTE_EXPIRA_DIAS, PrazosSolicitacao.FINALIZADA_APAGA_DIAS);
            LOG.info("Limpeza: " + r.canceladas + " canceladas, " + r.apagadas + " apagadas");
        } catch (Throwable t) {
            LOG.log(Level.SEVERE, "Falha na limpeza automática", t);
        }
    }
}