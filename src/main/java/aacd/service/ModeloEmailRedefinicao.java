package aacd.service;

public final class ModeloEmailRedefinicao {

    private ModeloEmailRedefinicao() {}

    public static String assunto() {
        return "Seu código de redefinição de senha";
    }

    public static String texto(String nome, String codigo, int minutos) {
        return "Olá, " + nome + "!\n\n"
                + "Seu código para redefinir a senha é: " + codigo + "\n"
                + "Ele expira em " + minutos + " minutos.\n\n"
                + "Se não foi você, ignore este e-mail.";
    }

    public static String html(String nome, String codigo, int minutos) {
        return "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#FAF8F5;font-family:Arial,Helvetica,sans-serif;\">"
                + "<tr><td align=\"center\" style=\"padding:24px;\">"
                + "<table width=\"480\" cellpadding=\"0\" cellspacing=\"0\">"
                + "<tr><td style=\"background:#C8102E;color:#ffffff;padding:16px 24px;font-size:20px;font-weight:bold;\">Imprimindo Inclusão</td></tr>"
                + "<tr><td style=\"padding:24px;color:#2B2B2B;font-size:16px;\">"
                + "<p>Olá, " + escapar(nome) + "!</p>"
                + "<p>Use este código para redefinir sua senha:</p>"
                + "<p style=\"background:#ffffff;border:1px solid #CAC9C6;text-align:center;font-size:32px;letter-spacing:8px;font-weight:bold;padding:16px;\">"
                + codigo + "</p>"
                + "<p>O código expira em " + minutos + " minutos.</p>"
                + "<p style=\"font-size:13px;color:#666666;\">Se não foi você, ignore este e-mail.</p>"
                + "</td></tr></table></td></tr></table>";
    }

    private static String escapar(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}