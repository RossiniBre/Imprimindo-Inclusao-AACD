package aacd.service;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;

import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

public class EnviadorEmailJakarta implements EnviadorEmail {

    private final Session session;
    private final String usuario;
    private final String remetenteNome;

    public EnviadorEmailJakarta() {
        Properties cfg = carregar();
        this.usuario = cfg.getProperty("mail.usuario");
        this.remetenteNome = cfg.getProperty("mail.remetente.nome", "Imprimindo Inclusão");
        String senha = cfg.getProperty("mail.senha");

        Properties smtp = new Properties();
        smtp.put("mail.smtp.host", cfg.getProperty("mail.host", "smtp.gmail.com"));
        smtp.put("mail.smtp.port", cfg.getProperty("mail.port", "587"));
        smtp.put("mail.smtp.auth", "true");
        smtp.put("mail.smtp.starttls.enable", "true");
        smtp.put("mail.smtp.connectiontimeout", "10000");
        smtp.put("mail.smtp.timeout", "10000");
        smtp.put("mail.smtp.writetimeout", "10000");

        this.session = Session.getInstance(smtp, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(usuario, senha);
            }
        });
    }

    @Override
    public void enviar(String destinatario, String assunto, String html, String texto)
            throws EmailException {
        try {
            MimeMessage msg = new MimeMessage(session);
            msg.setFrom(new InternetAddress(usuario, remetenteNome, "UTF-8"));
            msg.setRecipient(Message.RecipientType.TO, new InternetAddress(destinatario));
            msg.setSubject(assunto, "UTF-8");

            MimeBodyPart parteTexto = new MimeBodyPart();
            parteTexto.setText(texto, "UTF-8");
            MimeBodyPart parteHtml = new MimeBodyPart();
            parteHtml.setContent(html, "text/html; charset=UTF-8");
            
            MimeMultipart corpo = new MimeMultipart("alternative");
            corpo.addBodyPart(parteTexto);
            corpo.addBodyPart(parteHtml);
            msg.setContent(corpo);

            Transport.send(msg);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new EmailException("Falha ao enviar e-mail", e);
        }
    }

    private static Properties carregar() {
        try (InputStream in = EnviadorEmailJakarta.class.getClassLoader()
                .getResourceAsStream("mail.properties")) {
            if (in == null) {
                throw new IllegalStateException("mail.properties não encontrado em src/main/resources");
            }
            Properties p = new Properties();
            p.load(new java.io.InputStreamReader(in, StandardCharsets.UTF_8));
            return p;
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao ler mail.properties", e);
        }
    }
}