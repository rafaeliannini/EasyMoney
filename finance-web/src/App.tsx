import { useEffect, useState } from 'react';
import { api } from './services/api';
import { auth } from './services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth'; 

// Tipagem do TypeScript para o nosso Usuário do Banco de Dados
interface User {
  id: number;
  name: string;
  email: string;
  firebaseUid: string;
}

function App() {
  // Estados de Autenticação (Firebase e Tela)
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isRegistering, setIsRegistering] = useState(false); // Alterna entre Login e Cadastro
  
  // Estados dos Formulários
  const [authName, setAuthName] = useState(''); // Usado apenas no cadastro
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Estados do CRUD (Backend)
  const [users, setUsers] = useState<User[]>([]);

  // 1. OUVINTE DE SESSÃO
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        fetchUsers(); 
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. FUNÇÕES DO FIREBASE E INTEGRAÇÃO COM BACKEND
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      console.error("Erro no login", error);
      alert("Erro ao fazer login. Verifique as credenciais.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita o recarregamento da página
    try {
      // 1. Cria o usuário no Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      
      // 2. Imediatamente salva os dados no PostgreSQL via API Java
      await api.post('/users', { 
        name: authName, 
        email: authEmail, 
        firebaseUid: userCredential.user.uid 
      });

      // 3. Limpa os campos
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      
      // O onAuthStateChanged vai detectar o login automático e buscar a lista atualizada
    } catch (error) {
      console.error("Erro no cadastro", error);
      alert("Erro ao cadastrar. O e-mail pode já estar em uso.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUsers([]); 
  };

  // 3. FUNÇÕES DE BUSCA E EXCLUSÃO (API JAVA)
  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Erro ao buscar usuários", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      console.error("Erro ao deletar usuário", error);
    }
  };

  // 4. RENDERIZAÇÃO CONDICIONAL (TELAS DE ACESSO)
  if (!authUser) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto', border: '1px solid #ccc', borderRadius: '8px', marginTop: '50px' }}>
        <h2 style={{ textAlign: 'center' }}>{isRegistering ? 'Criar Conta' : 'Acessar Conta'}</h2>
        
        <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {isRegistering && (
            <input 
              type="text" 
              placeholder="Seu Nome Completo" 
              value={authName} 
              onChange={e => setAuthName(e.target.value)} 
              required 
              style={{ padding: '10px' }}
            />
          )}

          <input 
            type="email" 
            placeholder="E-mail" 
            value={authEmail} 
            onChange={e => setAuthEmail(e.target.value)} 
            required 
            style={{ padding: '10px' }}
          />
          <input 
            type="password" 
            placeholder="Senha (mínimo 6 caracteres)" 
            value={authPassword} 
            onChange={e => setAuthPassword(e.target.value)} 
            required 
            style={{ padding: '10px' }}
          />
          
          <button type="submit" style={{ padding: '10px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
            {isRegistering ? 'Cadastrar e Entrar' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button 
            type="button" 
            onClick={() => setIsRegistering(!isRegistering)} 
            style={{ background: 'none', border: 'none', color: '#007BFF', cursor: 'pointer', textDecoration: 'underline' }}>
            {isRegistering ? 'Já tenho uma conta. Fazer Login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    );
  }

  // 5. RENDERIZAÇÃO CONDICIONAL (TELA DO SISTEMA)
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2>Dashboard Financeiro</h2>
        <button onClick={handleLogout} style={{ background: '#f44336', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>
          Sair
        </button>
      </div>
      
      <p>Logado no Firebase como: <strong>{authUser.email}</strong></p>
      
      <h3>Usuários registrados no Banco de Dados (PostgreSQL)</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map(user => (
          <li key={user.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', background: '#f9f9f9', marginBottom: '5px', borderRadius: '4px' }}>
            <div>
              <strong>{user.name}</strong> <br/>
              <small>{user.email}</small>
            </div>
            <button onClick={() => handleDelete(user.id)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold' }}>Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;