export type FetchedCredentialType = {
    Credential_ID: string
    Subject: string
    Claim: string
    Issuer: string
    Holder: string
    Start_Time: string
    End_Time: string
}

// Todoリストを取得するリクエスト
export const getCredentials:()=>Promise<FetchedCredentialType[]> = async () => {
    const response = await fetch('http://localhost:8080/credentials');
    // return response.json();
    const hoge = await response.json();
    return hoge;
};

// Todoリストに追加するリクエスト
export const addCredential:(text:string)=>Promise<FetchedCredentialType> = async (text: string) => {
    const response = await fetch('http://localhost:8080/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    // return response.json();
    const hoge = await response.json();
    return hoge;
};
