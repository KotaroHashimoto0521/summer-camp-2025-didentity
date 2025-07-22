"use client";
import { useState, useEffect, FormEvent } from "react";
// 修正したapi.tsからNewCredentialPayloadもインポート
import { getCredentials, addCredential, FetchedCredentialType, NewCredentialPayload } from '../lib/api';

// フロントエンドで扱うCredentialの型定義
interface Credential {
  credential_id: string;
  subject: string;
  claim: string;
  issuer: string;
  holder: string;
  start_Time: string;
  end_Time: string;
}

// バックエンドから受け取ったデータをフロントエンド用の型に変換する関数
function convertFetchedCredentialToCredential(fetchedCredential: FetchedCredentialType): Credential {
  return {
    credential_id: fetchedCredential.Credential_ID,
    subject: fetchedCredential.Subject,
    claim: fetchedCredential.Claim,
    issuer: fetchedCredential.Issuer,
    holder: fetchedCredential.Holder,
    start_Time: fetchedCredential.Start_Time,
    end_Time: fetchedCredential.End_Time
  };
}

export default function Home() {
  // 表示するCredentialのリスト
  const [credentials, setCredentials] = useState<Credential[]>([]);
  
  // フォームの入力値を単一のオブジェクトで管理
  const [formData, setFormData] = useState({
    credential_id: '',
    subject: ''
  });

  // ローディング状態を管理
  const [isLoading, setIsLoading] = useState(true);
  // エラーメッセージを管理
  const [error, setError] = useState<string | null>(null);

  // 初回レンダリング時にデータを取得
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCredentials();
        // バックエンドからのデータが配列であることを確認
        if (Array.isArray(data)) {
          const fetched_credentials = data.map(convertFetchedCredentialToCredential);
          setCredentials(fetched_credentials);
        } else {
          // データが期待した形式でない場合
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

  // フォームの入力値をハンドルする関数
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Credentialを追加する処理
  const handleAddCredential = async (e: FormEvent) => {
    e.preventDefault(); // formのデフォルトの送信動作を防ぐ
    if (formData.credential_id.trim() === '' || formData.subject.trim() === '') {
      alert("IDとSubjectの両方を入力してください。");
      return;
    }

    try {
      // APIに送信するデータを作成
      const newCredentialPayload: NewCredentialPayload = {
        credential_id: formData.credential_id,
        subject: formData.subject,
      };
      
      // 修正したaddCredentialを呼び出す
      const fetchedCredential = await addCredential(newCredentialPayload);
      const addedCredential = convertFetchedCredentialToCredential(fetchedCredential);

      // 状態を更新してリストに即時反映
      setCredentials(prevCredentials => [...prevCredentials, addedCredential]);

      // 入力フィールドをリセット
      setFormData({ credential_id: '', subject: '' });

    } catch (err: any) { // any型でエラーを受け取る
      console.error("Adding credential failed:", err);
      // エラーオブジェクトにメッセージがあればそれを表示、なければ汎用メッセージを表示
      if (err && err.message) {
          alert(err.message);
      } else {
          alert("Credentialの追加に失敗しました。");
      }
    }
  };

  return (
    <main style={{ padding: '2rem' }}>
      <div>
        <h1>Credential List</h1>
        {isLoading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <ul>
          {credentials.map((credential) => (
            <li key={credential.credential_id}>
              ID: {credential.credential_id} - Subject: {credential.subject}
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddCredential}>
          <div style={{ margin: '1rem 0' }}>
            <input
              id="credential_id"
              type="text"
              placeholder="Enter Credential ID"
              value={formData.credential_id}
              onChange={handleInputChange}
              style={{ marginRight: '0.5rem' }}
            />
            <input
              id="subject"
              type="text"
              placeholder="Enter Subject"
              value={formData.subject}
              onChange={handleInputChange}
              style={{ marginRight: '0.5rem' }}
            />
            <button type="submit">Add Credential</button>
          </div>
        </form>
      </div>
    </main>
  );
}
