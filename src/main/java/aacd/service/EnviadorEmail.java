package aacd.service;

public interface EnviadorEmail {

    void enviar(String destinatario, String assunto, String html, String texto)
            throws EmailException;
}