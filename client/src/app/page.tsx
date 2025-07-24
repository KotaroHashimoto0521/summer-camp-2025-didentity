"use client";
import { useState, useEffect, FormEvent } from "react";
import { getCredentials, addCredential, verifyCredential, FetchedCredentialType, NewCredentialPayload } from '../lib/api';

interface Credential {
  credential_name: string;
  claim: string;
  holder: string;
  issuer: string;
  start_Time: string;
  end_Time: string;
  vc: string;
}

function convertFetchedCredentialToCredential(fetchedCredential: FetchedCredentialType): Credential {
  return {
    credential_name: fetchedCredential.Credential_Name,
    claim: fetchedCredential.Claim,
    holder: fetchedCredential.Holder,
    issuer: fetchedCredential.Issuer,
    start_Time: fetchedCredential.Start_Time,
    end_Time: fetchedCredential.End_Time,
    vc: fetchedCredential.VC || ""
  };
}

export default function Home() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [formData, setFormData] = useState({
    credential_name: '',
    claim: '',
    holder: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verificationName, setVerificationName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ message: string; color: string } | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCredentials();
        if (Array.isArray(data)) {
          const fetched_credentials = data.map(convertFetchedCredentialToCredential);
          setCredentials(fetched_credentials);
        } else {
          setCredentials([]);
        }
      } catch (err) {
        console.error("Fetching credentials failed:", err);
        setError("データの取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCredentials();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddCredential = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.credential_name.trim() === '' || formData.claim.trim() === '' || formData.holder.trim() === '') {
      alert("Name, Claim, Holderのすべてを入力してください。");
      return;
    }

    try {
      const newCredentialPayload: NewCredentialPayload = {
        credential_name: formData.credential_name,
        claim: formData.claim,
        holder: formData.holder,
      };
      
      const fetchedCredential = await addCredential(newCredentialPayload);
      const addedCredential = convertFetchedCredentialToCredential(fetchedCredential);

      setCredentials(prevCredentials => [...prevCredentials, addedCredential]);
      setFormData({ credential_name: '', claim: '', holder: '' });

    } catch (err: any) {
      console.error("Adding credential failed:", err);
      if (err && err.message) {
          alert(err.message);
      } else {
          alert("Credentialの追加に失敗しました。");
      }
    }
  };

  const handleVerify = async () => {
    if (verificationName.trim() === '') {
      alert('検証したいVCのNameを入力してください。');
      return;
    }

    const targetCredential = credentials.find(c => c.credential_name === verificationName);
    if (!targetCredential || !targetCredential.vc) {
      alert('指定されたNameのCredentialが見つからないか、VCが存在しません。');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifyCredential(targetCredential.vc);
      setVerificationResult({ message: result.message, color: 'green' });
    } catch (error: any) {
      setVerificationResult({ message: error.message || '検証中にエラーが発生しました。', color: 'red' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div>
        <h1>Issuer Page</h1>
        <h2>Already Existing Credential List</h2>
        {isLoading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {credentials.map((credential) => (
            <li key={credential.credential_name} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div><strong>Name:</strong> {credential.credential_name}</div>
              <div><strong>Claim:</strong> {credential.claim}</div>
              <div><strong>Holder:</strong> {credential.holder}</div>
              {credential.vc && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>VC:</strong>
                  <textarea
                    readOnly
                    value={credential.vc}
                    style={{ width: '100%', minHeight: '80px', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <hr />
        <h2>Add Credential Form</h2>
        <form onSubmit={handleAddCredential}>
          <div style={{ margin: '1rem 0' }}>
            <div>
              <h3>Credential Name</h3>
              <input
                id="credential_name"
                type="text"
                placeholder="Enter Credential Name"
                value={formData.credential_name}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h3>Claim</h3>
              <input
                id="claim"
                type="text"
                placeholder="Enter Claim"
                value={formData.claim}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h3>Holder</h3>
              <input
                id="holder"
                type="text"
                placeholder="Enter Holder"
                value={formData.holder}
                onChange={handleInputChange}
              />
            </div>
            <hr style={{ margin: '1.5rem 0' }} />
            <button type="submit">IssuerがVCを発行！</button>
          </div>
        </form>
        <hr />
        <h1>Verifier Page</h1>
        <div style={{ marginTop: '1rem' }}>
          <h3>検証したいVCのNameを入力</h3>
          <input
            type="text"
            placeholder="Enter Credential Name to Verify"
            value={verificationName}
            onChange={(e) => setVerificationName(e.target.value)}
            style={{ marginRight: '0.5rem' }}
          />
          <button onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? '検証中...' : '選択したVCを検証！'}
          </button>
          {verificationResult && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', border: `1px solid ${verificationResult.color}`, color: verificationResult.color, borderRadius: '4px' }}>
              <strong>検証結果:</strong> {verificationResult.message}
            </div>
          )}
        </div>
        <hr />
        <h1>Holder Page</h1>
      </div>
    </main>
  );
}
