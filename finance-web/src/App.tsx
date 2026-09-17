import { useEffect, useState } from 'react';
import { api } from './services/api';

// Tipagem do TypeScript para o nosso Usuário
interface User {
  id: number;
  name: string;
  email: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // GET: Busca os usuários ao carregar a página
  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Erro ao buscar usuários", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // POST: Cria um novo usuário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', { name, email });
      setName('');
      setEmail('');
      fetchUsers(); // Recarrega a lista após criar
    } catch (error) {
      console.error("Erro ao criar usuário", error);
      alert("Erro ao criar usuário. Verifique se o e-mail já existe.");
    }
  };

  // DELETE: Deleta um usuário
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      console.error("Erro ao deletar usuário", error);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Gestão de Usuários</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Nome" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
        />
        <input 
          type="email" 
          placeholder="E-mail" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
        />
        <button type="submit">Salvar</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map(user => (
          <li key={user.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #ccc' }}>
            <span>{user.name} ({user.email})</span>
            <button onClick={() => handleDelete(user.id)} style={{ color: 'red', cursor: 'pointer' }}>Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;