package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Credential はデータベースのテーブルとJSONの構造を定義します。
// フロントエンドの `FetchedCredentialType` とキー名を完全に一致させます。
type Credential struct {
	// gorm.Model を含めることで、ID, CreatedAt, UpdatedAt, DeletedAt フィールドが自動的に追加されます。
	gorm.Model
	Credential_ID string `json:"Credential_ID" gorm:"uniqueIndex"` // フロントエンドの期待するキー名に修正
	Subject       string `json:"Subject"`                          // フロントエンドの期待するキー名に修正
	Claim         string `json:"Claim"`                            // フロントエンドの期待するキー名に修正
	Issuer        string `json:"Issuer"`                           // フロントエンドの期待するキー名に修正
	Holder        string `json:"Holder"`                           // フロントエンドの期待するキー名に修正
	Start_Time    string `json:"Start_Time"`                       // フロントエンドの期待するキー名に修正
	End_Time      string `json:"End_Time"`                         // フロントエンドの期待するキー名に修正
}

// GetCredentialsHandler はすべてのCredentialを取得してJSONで返します。
func GetCredentialsHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var credentials []Credential
		if err := db.Find(&credentials).Error; err != nil {
			http.Error(w, "Could not get credentials", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(credentials)
	}
}

// AddCredentialHandler は新しいCredentialをデータベースに追加します。
func AddCredentialHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// リクエストボディから受け取るための仮の構造体
		var requestBody struct {
			Credential_ID string `json:"credential_id"`
			Subject       string `json:"subject"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// データベースに保存するCredentialオブジェクトを作成
		newCredential := Credential{
			Credential_ID: requestBody.Credential_ID,
			Subject:       requestBody.Subject,
			// 固定値や計算値で他のフィールドを埋める
			Claim:      "Sample Claim",
			Issuer:     "Go-Server",
			Holder:     "User",
			Start_Time: time.Now().Format(time.RFC3339),
			End_Time:   time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		}

		if err := db.Create(&newCredential).Error; err != nil {
			// エラーがIDの重複によるものかチェック
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				// IDが重複している場合、専用のエラーメッセージとステータスコード409を返す
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusConflict) // 409 Conflict
				json.NewEncoder(w).Encode(map[string]string{"message": "このCredential IDは既に使用されています。"})
				return
			}
			// その他のデータベースエラーの場合
			http.Error(w, "Could not create credential", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(newCredential)
	}
}
