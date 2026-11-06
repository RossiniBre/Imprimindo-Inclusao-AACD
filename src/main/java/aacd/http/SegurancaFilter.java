package aacd.http;

import com.sun.net.httpserver.Filter;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.util.List;

public class SegurancaFilter extends Filter {
    private static final List<String> SENSIVEIS = List.of("senha", "password", "token", "sessao");

    @Override
    public void doFilter(HttpExchange ex, Chain chain) throws IOException {
        String q = ex.getRequestURI().getRawQuery();
        if (q != null) {
            String baixo = q.toLowerCase();
            for (String k : SENSIVEIS) {
                if (baixo.startsWith(k + "=") || baixo.contains("&" + k + "=")) {
                    Http.erro(ex, 400, "Dados sensíveis não podem ir na URL.");
                    return;
                }
            }
        }
        Headers h = ex.getResponseHeaders();
        h.set("Referrer-Policy", "no-referrer");
        h.set("X-Content-Type-Options", "nosniff");
        h.set("X-Frame-Options", "DENY");
        if (ex.getRequestURI().getPath().startsWith("/api")) {
            h.set("Cache-Control", "no-store");
        }
        chain.doFilter(ex);
    }

    @Override
    public String description() {
        return "Bloqueia segredos na URL e põe cabeçalhos de segurança";
    }
}