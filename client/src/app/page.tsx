"use client";
import { useState, useEffect, FormEvent } from "react";
import { getCredentials, addCredential, FetchedCredentialType, NewCredentialPayload } from '../lib/api';

// フロントエンドで扱うCredentialの型を新しい仕様に変更
interface Credential {
  credential_name: string;
  claim: string;
  holder: string;
  issuer: string;
  start_Time: string;
  end_Time: string;
}

// バックエンドからのデータをフロントエンド用に変換する関数を修正
function convertFetchedCredentialToCredential(fetchedCredential: FetchedCredentialType): Credential {
  return {
    credential_name: fetchedCredential.Credential_Name,
    claim: fetchedCredential.Claim,
    holder: fetchedCredential.Holder,
    issuer: fetchedCredential.Issuer,
    start_Time: fetchedCredential.Start_Time,
    end_Time: fetchedCredential.End_Time
  };
}

export default function Home() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  
  // フォームの入力値を管理するstateを新しい仕様に変更
  const [formData, setFormData] = useState({
    credential_name: '',
    claim: '',
    holder: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初回レンダリング時のデータ取得ロジックは変更ありません
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

  // フォーム入力のハンドリングは変更ありません
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Credential追加処理を新しい仕様に合わせて修正
  const handleAddCredential = async (e: FormEvent) => {
    e.preventDefault();
    // 入力チェックを3つのフィールドに対して行う
    if (formData.credential_name.trim() === '' || formData.claim.trim() === '' || formData.holder.trim() === '') {
      alert("Name, Claim, Holderのすべてを入力してください。");
      return;
    }

    try {
      // APIに送信するデータを作成
      const newCredentialPayload: NewCredentialPayload = {
        credential_name: formData.credential_name,
        claim: formData.claim,
        holder: formData.holder,
      };
      
      const fetchedCredential = await addCredential(newCredentialPayload);
      const addedCredential = convertFetchedCredentialToCredential(fetchedCredential);

      setCredentials(prevCredentials => [...prevCredentials, addedCredential]);

      // 入力フィールドをリセット
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

  // 画面表示(JSX)を新しい仕様に合わせて修正
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div>
        <h1>Issuer Page</h1>
        <h2>Already Existing Credential List</h2>
        {isLoading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <ul>
          {credentials.map((credential) => (
            <li key={credential.credential_name}>
              Name: {credential.credential_name} - Claim: {credential.claim} - Holder: {credential.holder}
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
        <h1>Holder Page</h1>
        <h1>Verifier Page</h1>
      </div>
    </main>
  );
}
