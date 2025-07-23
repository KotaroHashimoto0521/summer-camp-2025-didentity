package handler

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big" // math/bigをインポート
	"net/http"
	"os"
	"strings"
	"time"

	"gorm.io/gorm"
)

// --- VC発行に必要な構造体 (変更なし) ---
type JwtHeader struct {
	Kid string `json:"kid"`
}

type SubjectClaim struct {
	ID    string `json:"id"`
	Claim string `json:"claim"`
}

type VerifiableCredentials struct {
	Context []string      `json:"@context"`
	Type    []string      `json:"type"`
	Issuer  string        `json:"issuer"`
	Subject *SubjectClaim `json:"credentialSubject"`
}

// --- データベースの構造体 (変更なし) ---
type Credential struct {
	gorm.Model
	Credential_Name string `json:"Credential_Name" gorm:"uniqueIndex"`
	Claim           string `json:"Claim"`
	Holder          string `json:"Holder"`
	Issuer          string `json:"Issuer"`
	Start_Time      string `json:"Start_Time"`
	End_Time        string `json:"End_Time"`
	VC              string `json:"VC"`
}

// --- VC生成用のヘルパー関数 (変更なし) ---
func GenerateJWT(header JwtHeader, payload interface{}, prvKey *ecdsa.PrivateKey) (string, error) {
	headerb, err := json.Marshal(header)
	if err != nil {
		return "", err
	}

	payloadb, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	msg := fmt.Sprintf("%s.%s", base64.RawURLEncoding.EncodeToString(headerb), base64.RawURLEncoding.EncodeToString(payloadb))
	digest := sha256.Sum256([]byte(msg))
	r, s, err := ecdsa.Sign(rand.Reader, prvKey, digest[:])
	if err != nil {
		return "", err
	}
	sig := append(r.Bytes(), s.Bytes()...)
	jwt := fmt.Sprintf("%s.%s", msg, base64.RawURLEncoding.EncodeToString(sig))

	return jwt, nil
}

// GetCredentialsHandlerは変更なし
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

// --- AddCredentialHandlerを修正 ---
func AddCredentialHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var requestBody struct {
			Credential_Name string `json:"credential_name"`
			Claim           string `json:"claim"`
			Holder          string `json:"holder"`
		}
		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var issuerKey *ecdsa.PrivateKey
		if _, err := os.Stat(".tmp/issuer_private.key"); os.IsNotExist(err) {
			issuerKey, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
			if err != nil {
				http.Error(w, "Failed to generate issuer key", http.StatusInternalServerError)
				return
			}
			keyBytes := issuerKey.D.Bytes()
			if err := os.WriteFile(".tmp/issuer_private.key", keyBytes, 0600); err != nil {
				http.Error(w, "Failed to save issuer key", http.StatusInternalServerError)
				return
			}
		} else {
			keyBytes, err := os.ReadFile(".tmp/issuer_private.key")
			if err != nil {
				http.Error(w, "Failed to read issuer key", http.StatusInternalServerError)
				return
			}

			// --- ★★★ 修正箇所 ★★★ ---
			// PrivateKeyオブジェクトを正しく再構築する
			privKey := new(ecdsa.PrivateKey)
			privKey.D = new(big.Int) // Dフィールドを初期化
			privKey.D.SetBytes(keyBytes)
			privKey.PublicKey.Curve = elliptic.P256()
			privKey.PublicKey.X, privKey.PublicKey.Y = privKey.PublicKey.Curve.ScalarBaseMult(keyBytes)
			issuerKey = privKey
			// --- 修正ここまで ---
		}

		didKey, _ := NewDIDKeyFromPrivateKey(issuerKey)
		issuerDID := didKey.DID()

		credential := Credential{
			Credential_Name: requestBody.Credential_Name,
			Claim:           requestBody.Claim,
			Holder:          requestBody.Holder,
			Issuer:          issuerDID,
			Start_Time:      time.Now().Format(time.RFC3339),
			End_Time:        time.Now().Add(365 * 24 * time.Hour).Format(time.RFC3339),
			VC:              "",
		}

		if err := db.Create(&credential).Error; err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"message": "このCredential Nameは既に使用されています。"})
				return
			}
			http.Error(w, "Could not create credential", http.StatusInternalServerError)
			return
		}

		vcPayload := VerifiableCredentials{
			Context: []string{"https://www.w3.org/2018/credentials/v1"},
			Type:    []string{"VerifiableCredential"},
			Issuer:  issuerDID,
			Subject: &SubjectClaim{
				ID:    credential.Holder,
				Claim: credential.Claim,
			},
		}
		header := JwtHeader{Kid: issuerDID}
		jwt, err := GenerateJWT(header, vcPayload, issuerKey)
		if err != nil {
			log.Printf("Failed to generate JWT: %v", err)
			http.Error(w, "Failed to generate VC", http.StatusInternalServerError)
			return
		}

		db.Model(&credential).Update("VC", jwt)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(credential)
	}
}
