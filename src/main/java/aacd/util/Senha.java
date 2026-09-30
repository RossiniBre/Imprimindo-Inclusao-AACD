package aacd.util;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

public class Senha {

    private static final int ITERACOES = 210_000;
    private static final int TAMANHO_SALT = 16;
    private static final int TAMANHO_HASH = 32;

    public static String gerarHash(String senha) {
        byte[] salt = new byte[TAMANHO_SALT];
        new SecureRandom().nextBytes(salt);
        byte[] hash = derivar(senha, salt, ITERACOES);
        return ITERACOES + ":" + Base64.getEncoder().encodeToString(salt)
                + ":" + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean confere(String senha, String armazenado) {
        String[] partes = armazenado.split(":");
        if (partes.length != 3) {
            return false;
        }
        int iteracoes = Integer.parseInt(partes[0]);
        byte[] salt = Base64.getDecoder().decode(partes[1]);
        byte[] esperado = Base64.getDecoder().decode(partes[2]);
        return MessageDigest.isEqual(esperado, derivar(senha, salt, iteracoes));
    }

    private static byte[] derivar(String senha, byte[] salt, int iteracoes) {
        try {
            PBEKeySpec spec = new PBEKeySpec(senha.toCharArray(), salt, iteracoes, TAMANHO_HASH * 8);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("Erro ao gerar o hash da senha", e);
        }
    }
}