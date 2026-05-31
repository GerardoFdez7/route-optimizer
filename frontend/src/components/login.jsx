import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import styles from './Login.module.css';

/* ── Firebase → human-readable error messages ─────────── */
function friendlyError(code) {
  const map = {
    'auth/invalid-email':        'El correo electrónico no es válido.',
    'auth/user-not-found':       'No existe una cuenta con ese correo.',
    'auth/wrong-password':       'Contraseña incorrecta.',
    'auth/invalid-credential':   'Credenciales inválidas. Revisa tu correo y contraseña.',
    'auth/email-already-in-use': 'Ese correo ya está registrado.',
    'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests':    'Demasiados intentos. Espera un momento.',
    'auth/popup-closed-by-user': 'Cerraste la ventana antes de completar el login.',
    'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
  };
  return map[code] ?? 'Error de autenticación. Intenta de nuevo.';
}

export default function Login() {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Ambient glow */}
      <div className={styles.glow1} />
      <div className={styles.glow2} />

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <span className={styles.brandIcon}>⬡</span>
          <div>
            <h1 className={styles.brandTitle}>Route Optimizer</h1>
            <p className={styles.brandSub}>Rutas óptimas con algoritmo genético</p>
          </div>
        </div>

        <p className={styles.formTitle}>
          {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </p>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="login-email">Correo</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="login-pw">Contraseña</label>
            <input
              id="login-pw"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading
              ? <LoadingDots />
              : isRegister ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </form>

        {/* Divider */}
        <div className={styles.divider}><span>o continúa con</span></div>

        {/* Google */}
        <button
          className={styles.btnGoogle}
          onClick={handleGoogle}
          disabled={loading}
          type="button"
        >
          <GoogleSvg />
          Google
        </button>

        {/* Toggle register / login */}
        <p className={styles.switchRow}>
          {isRegister ? '¿Ya tienes cuenta? ' : '¿Sin cuenta? '}
          <button
            type="button"
            className={styles.switchBtn}
            onClick={() => { setIsRegister(v => !v); setError(''); }}
          >
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */
function LoadingDots() {
  return (
    <span style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'center' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:6, height:6, borderRadius:'50%', background:'currentColor',
          display:'block', animation:`blink 1.4s ${i*0.2}s ease-in-out infinite`
        }} />
      ))}
    </span>
  );
}

function GoogleSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6A7.8 7.8 0 0 0 17 9c0-.57-.05-1.1-.15-1.5z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );
}