import firebase from 'firebase'
require('@firebase/firestore')

const firebaseConfig = {
    apiKey: "AIzaSyDwJmiMPxdi0cG2eKqvc-Ri6fdnQmLNMn8",
    authDomain: "c-71-c97c7.firebaseapp.com",
    projectId: "c-71-c97c7",
    storageBucket: "c-71-c97c7.appspot.com",
    messagingSenderId: "463093881547",
    appId: "1:463093881547:web:09b2b7cf3ecea04591d94e"
  };

  firebase.initializeApp(firebaseConfig);
  export default firebase.firestore()