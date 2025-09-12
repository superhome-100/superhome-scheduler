// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
	GoogleAuthProvider,
	signInWithRedirect,
	signInWithPopup,
	FacebookAuthProvider
} from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
let authDomain: string;
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalhost = host === 'localhost' || host.startsWith('localhost:');
switch (host) {
	case 'app-dev.freedivesuperhome.com':
		authDomain = 'app-dev.freedivesuperhome.com';
		break;
	case 'app.freedivesuperhome.com':
		authDomain = 'app.freedivesuperhome.com';
		break;
	case 'localhost':
	case 'localhost:5173': // adjust the port if necessary
	default:
		authDomain = 'freedive-superhome.firebaseapp.com';
		break;
}

const firebaseConfig = {
	apiKey: 'AIzaSyB6j8kYAR977Iy0HHvf3k6yzu1f0_2Cl7I',
	authDomain,
	projectId: 'freedive-superhome',
	storageBucket: 'freedive-superhome.appspot.com',
	messagingSenderId: '1021894750641',
	appId: '1:1021894750641:web:92c2f45e95e328a619cd90',
	measurementId: 'G-ZSSJMX2ZK7'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const loginWithGoogle = async () => {
	const googleProvider = new GoogleAuthProvider();
	const isChromeDesktop =
		/Chrome/.test(navigator.userAgent) &&
		/Google Inc/.test(navigator.vendor) &&
		!/Android/.test(navigator.userAgent);
	if (isLocalhost) {
		// In local development, prefer popup to avoid redirect issues
		await signInWithPopup(auth, googleProvider);
	} else if (isChromeDesktop) {
		await signInWithRedirect(auth, googleProvider);
	} else {
		await signInWithPopup(auth, googleProvider);
	}
};

const loginWithFacebook = async () => {
	const facebookProvider = new FacebookAuthProvider();
	facebookProvider.addScope('email');
	const isChromeDesktop =
		/Chrome/.test(navigator.userAgent) &&
		/Google Inc/.test(navigator.vendor) &&
		!/Android/.test(navigator.userAgent);
	if (isLocalhost) {
		// In local development, prefer popup to avoid redirect issues
		await signInWithPopup(auth, facebookProvider);
	} else if (isChromeDesktop) {
		await signInWithRedirect(auth, facebookProvider);
	} else {
		await signInWithPopup(auth, facebookProvider);
	}
};

const isGoogleLinked = () => {
	return window?.localStorage.getItem('is_google_linked') === 'true';
};

export { auth, firestore, app, loginWithGoogle, loginWithFacebook, isGoogleLinked };
