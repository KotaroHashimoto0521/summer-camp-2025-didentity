// Credentialを追加する際にAPIに渡すデータの型を定義
export interface NewCredentialPayload {
    credential_name: string;
    claim: string;
    holder: string;
}

export type FetchedCredentialType = {
    Credential_Name: string;
    Claim: string;
    Holder: string;
    Issuer: string;
    Start_Time: string;
    End_Time: string;
}

// Credentialリストを取得するリクエスト
export const getCredentials = async (): Promise<FetchedCredentialType[]> => {
    // エラーハンドリングを追加
    try {
        const response = await fetch('http://localhost:8080/credentials');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // バックエンドから返されるデータがnullの場合も考慮して空配列を返す
        return data || [];
    } catch (error) {
        console.error("Failed to fetch credentials:", error);
        return []; // エラーが発生した場合は空のリストを返す
    }
};

// Credentialを追加するリクエスト
// 引数をオブジェクトに変更
export const addCredential = async (credential: NewCredentialPayload): Promise<FetchedCredentialType> => {
    const response = await fetch('http://localhost:8080/credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        // オブジェクトをJSON文字列に変換して送信
        body: JSON.stringify(credential),
    });

    if (!response.ok) {
        // レスポンスがOKでない場合、JSONボディからエラーメッセージを取得
        const errorData = await response.json().catch(() => ({ message: 'サーバーからエラーが返されましたが、内容を解析できませんでした。' }));
        // ステータスコードとメッセージを含むオブジェクトをthrowする
        throw { 
            message: errorData.message || '不明なエラーが発生しました。',
            status: response.status 
        };
    }

    return response.json();
};