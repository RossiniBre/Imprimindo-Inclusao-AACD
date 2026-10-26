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
        String e = normalizar(email);
        if (e == null || e.isEmpty()) return "E-mail é obrigatório.";
        if (e.length() > TAMANHO_MAX) return "E-mail deve ter no máximo " + TAMANHO_MAX + " caracteres.";
        if (!FORMATO.matcher(e).matches()) return "E-mail inválido.";
        if (!TRECHO_PERMITIDO.isEmpty() && !e.contains(TRECHO_PERMITIDO.toLowerCase()))
            return "O e-mail deve conter " + TRECHO_PERMITIDO + ".";
        return null;
    }
}