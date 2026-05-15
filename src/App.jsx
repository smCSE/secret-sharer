import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { generateKey, encryptMessage, decryptMessage } from './cryptoUtils';

function App() {
  const [secret, setSecret] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [decryptedSecret, setDecryptedSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // - 1. THE PAGE LOAD CHECK AND BURN (Combined for React safety) -
  useEffect(() => {
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

  // - 3. HANDLE COPY BUTTON -
  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  // - 4. WHAT THE USER SEES (UI) -
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', lineHeight: '1.4', marginBottom: '20px' }}>
        🔒 Zero-Knowledge Secret Sharer
      </h1>
      
      {/* View Mode: If the user opened a secret link */}
      {decryptedSecret ? (
        <div style={{ backgroundColor: '#ffebee', padding: '20px', borderRadius: '8px', border: '1px solid #ef9a9a' }}>
          <h2 style={{ color: '#c62828', marginTop: 0 }}>Your Secret Message:</h2>
          <p style={{ fontWeight: 'bold' }}>⚠️ Warning: This message has just been permanently deleted from the database. If you refresh this page, it will be gone forever.</p>
          <textarea 
            readOnly 
            value={decryptedSecret} 
            rows="6" 
            style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }} 
          />
          <button 
            onClick={() => window.location.href = '/'} 
            style={{ marginTop: '15px', padding: '10px 15px', cursor: 'pointer' }}
          >
            Create Your Own Secret
          </button>
        </div>
      ) : (
        /* Create Mode: If the user is on the homepage making a secret */
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

          {/* Show the link after they click the button */}
          {shareLink && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#2e7d32' }}>✅ Success! Share this link securely:</p>
              
              {/* --- NEW FLEXBOX CONTAINER WITH COPY BUTTON --- */}
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
              {/* --------------------------------------------- */}

              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: '0' }}>The key is in the URL. If you lose this link, the data cannot be recovered.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;