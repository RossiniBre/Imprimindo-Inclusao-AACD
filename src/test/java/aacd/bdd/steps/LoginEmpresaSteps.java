package aacd.bdd.steps;

import aacd.dao.UsuarioDao;
import aacd.model.Usuario;
import aacd.service.AutenticacaoService;
import aacd.service.ContaBloqueadaException;
import aacd.util.Senha;
import io.cucumber.java.pt.Dado;
import io.cucumber.java.pt.Quando;
import io.cucumber.java.pt.Então;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class LoginEmpresaSteps {

    private static final String CNPJ = "12345678000199";
    private static final String SENHA = "senha123";

    private final UsuarioDao usuarioDao = mock(UsuarioDao.class);
    private final AutenticacaoService service = new AutenticacaoService(usuarioDao);
    private final Usuario empresa = mock(Usuario.class);

    private Optional<Usuario> resultado = Optional.empty();
    private ContaBloqueadaException bloqueio;

    private void prepararEmpresaDesativada(boolean bloqueadaPelaAacd) throws Exception {
        when(empresa.getId()).thenReturn(1);
        when(empresa.getSenhaHash()).thenReturn(Senha.gerarHash(SENHA));
        when(empresa.isAtivo()).thenReturn(false);
        when(empresa.isBloqueadaPelaAacd()).thenReturn(bloqueadaPelaAacd);
        when(usuarioDao.buscarPorIdentificador(anyString())).thenReturn(empresa);
    }

    @Dado("uma empresa cadastrada e desativada pela AACD")
    public void empresaDesativadaPelaAacd() throws Exception {
        prepararEmpresaDesativada(true);
    }

    @Dado("uma empresa que desativou a própria conta")
    public void empresaDesativouAPropriaConta() throws Exception {
        prepararEmpresaDesativada(false);
    }

    @Quando("ela faz login com CNPJ e senha corretos")
    public void elaFazLogin() throws Exception {
        try {
            resultado = service.autenticar(CNPJ, SENHA);
        } catch (ContaBloqueadaException e) {
            bloqueio = e;
        }
    }

    @Então("o login é recusado")
    public void loginRecusado() {
        assertNotNull(bloqueio);
        assertTrue(resultado.isEmpty());
    }

    @Então("a conta continua desativada")
    public void contaContinuaDesativada() throws Exception {
        verify(usuarioDao, never()).atualizarSituacao(anyInt(), anyBoolean(), anyBoolean());
        verify(empresa, never()).setAtivo(true);
    }

    @Então("o login é aceito")
    public void loginAceito() {
        assertNull(bloqueio);
        assertTrue(resultado.isPresent());
    }

    @Então("a conta volta a ficar ativa")
    public void contaVoltaAFicarAtiva() throws Exception {
        verify(usuarioDao).atualizarSituacao(1, true, false);
        verify(empresa).setAtivo(true);
    }
}