package com.app.finance.finance_api.service;

import com.app.finance.finance_api.model.Preferences;
import com.app.finance.finance_api.repository.PreferencesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Locale;

@Service
public class PreferencesService {
    private final PreferencesRepository repository;
    public PreferencesService(PreferencesRepository repository) { this.repository = repository; }
    public record Values(List<String> wallets, List<String> responsible, List<String> incomeSources, List<String> investmentTypes) {}
    public static Values defaults() {
        return new Values(List.of("Conta", "Vale alimentação", "Vale flexível"), List.of("Eu", "Mãe", "Pai"),
            List.of("TAGNA", "Mãe", "Pai", "Presentes", "Mesada"), List.of("Poupança", "Caixinha", "Renda fixa", "Ações", "Fundos", "Cripto", "Outros"));
    }
    @Transactional(readOnly = true)
    public Values get(Long userId) {
        return repository.findById(userId).map(p -> new Values(List.copyOf(p.getWallets()), List.copyOf(p.getResponsible()), List.copyOf(p.getIncomeSources()), List.copyOf(p.getInvestmentTypes()))).orElseGet(PreferencesService::defaults);
    }
    @Transactional
    public Values save(Long userId, Values values) {
        Preferences p = new Preferences(); p.setId(userId);
        p.setWallets(validate(values.wallets())); p.setResponsible(validate(values.responsible()));
        p.setIncomeSources(validate(values.incomeSources())); p.setInvestmentTypes(validate(values.investmentTypes()));
        repository.save(p); return get(userId);
    }
    private List<String> validate(List<String> values) {
        if (values == null || values.isEmpty() || values.size() > 50 || values.stream().anyMatch(x -> x == null || x.isBlank() || x.trim().length() > 80))
            throw new IllegalArgumentException("Informe entre 1 e 50 opções por lista, com até 80 caracteres cada.");
        List<String> clean = values.stream().map(String::trim).toList();
        if (clean.stream().map(x -> x.toLowerCase(Locale.ROOT)).distinct().count() != clean.size())
            throw new IllegalArgumentException("Remova as opções duplicadas.");
        return clean;
    }
}
