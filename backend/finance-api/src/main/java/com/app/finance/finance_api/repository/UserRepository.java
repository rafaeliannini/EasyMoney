package com.app.finance.finance_api.repository;

import com.app.finance.finance_api.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByFirebaseUid(String firebaseUid);
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "insert into tb_users (firebase_uid, email, name, photo_url) values (:uid, :email, :name, :photo) on conflict (firebase_uid) do update set email = excluded.email, name = excluded.name, photo_url = excluded.photo_url", nativeQuery = true)
    void syncProfile(@org.springframework.data.repository.query.Param("uid") String uid,
                     @org.springframework.data.repository.query.Param("email") String email,
                     @org.springframework.data.repository.query.Param("name") String name,
                     @org.springframework.data.repository.query.Param("photo") String photo);
}
