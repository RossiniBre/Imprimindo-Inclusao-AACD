package aacd.model;

public record EmpresaResumo(int id, int usuarioId, String nome, String email,
                            String telefone, Endereco endereco, boolean ativo) {}