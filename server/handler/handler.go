package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Credential 構造体を新しい仕様に合わせて変更
type Credential struct {
	gorm.Model
	// フィールド名を credential_id から credential_name に変更
	Credential_Name string `json:"Credential_Name" gorm:"uniqueIndex"`
	// subject を claim に変更
	Claim string `json:"Claim"`
	// holder は元々あったのでそのまま
	Holder     string `json:"Holder"`
	Issuer     string `json:"Issuer"`
	Start_Time string `json:"Start_Time"`
	End_Time   string `json:"End_Time"`
}

// GetCredentialsHandler は変更ありません
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

// AddCredentialHandler を修正して、新しい入力フィールドに対応します
func AddCredentialHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// リクエストボディから受け取るための構造体を変更
		var requestBody struct {
			Credential_Name string `json:"credential_name"`
			Claim           string `json:"claim"`
			Holder          string `json:"holder"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// データベースに保存するCredentialオブジェクトを作成
		newCredential := Credential{
			Credential_Name: requestBody.Credential_Name,
			Claim:           requestBody.Claim,
			Holder:          requestBody.Holder,
			// Issuer と時間はサーバー側で設定
			Issuer:     "Go-Server",
			Start_Time: time.Now().Format(time.RFC3339),
			End_Time:   time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		}

		// データベースへの作成処理
		if err := db.Create(&newCredential).Error; err != nil {
			// 重複エラーのチェック
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusConflict)
				// エラーメッセージを分かりやすく変更
				json.NewEncoder(w).Encode(map[string]string{"message": "このCredential Nameは既に使用されています。"})
				return
			}
			// その他のデータベースエラー
			http.Error(w, "Could not create credential", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(newCredential)
	}
}
