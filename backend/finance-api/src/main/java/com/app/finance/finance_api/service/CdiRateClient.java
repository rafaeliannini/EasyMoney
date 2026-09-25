package com.app.finance.finance_api.service;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Component
public class CdiRateClient {
    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final RestClient client;
    public CdiRateClient() {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        factory.setReadTimeout(Duration.ofSeconds(20));
        client = RestClient.builder().requestFactory(factory).baseUrl("https://api.bcb.gov.br").build();
    }
    public record Quote(String data, String valor) {}
    public List<CdiCalculator.Rate> fetch(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) return List.of();
        Quote[] quotes = client.get().uri(builder -> builder.path("/dados/serie/bcdata.sgs.12/dados")
            .queryParam("formato", "json").queryParam("dataInicial", from.format(FORMAT)).queryParam("dataFinal", to.format(FORMAT)).build())
            .retrieve().body(Quote[].class);
        if (quotes == null) throw new IllegalStateException("O Banco Central não retornou cotações.");
        return Arrays.stream(quotes).map(q -> new CdiCalculator.Rate(LocalDate.parse(q.data(), FORMAT), new BigDecimal(q.valor()))).toList();
    }
}
