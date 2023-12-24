// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: 'AIzaSyB6j8kYAR977Iy0HHvf3k6yzu1f0_2Cl7I',
	authDomain: 'freedive-superhome.firebaseapp.com',
	projectId: 'freedive-superhome',
	storageBucket: 'freedive-superhome.appspot.com',
	messagingSenderId: '1021894750641',
	appId: '1:1021894750641:web:92c2f45e95e328a619cd90',
	measurementId: 'G-ZSSJMX2ZK7'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, app };
