import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let authDomain;
const host = typeof window !== "undefined" ? window.location.hostname : "";
switch (host) {
  case "app-dev.freedivesuperhome.com":
    authDomain = "app-dev.freedivesuperhome.com";
    break;
  case "app.freedivesuperhome.com":
    authDomain = "app.freedivesuperhome.com";
    break;
  case "localhost":
  case "localhost:5173":
  default:
    authDomain = "freedive-superhome.firebaseapp.com";
    break;
}
const firebaseConfig = {
  apiKey: "AIzaSyB6j8kYAR977Iy0HHvf3k6yzu1f0_2Cl7I",
  authDomain,
  projectId: "freedive-superhome",
  storageBucket: "freedive-superhome.appspot.com",
  messagingSenderId: "1021894750641",
  appId: "1:1021894750641:web:92c2f45e95e328a619cd90",
  measurementId: "G-ZSSJMX2ZK7"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const isGoogleLinked = () => {
  return window?.localStorage.getItem("is_google_linked") === "true";
};

export { auth as a, firestore as f, isGoogleLinked as i };
//# sourceMappingURL=firebase-abda0d73.js.map
