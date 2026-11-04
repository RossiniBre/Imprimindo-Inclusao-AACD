package aacd.util;

import java.security.SecureRandom;

public final class CodigoRedefinicao {

    private static final SecureRandom RANDOM = new SecureRandom();

    private CodigoRedefinicao() {}

    public static String gerar() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}