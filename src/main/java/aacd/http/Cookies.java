package aacd.http;

public final class Cookies {

    private Cookies() {}

    private static boolean producao() {
        return "true".equals(System.getenv("AACD_PROD"));
    }

    public static String sessao(String token) {
        return "SESSAO=" + token + "; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800"
             + (producao() ? "; Secure" : "");
    }

    public static String expirado() {
        return "SESSAO=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0"
             + (producao() ? "; Secure" : "");
    }
}