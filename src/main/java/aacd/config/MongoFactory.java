package aacd.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public class MongoFactory {

    private static final Properties PROPS = carregar();
    private static final MongoClient CLIENT = MongoClients.create(PROPS.getProperty("mongo.uri"));

    private static Properties carregar() {
        Properties props = new Properties();
        try (InputStream in = MongoFactory.class.getClassLoader()
                .getResourceAsStream("db.properties")) {
            if (in == null) {
                throw new IllegalStateException("db.properties não encontrado em src/main/resources");
            }
            props.load(in);
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao ler db.properties", e);
        }
        return props;
    }

    public static MongoDatabase getDatabase() {
        return CLIENT.getDatabase(PROPS.getProperty("mongo.database"));
    }
}