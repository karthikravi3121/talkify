import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import './App.css';
import SendIcon from './send.png';
import GoogleIcon from './Google.png';

const firebaseConfig = {
  apiKey: "AIzaSyCeIYkySpVKZXTONGRzqkUFznczy7cC4Mw",
  authDomain: "chat-box-84b5b.firebaseapp.com",
  projectId: "chat-box-84b5b",
  storageBucket: "chat-box-84b5b.appspot.com",
  messagingSenderId: "855201376211",
  appId: "1:855201376211:web:5d33846e0f42ef12fff126"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();

const ChatApp = () => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
      if (user) {
        checkUserDisplayName(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = firestore.collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }));
        setMessages(data);
        scrollToBottom();
      });
    return () => unsubscribe();
  }, [user]); 

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const { user } = result;
      if (user) {
        const uid = user.uid;
        const userDoc = await firestore.collection('users').doc(uid).get();
        if (userDoc.exists) {
          setDisplayName(userDoc.data().displayName);
        } else {
          const storedDisplayName = localStorage.getItem('displayName');
          if (storedDisplayName) {
            setDisplayName(storedDisplayName);
          } else {
            const name = prompt('Please enter your name:');
            if (name) {
              localStorage.setItem('displayName', name);
              setDisplayName(name);
              try {
                await firestore.collection('users').doc(uid).set({
                  displayName: name,
                });
              } catch (error) {
                console.error(error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
  

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      await firestore.collection('messages').add({
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        uid: user.uid,
        displayName: displayName || 'Anonymous',
      });
      setText('');
    } catch (error) {
      console.error(error);
    }
  };  

  const deleteMessage = async (messageId, index) => {
    try {
      await firestore.collection('messages').doc(messageId).delete();
      setMessages(prevMessages => prevMessages.filter((message, i) => i !== index));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };
  
  const checkUserDisplayName = async (uid) => {
    const userDoc = await firestore.collection('users').doc(uid).get();
    if (userDoc.exists) {
      setDisplayName(userDoc.data().displayName);
    } else {
      const name = prompt('Please enter your name:');
      if (name) {
        localStorage.setItem('displayName', name);
        setDisplayName(name);
        try {
          await firestore.collection('users').doc(uid).set({
            displayName: name,
          });
        } catch (error) {
          console.error(error);
        }
      }
    }
  };
  
  
  

  return (
    <div className="container">
      {user ? (
        <div className="chat-container" ref={chatContainerRef}>
          <button onClick={signOut} className="sign-out-button">Sign Out</button>
          <ul className="messages">
          {messages.map((message) => (
  <li key={message.id} className={message.uid === user.uid ? 'sent' : 'received'}>
    <span className="message-sender">{message.displayName}: </span>
    <span className="message-text">{message.text}</span>
    {message.uid === user.uid && (
      <span
        className="delete-icon"
        onClick={() => deleteMessage(message.id)}
        title="Delete message"
      >
        🗑️
      </span>
    )}
  </li>
))}

          </ul>
          <div className="input-container">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="message-input"
            />
            <img src={SendIcon} alt="Send" className="send-icon" onClick={sendMessage} />
          </div>
        </div>
      ) : (
        <button onClick={signInWithGoogle} className="google-signin-button">
  <img src={GoogleIcon} alt="Google Icon" /> Let's Chat
</button>
      
      )}
    </div>
  );
};

export default ChatApp;
