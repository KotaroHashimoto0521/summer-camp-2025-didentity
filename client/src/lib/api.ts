// --- データ型定義 ---

// フロントエンドからバックエンドへ新しいCredentialを作成する際に送信するデータの型
export interface NewCredentialPayload {
  credential_name: string;
  claim: string;
  holder: string;
}

// バックエンドからフロントエンドへ返されるCredentialデータの型 (Goの構造体フィールド名に準拠)
export type FetchedCredentialType = {
  Credential_Name: string;
  Claim: string;
  Holder: string;
  Issuer: string;
  Start_Time: string;
  End_Time: string;
  VC: string;
}


// APIクライアント関数

/**
 * サーバーに保存されているすべてのCredentialを取得する関数
 * @returns Credentialデータの配列を解決するPromise
 */
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

/**
 * 新しいCredentialを作成し、VCを発行するようサーバーにリクエストする関数
 * @param credential - 作成するCredentialの情報
 * @returns 作成されたCredentialデータ（VCを含む）を解決するPromise
 */
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

/**
 * 指定されたVC（Verifiable Credential）を検証するようサーバーにリクエストする関数
 * @param vc - 検証対象のVC (JWT形式の文字列)
 * @returns 検証結果のメッセージを解決するPromise
 */
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

/**
 * 指定されたVCの配列からVP（Verifiable Presentation）を生成するようサーバーにリクエストする関数
 * @param vcs - VPに含めるVCの配列
 * @returns 生成されたVP（JWT形式の文字列）を解決するPromise
 */
export const generateVp = async (vcs: string[]): Promise<{ vp: string }> => {
    const response = await fetch('http://localhost:8080/generate-vp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vcs: vcs }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'VP generation failed with an unknown error.');
    }

    return data;
};

/**
 * 指定されたVP（Verifiable Presentation）を検証するようサーバーにリクエストする関数
 * @param vp - 検証対象のVP (JWT形式の文字列)
 * @returns 検証結果のメッセージを解決するPromise
 */
export const verifyVp = async (vp: string): Promise<{ message: string }> => {
    const response = await fetch('http://localhost:8080/verify-vp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vp: vp }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'VP Verification failed with an unknown error.');
    }

    return data;
};
