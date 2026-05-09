import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyC7ySYf68cB67qFKaIqA3eR0Y14VB6f3rk',
  authDomain:        'studentrandomizer-86bd0.firebaseapp.com',
  projectId:         'studentrandomizer-86bd0',
  storageBucket:     'studentrandomizer-86bd0.firebasestorage.app',
  messagingSenderId: '1004657653216',
  appId:             '1:1004657653216:web:dacdd17a49a4fdb15f2785',
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
