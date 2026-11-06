package aacd.util;

import java.util.Arrays;

public final class ValidadorVolume {
    private ValidadorVolume() {}

    public static boolean cabe(int pecaC, int pecaL, int pecaA,
                               int impC, int impL, int impA) {
        int[] peca = {pecaC, pecaL, pecaA};
        int[] imp = {impC, impL, impA};
        Arrays.sort(peca);
        Arrays.sort(imp);
        return peca[0] <= imp[0] && peca[1] <= imp[1] && peca[2] <= imp[2];
    }
}