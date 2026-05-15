import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { generateKey, encryptMessage, decryptMessage } from './cryptoUtils';

function App() {
  const [secret, setSecret] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [decryptedSecret, setDecryptedSecret] = useState(null);
  const [loading, setLoading] = useState(false);

  // - 1. THE PAGE LOAD CHECK AND BURN (Combined for React safety) -
  useEffect(() => {
    // We moved the function INSIDE the useEffect to make React happy!
    const fetchAndBurnSecret = async (id, key) => {
      // Fetch the encrypted message from the database
      const { data } = await supabase
          .from('secrets')
          .select('*')
          .eq('id', id)
          .single();
      
      if (data) {
        // Decrypt it immediately in the browser
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

  // - 2. CREATE A SECRET -
  const handleCreateSecret = async () => {
    if (!secret) return alert("Please type a secret first!");
    setLoading(true);

    const key = generateKey();
    const encryptedText = encryptMessage(secret, key);

    // Save gibberish to Supabase database
    const { data, error } = await supabase
      .from('secrets')
      .insert([{ encrypted_message: encryptedText }])
      .select();

    if (data && data.length > 0) {
      const secretId = data[0].id;
      // Create the unique URL (ID is in the path, Key is in the hash)
      const link = `${window.location.origin}/${secretId}#${key}`;
      setShareLink(link);
      setSecret(''); // clear the text box
    } else if (error) {
      console.error("Database error:", error);
      alert("Failed to save to database. Check your Supabase settings.");
    }
    setLoading(false);
  };

  // - 3. WHAT THE USER SEES (UI) -
return (
    <div className="app-container">
      <h1 className="main-title">
        <span className="lock-icon">🔒</span> Zero-Knowledge Secret Sharer
      </h1>
      
      {decryptedSecret ? (
        <div className="card view-card">
          <h2 className="warning-title">Your Secret Message:</h2>
          <p className="warning-text">
            ⚠️ Warning: This message has just been permanently deleted from the database. If you refresh this page, it will be gone forever.
          </p>
          <textarea 
            readOnly 
            value={decryptedSecret} 
            rows="6" 
            className="secret-textarea"
          />
          <button onClick={() => window.location.href = '/'} className="btn primary-btn mt-15">
            Create Your Own Secret
          </button>
        </div>
      ) : (
        <div className="card create-card">
          <p className="subtitle">
            Type your highly sensitive data below. It will be encrypted in your browser before it ever touches our servers.
          </p>
          <textarea 
            value={secret} 
            onChange={(e) => setSecret(e.target.value)} 
            rows="5" 
            placeholder="Enter passwords, API keys, or private notes here..."
            className="secret-textarea"
          />
          <button onClick={handleCreateSecret} disabled={loading} className="btn primary-btn">
            {loading ? 'Encrypting & Saving...' : 'Encrypt & Generate One-Time Link'}
          </button>

          {shareLink && (
            <div className="success-box">
              <p className="success-title">✅ Success! Share this link securely:</p>
              <input 
                type="text" 
                readOnly 
                value={shareLink} 
                className="link-input"
                onClick={(e) => e.target.select()}
              />
              <p className="success-hint">The key is in the URL. If you lose this link, the data cannot be recovered.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;