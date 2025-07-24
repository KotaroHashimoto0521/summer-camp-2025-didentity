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
  VC: string;
}

export const getCredentials = async (): Promise<FetchedCredentialType[]> => {
    try {
        const response = await fetch('http://localhost:8080/credentials');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error("Failed to fetch credentials:", error);
        return [];
    }
};

export const addCredential = async (credential: NewCredentialPayload): Promise<FetchedCredentialType> => {
    const response = await fetch('http://localhost:8080/credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credential),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'サーバーからエラーが返されましたが、内容を解析できませんでした。' }));
        throw { 
            message: errorData.message || '不明なエラーが発生しました。',
            status: response.status 
        };
    }

    return response.json();
};

export const verifyCredential = async (vc: string): Promise<{ message: string }> => {
    const response = await fetch('http://localhost:8080/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vc: vc }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Verification failed with an unknown error.');
    }

    return data;
};
