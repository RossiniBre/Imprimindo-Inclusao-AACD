package aacd.service;

public class EmailException extends Exception {
    public EmailException(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }
}