import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { generateKey, encryptMessage, decryptMessage } from './cryptoUtils';

function App() {
  const [secret, setSecret] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [decryptedSecret, setDecryptedSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // --- TIMER STATE ---
  const [timeLeft, setTimeLeft] = useState(15);
  const [isExpired, setIsExpired] = useState(false);

  // - 1. THE PAGE LOAD CHECK AND BURN -
  useEffect(() => {
    const fetchAndBurnSecret = async (id, key) => {
      const { data } = await supabase
          .from('secrets')
          .select('*')
          .eq('id', id)
          .single();
      
      if (data) {
        const plainText = decryptMessage(data.encrypted_message, key);
        setDecryptedSecret(plainText);
        // BURN IT (Delete it permanently from the database)
        await supabase.from('secrets').delete().eq('id', id);
      } else {
        setDecryptedSecret("Secret not found. It may have already been burned or the link is invalid.");
      }
    };

    const path = window.location.pathname.replace('/', '');
    const hashKey = window.location.hash.replace('#', '');

    if (path && hashKey) {
      fetchAndBurnSecret(path, hashKey);
    }
  }, []);

  // - 2. THE COUNTDOWN TIMER LOGIC (WITH ASYNC FIX) -
  useEffect(() => {
    // 1. If there is no secret loaded, do nothing.
    if (!decryptedSecret) return;

    // 2. If time is up, trigger the BOOM asynchronously to prevent cascading renders.
    if (timeLeft <= 0 && !isExpired) {
      const timeoutId = setTimeout(() => {
        setIsExpired(true);
        setDecryptedSecret(null); // Wipe the memory
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // 3. If we still have time, keep ticking.
    if (timeLeft > 0 && !isExpired) {
      const timerId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
      return () => clearInterval(timerId); // Cleanup to prevent memory leaks
    }
  }, [decryptedSecret, timeLeft, isExpired]);

  // - 3. CREATE A SECRET -
  const handleCreateSecret = async () => {
    if (!secret) return alert("Please type a secret first!");
    setLoading(true);

    const key = generateKey();
    const encryptedText = encryptMessage(secret, key);

    const { data, error } = await supabase
      .from('secrets')
      .insert([{ encrypted_message: encryptedText }])
      .select();

    if (data && data.length > 0) {
      const secretId = data[0].id;
      const link = `${window.location.origin}/${secretId}#${key}`;
      setShareLink(link);
      setSecret(''); 
    } else if (error) {
      console.error("Database error:", error);
      alert("Failed to save to database. Check your Supabase settings.");
    }
    setLoading(false);
  };

  // - 4. HANDLE COPY BUTTON -
  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  // - 5. WHAT THE USER SEES (UI) -
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', lineHeight: '1.4', marginBottom: '20px' }}>
        🔒 Zero-Knowledge Secret Sharer
      </h1>
      
      {/* View Mode 1: The time expired (BOOM) */}
      {isExpired ? (
        <div style={{ backgroundColor: '#212121', padding: '30px 20px', borderRadius: '8px', border: '2px solid #000', textAlign: 'center' }}>
           <h2 style={{ color: '#ff5252', marginTop: 0, fontSize: '32px' }}>💥 BOOM.</h2>
           <p style={{ color: '#fff', fontSize: '16px', lineHeight: '1.5' }}>The 15 seconds are up.<br/>This message has been permanently wiped from the database and your screen.</p>
           <button 
            onClick={() => window.location.href = '/'} 
            style={{ marginTop: '20px', padding: '12px 20px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
          >
            Create Your Own Secret
          </button>
        </div>

      /* View Mode 2: Viewing the active secret */
      ) : decryptedSecret ? (
        <div style={{ backgroundColor: '#ffebee', padding: '20px', borderRadius: '8px', border: '1px solid #ef9a9a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ color: '#c62828', marginTop: 0, marginBottom: '10px' }}>Your Secret Message:</h2>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: timeLeft <= 5 ? '#d32f2f' : '#333', marginBottom: '10px' }}>
              ⏱️ 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          </div>
          <p style={{ fontWeight: 'bold', color: '#b71c1c' }}>⚠️ Read fast. This message will self-destruct from this screen when the timer hits zero.</p>
          <textarea 
            readOnly 
            value={decryptedSecret} 
            rows="6" 
            style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }} 
          />
        </div>

      /* Create Mode: The Homepage */
      ) : (
        <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <p>Type your highly sensitive data below. It will be encrypted in your browser before it ever touches our servers.</p>
          <textarea 
            value={secret} 
            onChange={(e) => setSecret(e.target.value)} 
            rows="5" 
            placeholder="Enter passwords, API keys, or private notes here..."
            style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box', marginBottom: '15px' }}
          />
          <button 
            onClick={handleCreateSecret} 
            disabled={loading}
            style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' }}
          >
            {loading ? 'Encrypting & Saving...' : 'Encrypt & Generate One-Time Link'}
          </button>

          {shareLink && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#2e7d32' }}>✅ Success! Share this link securely:</p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={shareLink} 
                  style={{ flex: 1, padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} 
                  onClick={(e) => e.target.select()}
                />
                <button 
                  onClick={handleCopy}
                  style={{ 
                    padding: '8px 12px', 
                    cursor: 'pointer', 
                    backgroundColor: copied ? '#4caf50' : '#f5f5f5', 
                    color: copied ? 'white' : 'black', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  title="Copy to clipboard"
                >
                  {copied ? '✅ Copied' : '📋 Copy'}
                </button>
              </div>

              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: '0' }}>The key is in the URL. If you lose this link, the data cannot be recovered.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;