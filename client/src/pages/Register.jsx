import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerStaff } from '../services/api';
import styles from './Login.module.css'; // Reuse Login styles

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('Male');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await registerStaff(name, email, loginId, password, gender, position);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleRegister}>
        <div className={styles.header}>
           <div className={styles.logoIcon}></div>
           <h2>POLLSYSTEM Registration</h2>
        </div>
        <p className={styles.subtitle}>Create a Staff Account</p>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <input 
          className={styles.input}
          type="text" 
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input 
          className={styles.input}
          type="email" 
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          className={styles.input}
          type="text" 
          placeholder="Desired Login ID (e.g. staff_smith)"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          required
        />
        <input 
          className={styles.input}
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select 
          className={styles.input}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input 
          className={styles.input}
          type="text" 
          placeholder="Position (e.g. Assistant Professor)"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          required
        />
        
        <button className={styles.button} type="submit">Register Account</button>
        
        <p className={styles.switchText}>
          Already have an account? <Link to="/login" className={styles.link}>Login here</Link>
        </p>
      </form>
    </div>
  );
}
