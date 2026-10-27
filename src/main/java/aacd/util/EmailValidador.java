package aacd.util;

import java.util.regex.Pattern;

public final class EmailValidador {

    private EmailValidador() {}

    public static final String TRECHO_PERMITIDO = "@aacd.com";

    private static final int TAMANHO_MAX = 100;
    private static final Pattern FORMATO =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    public static String normalizar(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    public static String validar(String email) {
        return validar(email, TRECHO_PERMITIDO);
    }

    public static String validarLivre(String email) {
        return validar(email, "");
    }

    private static String validar(String email, String trecho) {
        String e = normalizar(email);
        if (e == null || e.isEmpty()) return "E-mail é obrigatório.";
        if (e.length() > TAMANHO_MAX) return "E-mail deve ter no máximo " + TAMANHO_MAX + " caracteres.";
        if (!FORMATO.matcher(e).matches()) return "E-mail inválido.";
        if (!trecho.isEmpty() && !e.endsWith(trecho.toLowerCase()))
            return "O e-mail deve conter " + trecho + ".";
        return null;
    }
}