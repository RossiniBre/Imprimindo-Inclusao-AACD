package aacd.util;

public final class Identificador {

    private Identificador() {}

    private static final String CNPJ_FORMATADO =
            "[A-Za-z0-9]{2}\\.[A-Za-z0-9]{3}\\.[A-Za-z0-9]{3}/[A-Za-z0-9]{4}-\\d{2}";
    private static final String CNPJ_PURO = "[A-Za-z0-9]{12}\\d{2}";

    public static String normalizar(String identificador) {
        String limpo = identificador.trim();
        if (limpo.matches(CNPJ_FORMATADO)) {
            return limpo.replaceAll("[./-]", "").toUpperCase();
        }
        if (limpo.matches(CNPJ_PURO)) {
            return limpo.toUpperCase();
        }
        return limpo.toLowerCase();
    }

    public static boolean pareceCnpj(String identificador) {
        String limpo = identificador.trim();
        return limpo.matches(CNPJ_FORMATADO) || limpo.matches(CNPJ_PURO);
    }
}