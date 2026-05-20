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
  const [timeLeft, setTimeLeft] = useState(10);
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
        await supabase.from('secrets').delete().eq('id', id);
      } else {
        setDecryptedSecret("ERR_NOT_FOUND");
      }
    };

    const path = window.location.pathname.replace('/', '');
    const hashKey = window.location.hash.replace('#', '');

    if (path && hashKey) {
      fetchAndBurnSecret(path, hashKey);
    }
  }, []);

  // - 2. THE COUNTDOWN TIMER LOGIC -
  useEffect(() => {
    if (!decryptedSecret || decryptedSecret === "ERR_NOT_FOUND") return;

    if (timeLeft <= 0 && !isExpired) {
      const timeoutId = setTimeout(() => {
        setIsExpired(true);
        setDecryptedSecret(null); 
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    if (timeLeft > 0 && !isExpired) {
      const timerId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
      return () => clearInterval(timerId); 
    }
  }, [decryptedSecret, timeLeft, isExpired]);

  // - 3. CREATE A SECRET -
  const handleCreateSecret = async () => {
    if (!secret) return alert("Empty payload detected.");
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
      alert("Encryption failed. Database unreachable.");
    }
    setLoading(false);
  };

  // - 4. HANDLE COPY BUTTON -
  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  return (
    <div className="app-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap');

        body {
          margin: 0;
          background-color: #050505;
        }

        .app-wrapper {
          min-height: 100vh;
          background-color: #050505;
          background-image: radial-gradient(circle at 50% 0%, #111 0%, #050505 70%);
          color: #e0e0e0;
          font-family: 'Fira Code', monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }

        .terminal-card {
          width: 100%;
          max-width: 650px;
          background-color: #0a0a0a;
          border: 1px solid #1f1f1f;
          border-radius: 8px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03);
          overflow: hidden;
        }

        .terminal-header {
          background-color: #111;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #1f1f1f;
        }

        .mac-dots {
          display: flex;
          gap: 6px;
          margin-right: 15px;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .term-title {
          color: #555;
          font-size: 13px;
          flex-grow: 1;
          text-align: center;
          margin-right: 50px; 
          letter-spacing: 1px;
        }

        .terminal-body {
          padding: 30px;
        }

        .prompt {
          margin-bottom: 20px;
          font-size: 14px;
        }

        .user { color: #00ffcc; }
        .user-danger { color: #ff3366; }
        .path { color: #3b82f6; }
        .cmd { color: #e0e0e0; }

        .cyber-textarea {
          width: 100%;
          background-color: #000;
          color: #00ffcc;
          border: 1px solid #1f1f1f;
          border-radius: 4px;
          padding: 16px;
          font-family: 'Fira Code', monospace;
          font-size: 15px;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s;
        }

        .cyber-textarea::placeholder {
          color: #333;
        }

        .cyber-textarea:focus {
          border-color: #00ffcc;
          box-shadow: 0 0 15px rgba(0, 255, 204, 0.15);
        }

        .cyber-textarea.danger-text {
          color: #ff3366;
          border-color: #2D121A;
        }

        .cyber-btn {
          width: 100%;
          background-color: #00ffcc;
          color: #000;
          border: none;
          padding: 14px;
          font-family: 'Fira Code', monospace;
          font-weight: 600;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 20px;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cyber-btn:hover:not(:disabled) {
          background-color: #00e6b8;
          box-shadow: 0 0 20px rgba(0, 255, 204, 0.3);
        }

        .cyber-btn:disabled {
          background-color: #1a1a1a;
          color: #444;
          cursor: not-allowed;
          box-shadow: none;
        }

        .cyber-btn.btn-secondary {
          background-color: #1f1f1f;
          color: #e0e0e0;
          margin-top: 30px;
        }

        .cyber-btn.btn-secondary:hover {
          background-color: #333;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
        }

        .success-box {
          margin-top: 25px;
          background-color: #03140f;
          border: 1px solid rgba(0, 255, 204, 0.2);
          padding: 20px;
          border-radius: 4px;
        }

        .success-text {
          margin: 0;
          color: #00ffcc;
          font-size: 14px;
        }

        .link-row {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .link-input {
          flex: 1;
          background-color: #000;
          color: #888;
          border: 1px solid #1f1f1f;
          padding: 10px 12px;
          border-radius: 4px;
          font-family: 'Fira Code', monospace;
          outline: none;
        }

        .copy-btn {
          background-color: #1f1f1f;
          color: #e0e0e0;
          border: 1px solid #333;
          padding: 0 20px;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'Fira Code', monospace;
          transition: all 0.2s;
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 600;
        }

        .copy-btn:hover {
          background-color: #333;
        }

        .copy-btn.copied {
          background-color: #00ffcc;
          color: #000;
          border-color: #00ffcc;
          box-shadow: 0 0 10px rgba(0, 255, 204, 0.3);
        }

        .boom-box {
          text-align: center;
          padding: 20px 0;
        }

        .fatal-text {
          color: #ff3366;
          font-size: 32px;
          font-weight: 600;
          margin: 20px 0 10px 0;
          text-shadow: 0 0 20px rgba(255, 51, 102, 0.3);
        }
      `}</style>

      <div className="terminal-card">
        {/* Fake Terminal Header */}
        <div className="terminal-header">
          <div className="mac-dots">
            <div className="dot" style={{ backgroundColor: '#ff5f56' }}></div>
            <div className="dot" style={{ backgroundColor: '#ffbd2e' }}></div>
            <div className="dot" style={{ backgroundColor: '#27c93f' }}></div>
          </div>
          <div className="term-title">zero-knowledge-vault</div>
        </div>

        <div className="terminal-body">
          {/* View Mode 1: The time expired (BOOM) */}
          {isExpired ? (
            <div className="boom-box">
              <div className="prompt" style={{ textAlign: 'left' }}>
                <span className="user-danger">root@vulnerable</span>:<span className="path">/tmp</span><span className="cmd">$ rm -rf secret.payload</span>
              </div>
              <h2 className="fatal-text">[ FATAL: DATA PURGED ]</h2>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                Memory sectors wiped.<br />
                The payload no longer exists on the server or this device.
              </p>
              <button onClick={() => window.location.href = '/'} className="cyber-btn btn-secondary">
                Initialize New Payload
              </button>
            </div>

          /* View Mode 2: Viewing the active secret (Invisible Timer) */
          ) : decryptedSecret ? (
            <div>
              <div className="prompt">
                <span className="user">guest@vulnerable</span>:<span className="path">/tmp</span><span className="cmd">$ cat secret.payload</span>
              </div>

              {decryptedSecret === "ERR_NOT_FOUND" ? (
                <textarea 
                  readOnly 
                  value="[ ERROR 404 ]: Payload not found. It has either been read and destroyed, or the link is invalid." 
                  rows="6" 
                  className="cyber-textarea danger-text"
                />
              ) : (
                <>
                  <textarea 
                    readOnly 
                    value={decryptedSecret} 
                    rows="6" 
                    className="cyber-textarea"
                  />
                  <p style={{ color: '#ff3366', fontSize: '13px', marginTop: '15px', fontWeight: '600' }}>
                    > WARNING: SECURE TUNNEL CLOSING IN 10 SECONDS...
                  </p>
                </>
              )}
            </div>

          /* Create Mode: The Homepage */
          ) : (
            <div>
              <div className="prompt">
                <span className="user">noob0x@vulnerable</span>:<span className="path">~/vault</span><span className="cmd">$ ./encrypt.sh --interactive</span>
              </div>

              <textarea 
                value={secret} 
                onChange={(e) => setSecret(e.target.value)} 
                rows="5" 
                placeholder="Awaiting sensitive payload input..."
                className="cyber-textarea"
              />
              
              <button onClick={handleCreateSecret} disabled={loading} className="cyber-btn">
                {loading ? 'Encrypting...' : 'Generate Secure Link'}
              </button>

              {shareLink && (
                <div className="success-box">
                  <p className="success-text">> STATUS: 200 OK. Link generated.</p>
                  
                  <div className="link-row">
                    <input 
                      type="text" 
                      readOnly 
                      value={shareLink} 
                      className="link-input"
                      onClick={(e) => e.target.select()}
                    />
                    <button onClick={handleCopy} className={`copy-btn ${copied ? 'copied' : ''}`}>
                      {copied ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;