"use client";
import { useState, useEffect, FormEvent } from "react";
import { getCredentials, addCredential, verifyCredential, generateVp, verifyVp, FetchedCredentialType, NewCredentialPayload } from '../lib/api';

// データ型定義

// フロントエンドで扱うCredentialのデータ構造を定義するインターフェース
interface Credential {
  credential_name: string;
  claim: string;
  holder: string;
  issuer: string;
  start_Time: string;
  end_Time: string;
  vc: string;
}

// フロントエンドで扱うVPのデータ構造を定義するインターフェース
interface VP {
  name: string;
  vp: string;
  includedVcNames: string[]; // VPに含まれるVCの名前を保持
}


// ヘルパー関数

/**
 * バックエンドから取得したデータをフロントエンド用のキャメルケース形式に変換する関数
 * @param fetchedCredential - バックエンドから返されたパスカルケースのCredentialデータ
 * @returns フロントエンドで扱うキャメルケースのCredentialデータ
 */
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


// メインコンポーネント

export default function Home() {
  // State定義
  // アプリケーション全体の状態を管理するReact Stateフック

  // 全Credentialのリストを保持
  const [credentials, setCredentials] = useState<Credential[]>([]);
  // IssuerのVC発行フォームの入力値を保持
  const [formData, setFormData] = useState({ credential_name: '', claim: '', holder: '' });
  // VerifierがVCを検証する際に入力するVC Nameを保持
  const [verificationName, setVerificationName] = useState('');
  // VC検証処理中のローディング状態を管理
  const [isVerifying, setIsVerifying] = useState(false);
  // VC検証結果のメッセージと色を保持
  const [verificationResult, setVerificationResult] = useState<{ message: string; color: string } | null>(null);
  // Holderページで選択されたHolder名を保持
  const [selectedHolder, setSelectedHolder] = useState('');
  // データ取得中のグローバルなローディング状態を管理
  const [isLoading, setIsLoading] = useState(true);
  // データ取得時のエラーメッセージを保持
  const [error, setError] = useState<string | null>(null);
  // VPに含めるために選択されたVCのリスト（credential_nameの配列）を保持
  const [vcsForVp, setVcsForVp] = useState<string[]>([]);
  // 発行済みのVPのリスト（名前とVP文字列のオブジェクト配列）を保持
  const [generatedVps, setGeneratedVps] = useState<VP[]>([]);
  // VP発行処理中のローディング状態を管理
  const [isGeneratingVp, setIsGeneratingVp] = useState(false);
  // VP発行時に入力するVP Nameを保持
  const [vpNameToCreate, setVpNameToCreate] = useState('');
  // VerifierがVPを検証する際に入力するVP Nameを保持
  const [vpNameToVerify, setVpNameToVerify] = useState('');
  // VP検証処理中のローディング状態を管理
  const [isVerifyingVp, setIsVerifyingVp] = useState(false);
  // VP検証結果のメッセージと色を保持
  const [vpVerificationResult, setVpVerificationResult] = useState<{ message: string; color: string } | null>(null);

  
  // Effect定義
  // 副作用（APIからのデータ取得など）を管理するReact Effectフック

  // コンポーネントの初回レンダリング時に、サーバーから全Credentialリストを取得する
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

  
  // ハンドラ関数定義
  // ユーザーの操作（入力、クリックなど）に応じて実行される関数群

  /**
   * IssuerのVC発行フォームの入力値をStateに反映させるハンドラ
   * @param e - input要素のonChangeイベント
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  /**
   * IssuerがVC発行フォームを送信したときの処理を行うハンドラ
   * @param e - form要素のonSubmitイベント
   */
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

  /**
   * VerifierがVCを検証するボタンをクリックしたときの処理を行うハンドラ
   */
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

  /**
   * HolderページでVPに含めるVCを選択（クリック）したときの処理を行うハンドラ
   * @param credentialName - 選択されたVCのcredential_name
   */
  const handleSelectVcForVp = (credentialName: string) => {
    setVcsForVp(prevSelected => {
      if (prevSelected.includes(credentialName)) {
        return prevSelected.filter(name => name !== credentialName);
      } else {
        return [...prevSelected, credentialName];
      }
    });
  };

  /**
   * VP発行ボタンをクリックしたときの処理を行うハンドラ
   */
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
      setGeneratedVps(prevVps => [...prevVps, { name: vpNameToCreate, vp: result.vp, includedVcNames: vcsForVp }]);
      setVpNameToCreate('');
      setVcsForVp([]);
    } catch (error: any) {
      alert(`VPの発行に失敗しました: ${error.message}`);
    } finally {
      setIsGeneratingVp(false);
    }
  };

  /**
   * VerifierがVPを検証するボタンをクリックしたときの処理を行うハンドラ
   */
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

  
  // 派生状態の計算
  // Stateから計算して導き出される値をレンダリング直前に定義
  
  // 選択されたHolder名に基づいて、表示するCredentialリストをフィルタリング
  const filteredCredentials = selectedHolder.trim() === ''
    ? []
    : credentials.filter(cred =>
        cred.holder.toLowerCase() === selectedHolder.trim().toLowerCase()
      );

      
  // スタイル定義
  // JSX内で使用する共通のスタイルオブジェクト
  
  const buttonStyle = {
    padding: '12px 24px',
    fontSize: '18px',
    cursor: 'pointer'
  };


  // JSX (画面描画)
  // ユーザーインターフェースを定義する
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div>
        {/* Issuer Page */}
        <h1 style={{ color: 'green'}}>Issuer Page</h1>
        <h2>VC 発行フォーム</h2>
        <form onSubmit={handleAddCredential}>
          <div style={{ border: '2px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <ol style={{ paddingLeft: '20px' }}>
              <li>
                <h3>Credential Nameを入力</h3>
                <input id="credential_name" type="text" placeholder="Enter Credential Name" value={formData.credential_name} onChange={handleInputChange} />
              </li>
              <li>
                <h3>Claimを入力</h3>
                <input id="claim" type="text" placeholder="Enter Claim" value={formData.claim} onChange={handleInputChange} />
              </li>
              <li>
                <h3>Holderを入力</h3>
                <input id="holder" type="text" placeholder="Enter Holder" value={formData.holder} onChange={handleInputChange} />
              </li>
            </ol>
            <button type="submit" style={{ ...buttonStyle, marginTop: '1rem' }}>IssuerがVCを発行！</button>
          </div>
        </form>
        
        <hr style={{ margin: '5rem 0' }} />

        {/* Holder Page */}
        <h1 style={{ color: 'green' }}>Holder Page</h1>
        <h2>Already issued VCs List</h2>
        {isLoading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {credentials.map((credential) => (
            <li key={credential.credential_name} style={{ border: '2px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div><strong>Credential Name:</strong> {credential.credential_name}</div>
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

        <h2>VP 発行フォーム</h2>
        <div style={{ border: '2px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <ol style={{ paddingLeft: '20px' }}>
            <li>
              <h3>Holderを選択</h3>
              <input type="text" placeholder="Enter Holder" value={selectedHolder} onChange={(e) => setSelectedHolder(e.target.value)} style={{ marginRight: '0.5rem', minWidth: '300px' }} />
            </li>
            <li style={{ marginTop: '1.5rem' }}>
              <h3>HolderのVC ListからVCを選択</h3>
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
            </li>
            {filteredCredentials.length > 0 && (
              <li style={{ marginTop: '1.5rem' }}>
                <h3>作成するVPのCredential Nameを入力</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Enter VP Name"
                    value={vpNameToCreate}
                    onChange={(e) => setVpNameToCreate(e.target.value)}
                  />
                </div>
                <button onClick={handleGenerateVp} disabled={isGeneratingVp || vcsForVp.length === 0} style={buttonStyle}>
                  {isGeneratingVp ? '発行中...' : '選択したVCのVPを発行！'}
                </button>
              </li>
            )}
          </ol>
        </div>
        
        <h2 style={{marginTop: '2rem'}}>Already issued VPs List</h2>
        {generatedVps.length === 0 ? (
          <p>まだVPは発行されていません。</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {generatedVps.map((vpData, index) => (
              <li key={index} style={{ border: '1px solid #28a745', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div><strong>Credential Name: {vpData.name}</strong></div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Selected VCs:</strong> {vpData.includedVcNames.join(', ')}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>VP:</strong>
                  <textarea readOnly value={vpData.vp} style={{ width: '100%', minHeight: '100px', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '12px' }} />
                </div>
              </li>
            ))}
          </ul>
        )}


        <hr style={{ margin: '5rem 0' }} />

        {/* Verifier Page */}
        <h1 style={{ color: 'green' }}>Verifier Page</h1>
        <div style={{ marginTop: '1rem' }}>
          <h3>検証したいVCのCredential Nameを入力</h3>
          <input type="text" placeholder="Enter VC's Credential Name" value={verificationName} onChange={(e) => setVerificationName(e.target.value)} style={{ marginRight: '0.5rem' }} />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button onClick={handleVerify} disabled={isVerifying} style={buttonStyle}>
            {isVerifying ? '検証中...' : '選択したVCを検証！'}
          </button>
        </div>
        <div style={{ marginTop: '1rem' }}>
          {verificationResult && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', border: `1px solid ${verificationResult.color}`, color: verificationResult.color, borderRadius: '4px' }}>
              <strong>検証結果:</strong> {verificationResult.message}
            </div>
          )}
        </div>
        <div style={{ marginTop: '2rem' }}>
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
            <h3>検証したいVPのCredential Nameを入力</h3>
            <input
              type="text"
              placeholder="Enter VP's Credential Name"
              value={vpNameToVerify}
              onChange={(e) => setVpNameToVerify(e.target.value)}
              style={{ marginRight: '0.5rem' }}
            />
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleVerifyVp} disabled={isVerifyingVp} style={buttonStyle}>
              {isVerifyingVp ? '検証中...' : '選択したVPを検証！'}
            </button>
            </div>
            {vpVerificationResult && (
              <div style={{ marginTop: '1rem', padding: '0.5rem', border: `1px solid ${vpVerificationResult.color}`, color: vpVerificationResult.color, borderRadius: '4px' }}>
                <strong>検証結果:</strong> {vpVerificationResult.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
