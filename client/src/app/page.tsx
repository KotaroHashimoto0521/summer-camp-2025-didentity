"use client";
import { useState, useEffect, FormEvent } from "react";
// verifyVp をインポート
import { getCredentials, addCredential, verifyCredential, generateVp, verifyVp, FetchedCredentialType, NewCredentialPayload } from '../lib/api';

interface Credential {
  credential_name: string;
  claim: string;
  holder: string;
  issuer: string;
  start_Time: string;
  end_Time: string;
  vc: string;
}

// ★★★ VPの型定義を追加 ★★★
interface VP {
  name: string;
  vp: string;
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
  // --- State定義 ---
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [formData, setFormData] = useState({ credential_name: '', claim: '', holder: '' });
  const [verificationName, setVerificationName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ message: string; color: string } | null>(null);
  const [selectedHolder, setSelectedHolder] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vcsForVp, setVcsForVp] = useState<string[]>([]);
  
  // ★★★ VPのStateをオブジェクト配列に変更 ★★★
  const [generatedVps, setGeneratedVps] = useState<VP[]>([]);
  const [isGeneratingVp, setIsGeneratingVp] = useState(false);
  
  // ★★★ VP発行・検証用のStateを追加 ★★★
  const [vpNameToCreate, setVpNameToCreate] = useState('');
  const [vpNameToVerify, setVpNameToVerify] = useState('');
  const [isVerifyingVp, setIsVerifyingVp] = useState(false);
  const [vpVerificationResult, setVpVerificationResult] = useState<{ message: string; color: string } | null>(null);


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

  const handleSelectVcForVp = (credentialName: string) => {
    setVcsForVp(prevSelected => {
      if (prevSelected.includes(credentialName)) {
        return prevSelected.filter(name => name !== credentialName);
      } else {
        return [...prevSelected, credentialName];
      }
    });
  };

  const handleGenerateVp = async () => {
    if (vcsForVp.length === 0) {
      alert('VPに含めるVCを1つ以上選択してください。');
      return;
    }
    if (vpNameToCreate.trim() === '') {
      alert('作成するVPのNameを入力してください。');
      return;
    }
    setIsGeneratingVp(true);
    try {
      const selectedVcStrings = credentials
        .filter(c => vcsForVp.includes(c.credential_name))
        .map(c => c.vc);
      const result = await generateVp(selectedVcStrings);
      
      // ★★★ 名前付きでVPを保存 ★★★
      setGeneratedVps(prevVps => [...prevVps, { name: vpNameToCreate, vp: result.vp }]);
      
      setVpNameToCreate(''); // 入力欄をクリア
      setVcsForVp([]); // 選択をクリア
    } catch (error: any) {
      alert(`VPの発行に失敗しました: ${error.message}`);
    } finally {
      setIsGeneratingVp(false);
    }
  };

  // ★★★ VPを検証するハンドラを追加 ★★★
  const handleVerifyVp = async () => {
    if (vpNameToVerify.trim() === '') {
      alert('検証したいVPのNameを入力してください。');
      return;
    }
    const targetVp = generatedVps.find(v => v.name === vpNameToVerify);
    if (!targetVp) {
      alert('指定されたNameのVPが見つかりません。');
      return;
    }

    setIsVerifyingVp(true);
    setVpVerificationResult(null);
    try {
      const result = await verifyVp(targetVp.vp);
      setVpVerificationResult({ message: result.message, color: 'green' });
    } catch (error: any) {
      setVpVerificationResult({ message: error.message || 'VPの検証中にエラーが発生しました。', color: 'red' });
    } finally {
      setIsVerifyingVp(false);
    }
  };

  const filteredCredentials = selectedHolder.trim() === ''
    ? []
    : credentials.filter(cred =>
        cred.holder.toLowerCase() === selectedHolder.trim().toLowerCase()
      );

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div>
        <h1>Issuer Page</h1>
        <h2>Add Credential Form</h2>
        <form onSubmit={handleAddCredential}>
          <div style={{ margin: '1rem 0' }}>
            <div>
              <h3>Credential Name</h3>
              <input id="credential_name" type="text" placeholder="Enter Credential Name" value={formData.credential_name} onChange={handleInputChange} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h3>Claim</h3>
              <input id="claim" type="text" placeholder="Enter Claim" value={formData.claim} onChange={handleInputChange} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h3>Holder</h3>
              <input id="holder" type="text" placeholder="Enter Holder" value={formData.holder} onChange={handleInputChange} />
            </div>
            <button type="submit" style={{marginTop: '1rem'}}>IssuerがVCを発行！</button>
          </div>
        </form>
        <hr style={{ margin: '1.5rem 0' }} />

        <h1>Holder Page</h1>
        <h2>Already Existing VC List</h2>
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
                  <textarea readOnly value={credential.vc} style={{ width: '100%', minHeight: '80px', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '12px' }} />
                </div>
              )}
            </li>
          ))}
        </ul>
        <hr />

        <h1>Verifier Page</h1>
        <div style={{ marginTop: '1rem' }}>
          <h3>検証したいVCのNameを入力</h3>
          <input type="text" placeholder="Enter Credential Name to Verify" value={verificationName} onChange={(e) => setVerificationName(e.target.value)} style={{ marginRight: '0.5rem' }} />
          <button onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? '検証中...' : '選択したVCを検証！'}
          </button>
          {verificationResult && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', border: `1px solid ${verificationResult.color}`, color: verificationResult.color, borderRadius: '4px' }}>
              <strong>検証結果:</strong> {verificationResult.message}
            </div>
          )}
        </div>
        <div style={{ marginTop: '2rem' }}>
            <h3>検証したいVCのHolderを選択</h3>
            <input type="text" placeholder="Enter Holder Name" value={selectedHolder} onChange={(e) => setSelectedHolder(e.target.value)} style={{ marginRight: '0.5rem', minWidth: '300px' }} />
            {/* ★★★ タイトルを修正 ★★★ */}
            <h2 style={{marginTop: '2rem'}}>Selected Holder's VC List</h2>
            {selectedHolder.trim() !== '' && filteredCredentials.length === 0 && (
                <p>このHolderはCredentialを持っていません。</p>
            )}
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {filteredCredentials.map((credential) => (
                    <li key={credential.credential_name} onClick={() => handleSelectVcForVp(credential.credential_name)} style={{ border: vcsForVp.includes(credential.credential_name) ? '2px solid green' : '1px solid #007bff', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', backgroundColor: '#f0f8ff', cursor: 'pointer' }}>
                        <div><strong>Credential Name:</strong> {credential.credential_name}</div>
                        <div style={{marginTop: '0.5rem'}}><strong>Claim:</strong> {credential.claim}</div>
                    </li>
                ))}
            </ul>
            {filteredCredentials.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {/* ★★★ VPの名前入力欄を追加 ★★★ */}
                <div style={{ marginBottom: '1rem' }}>
                  <h3>作成するVPのNameを入力</h3>
                  <input
                    type="text"
                    placeholder="Enter VP Name"
                    value={vpNameToCreate}
                    onChange={(e) => setVpNameToCreate(e.target.value)}
                  />
                </div>
                <button onClick={handleGenerateVp} disabled={isGeneratingVp || vcsForVp.length === 0}>
                  {isGeneratingVp ? '発行中...' : '選択したVCのVPを発行！'}
                </button>
                <h2 style={{marginTop: '2rem'}}>Already Existing VP List</h2>
                {generatedVps.length === 0 ? (
                  <p>まだVPは発行されていません。</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {/* ★★★ 名前付きでVPを表示 ★★★ */}
                    {generatedVps.map((vpData, index) => (
                      <li key={index} style={{ border: '1px solid #28a745', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                        <div><strong>Name: {vpData.name}</strong></div>
                        <textarea readOnly value={vpData.vp} style={{ width: '100%', minHeight: '100px', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '12px' }} />
                      </li>
                    ))}
                  </ul>
                )}
                {/* ★★★ VP検証UIを追加 ★★★ */}
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
                  <h3>検証したいVPのNameを入力</h3>
                  <input
                    type="text"
                    placeholder="Enter VP Name to Verify"
                    value={vpNameToVerify}
                    onChange={(e) => setVpNameToVerify(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <button onClick={handleVerifyVp} disabled={isVerifyingVp}>
                    {isVerifyingVp ? '検証中...' : '選択したVPを検証！'}
                  </button>
                  {vpVerificationResult && (
                    <div style={{ marginTop: '1rem', padding: '0.5rem', border: `1px solid ${vpVerificationResult.color}`, color: vpVerificationResult.color, borderRadius: '4px' }}>
                      <strong>検証結果:</strong> {vpVerificationResult.message}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
