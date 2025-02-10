"use client";
import { useState, useEffect } from "react";
import { getCredentials, addCredential, FetchedCredentialType } from '../lib/api';



interface Credential {
  credential_id: string;
  subject: string;
  claim: string;
  issuer: string;
  holder: string;
  start_Time: string;
  end_Time: string;
};


function convertFetchedCrendentialToCredential(fetchCredential: FetchedCredentialType) {
  const credential: Credential = {
  credential_id: fetchCredential.Credential_ID,
  subject: fetchCredential.Subject,
  claim: fetchCredential.Claim,
  issuer: fetchCredential.Issuer,
  holder: fetchCredential.Holder,
  start_Time: fetchCredential.Start_Time,
  end_Time: fetchCredential.End_Time
  };
  return credential;
}

export default function Home() {
    // const [credentials, setCredentials] = useState<Credential>(
    //   {credential_id: "", 
    //       subject: "",
    //       claim: "",
    //     issuer: "",
    //     holder: "",
    //     start_Time: "",
    //     end_Time: ""
    //   }
    // );
  //   const [vc, setVC] = useState<string>("");
  //   const [vp, setVP] = useState<string>("");

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [newCredential, setNewCredential] = useState<FetchedCredentialType>();

  const [newCredentialId, setNewCredentialId] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('');
  // const [newClaim, setNewClaim] = useState<string>('');

  // 初回レンダリングのデータ取得
  useEffect(() => {
    const fetchCredentials = async () => {
      const data = await getCredentials();
      const fetched_credentials = data.map(credential => convertFetchedCrendentialToCredential(credential));
      setCredentials(fetched_credentials);
    };
    fetchCredentials();
  }, []);

  // //Todoを追加する処理
  // const handleAddCredential = async () => {
  //   if (newCredential.trim() === '') return;
  //   const fetchedCredential = await addCredential(newCredential);
  //   const addedCredential=convertFetchedCrendentialToCredential(fetchedCredential);
  //   setCredentials([...credentials, addedCredential]);
  //   setNewCredential('');
  // };

  // Todoを追加する処理
  const handleAddCredential = async () => {
    // if (newCredentialId.trim() === '' || newSubject.trim() === '') 
    //   return;

    // バックエンドに送るデータを作成
    const newCredential: Credential = {
      credential_id: '',
      subject: '',
      claim: '',
      issuer: '',
      holder: '',
      start_Time: '',
      end_Time: ''
      // Credential_ID: newCredentialId ,
      // Subject: newSubject,
      // Claim: string
      // Issuer: string
      // Holder: string
      // Start_Time: string
      // End_Time: string
    };

    // API呼び出し
    const fetchedCredential = await addCredential(newCredential.subject);
    const addedCredential = convertFetchedCrendentialToCredential(fetchedCredential);

    // // 状態を更新
    // setCredentials([...credentials, addedCredential]);

    // // 入力フィールドをリセット
    // setNewCredentialId('');
    // setNewSubject('');
  };

  return (
    <main>
      <div>
        <h1>Credential List</h1>
        <ul>
          
          {credentials.map((credential) => (
            <li key={credential.credential_id}>
              {credential.credential_id}
              {credential.subject}
              {credential.claim}
              {credential.issuer}
              {credential.holder}
              {credential.start_Time}
              {credential.end_Time}
            </li>
          ))}
        </ul>

        <input
          id="credential_id"
          type="text"
          value={newCredentialId}
          onChange={(e) => setNewCredentialId(e.target.value)}
        />
        <input
          id="subject"
          type="text"
          value={newSubject}
          onChange={(f) => setNewSubject(f.target.value)}
        />
        {/* <h3>ID: {credentials.credential_ID}</h3>
        <input id="credential_ID" type="text" onChange={(e) => setNewCredential((prev) => ({
          ...prev,
          credential_ID: e.target.value,
        }))}></input> */}
        <button onClick={handleAddCredential}>Add Credential</button>
      </div>
    </main>
  );
}
