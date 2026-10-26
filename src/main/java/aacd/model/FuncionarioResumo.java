package aacd.model;

public record FuncionarioResumo(int usuarioId, String nome, String identificador, String email,
                                String perfil, String cargo, String setor, boolean ativo) {}