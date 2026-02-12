import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBTeOPspaQd5oocS-v00qJYZ4Tr3e9qsJE",
    authDomain: "bonded-app-genz.firebaseapp.com",
    projectId: "bonded-app-genz",
    storageBucket: "bonded-app-genz.firebasestorage.app",
    messagingSenderId: "91589281724",
    appId: "1:91589281724:web:aa00c785d2818409b44db9"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { app, auth };
