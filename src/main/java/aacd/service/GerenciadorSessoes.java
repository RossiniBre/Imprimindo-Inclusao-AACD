package aacd.service;

import aacd.model.Sessao;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class GerenciadorSessoes {

    private static final long DURACAO_MS = 60 * 60 * 1000; // 1h sem uso

    private final SecureRandom random = new SecureRandom();
    private final Map<String, Sessao> sessoes = new ConcurrentHashMap<>();
    private ScheduledExecutorService limpador;

    public String criar(int usuarioId, String perfil) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sessoes.put(token, new Sessao(usuarioId, perfil, DURACAO_MS));
        return token;
    }

    public Optional<Sessao> buscar(String token) {
        if (token == null) return Optional.empty();
        Sessao s = sessoes.get(token);
        if (s == null) return Optional.empty();
        if (s.expirada()) {
            sessoes.remove(token);
            return Optional.empty();
        }
        s.renovar(DURACAO_MS);
        return Optional.of(s);
    }

    public void destruir(String token) {
        if (token != null) sessoes.remove(token);
    }

    public void limparExpiradas() {
        sessoes.values().removeIf(Sessao::expirada);
    }

    public void iniciarLimpezaPeriodica(long intervaloSegundos) {
        limpador = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "limpeza-sessoes");
            t.setDaemon(true);
            return t;
        });
        limpador.scheduleWithFixedDelay(() -> {
            try {
                limparExpiradas();
            } catch (RuntimeException e) {
                e.printStackTrace();
            }
        }, intervaloSegundos, intervaloSegundos, TimeUnit.SECONDS);
    }
}