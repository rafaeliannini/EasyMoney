package com.app.finance.finance_api.repository;
import com.app.finance.finance_api.model.Preferences;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PreferencesRepository extends JpaRepository<Preferences, Long> {}
