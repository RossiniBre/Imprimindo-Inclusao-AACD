package aacd.config;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

public class ConnectionFactory {

    private static Properties props;

    private static synchronized Properties props() {
        if (props == null) {
            props = carregar();
        }
        return props;
    }

    private static Properties carregar() {
        Properties p = new Properties();
        try (InputStream in = ConnectionFactory.class.getClassLoader()
                .getResourceAsStream("db.properties")) {
            if (in == null) {
                throw new IllegalStateException("db.properties não encontrado");
            }
            p.load(in);
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao ler db.properties", e);
        }
        return p;
    }

    public static Connection getConnection() throws SQLException {
        Properties p = props();
        return DriverManager.getConnection(
                p.getProperty("db.url"),
                p.getProperty("db.user"),
                p.getProperty("db.password"));
    }
}