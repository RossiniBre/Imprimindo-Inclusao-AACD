package aacd.http;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpPrincipal;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;

class FakeExchange extends HttpExchange {

    private final Headers cabecalhosRequisicao = new Headers();
    private final Headers cabecalhosResposta = new Headers();
    private final ByteArrayOutputStream saida = new ByteArrayOutputStream();
    private final String metodo;
    private final URI uri;
    private final InputStream corpo;
    private int status = -1;

    FakeExchange(String metodo, String uri, byte[] corpo) {
        this.metodo = metodo;
        this.uri = URI.create(uri);
        this.corpo = new ByteArrayInputStream(corpo);
    }

    FakeExchange(String metodo, String uri, String corpo) {
        this(metodo, uri, corpo.getBytes(StandardCharsets.UTF_8));
    }

    FakeExchange(String metodo, String uri) {
        this(metodo, uri, new byte[0]);
    }

    FakeExchange comCookie(String valor) {
        cabecalhosRequisicao.add("Cookie", valor);
        return this;
    }

    int status() { return status; }

    String resposta() { return saida.toString(StandardCharsets.UTF_8); }

    String cabecalho(String nome) { return cabecalhosResposta.getFirst(nome); }

    @Override public Headers getRequestHeaders() { return cabecalhosRequisicao; }
    @Override public Headers getResponseHeaders() { return cabecalhosResposta; }
    @Override public URI getRequestURI() { return uri; }
    @Override public String getRequestMethod() { return metodo; }
    @Override public HttpContext getHttpContext() { return null; }
    @Override public void close() { }
    @Override public InputStream getRequestBody() { return corpo; }
    @Override public OutputStream getResponseBody() { return saida; }
    @Override public void sendResponseHeaders(int codigo, long tamanho) { this.status = codigo; }
    @Override public InetSocketAddress getRemoteAddress() { return null; }
    @Override public int getResponseCode() { return status; }
    @Override public InetSocketAddress getLocalAddress() { return null; }
    @Override public String getProtocol() { return "HTTP/1.1"; }
    @Override public Object getAttribute(String nome) { return null; }
    @Override public void setAttribute(String nome, Object valor) { }
    @Override public void setStreams(InputStream i, OutputStream o) { }
    @Override public HttpPrincipal getPrincipal() { return null; }
}