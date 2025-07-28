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
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"gorm.io/gorm"
)

// 構造体定義

// JwtHeader はJWTのヘッダー部分を表す構造体です。
type JwtHeader struct {
	Kid string `json:"kid"`
}

// SubjectClaim はVCのcredentialSubject部分を表す構造体です。
// "holder"フィールドを追加します。
type SubjectClaim struct {
	ID     string `json:"id"`
	Claim  string `json:"claim"`
	Holder string `json:"holder"`
}

// VerifiableCredentials はW3CのVCデータモデルに準拠した構造体です。
// "Start_Time"と"End_Time"フィールドを追加します。
type VerifiableCredentials struct {
	Context    []string      `json:"@context"`
	Type       []string      `json:"type"`
	Issuer     string        `json:"issuer"`
	Start_Time string        `json:"Start_Time"`
	End_Time   string        `json:"End_Time"`
	Subject    *SubjectClaim `json:"credentialSubject"`
}

// VerifiablePresentation はW3CのVPデータモデルに準拠した構造体です。
type VerifiablePresentation struct {
	Context              []string `json:"@context"`
	Type                 []string `json:"type"`
	Holder               string   `json:"holder"`
	VerifiableCredential []string `json:"verifiableCredential"`
}

// Credential はGORMがデータベースとマッピングするためのモデル構造体です。
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

// ヘルパー関数

// GenerateJWT は、与えられたヘッダー、ペイロード、秘密鍵からJWTを生成する汎用関数です。
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

// ハンドラ関数

// GetCredentialsHandler は、データベースに保存されている全てのCredentialを取得して返します。
func GetCredentialsHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var credentials []Credential
		if err := db.Find(&credentials).Error; err != nil {
			http.Error(w, "Could not get credentials", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		json.NewEncoder(w).Encode(credentials)
	}
}

// AddCredentialHandler は、VCペイロードの生成ロジックを修正します。
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
			privKey := new(ecdsa.PrivateKey)
			privKey.D = new(big.Int)
			privKey.D.SetBytes(keyBytes)
			privKey.PublicKey.Curve = elliptic.P256()
			privKey.PublicKey.X, privKey.PublicKey.Y = privKey.PublicKey.Curve.ScalarBaseMult(keyBytes)
			issuerKey = privKey
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
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"message": "このCredential Nameは既に使用されています。"})
				return
			}
			http.Error(w, "Could not create credential", http.StatusInternalServerError)
			return
		}

		// VCペイロードの生成ロジックを新しい構造に合わせて変更
		vcPayload := VerifiableCredentials{
			Context:    []string{"https://www.w3.org/2018/credentials/v1"},
			Type:       []string{"VerifiableCredential"},
			Issuer:     issuerDID,
			Start_Time: credential.Start_Time,
			End_Time:   credential.End_Time,
			Subject: &SubjectClaim{
				ID:     credential.Credential_Name, // "id" に Credential_Name を設定
				Claim:  credential.Claim,
				Holder: credential.Holder, // "holder" を追加
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

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(credential)
	}
}

// VerifyVCHandler は、受け取ったVCの電子署名を検証します。
func VerifyVCHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			VC string `json:"vc"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		parts := strings.Split(req.VC, ".")
		if len(parts) != 3 {
			http.Error(w, "Invalid VC format", http.StatusBadRequest)
			return
		}
		header, payload, sig := parts[0], parts[1], parts[2]

		headerBytes, err := base64.RawURLEncoding.DecodeString(header)
		if err != nil {
			http.Error(w, "Failed to decode VC header", http.StatusBadRequest)
			return
		}
		var h JwtHeader
		if err := json.Unmarshal(headerBytes, &h); err != nil {
			http.Error(w, "Failed to parse VC header", http.StatusBadRequest)
			return
		}

		didKey, err := NewDIDKeyFromDID(h.Kid)
		if err != nil {
			http.Error(w, "Failed to create key from DID", http.StatusInternalServerError)
			return
		}

		msg := fmt.Sprintf("%s.%s", header, payload)
		digest := sha256.Sum256([]byte(msg))
		sigBytes, err := base64.RawURLEncoding.DecodeString(sig)
		if err != nil {
			http.Error(w, "Failed to decode VC signature", http.StatusBadRequest)
			return
		}
		rBytes := sigBytes[:len(sigBytes)/2]
		sBytes := sigBytes[len(sigBytes)/2:]
		rVal, sVal := new(big.Int).SetBytes(rBytes), new(big.Int).SetBytes(sBytes)

		isValid := ecdsa.Verify(&didKey.PublicKey, digest[:], rVal, sVal)
		if !isValid {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "VCの署名が無効です (Invalid signature)"})
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "VCは有効です (VC is valid)"})
	}
}

// GenerateVPHandler は、受け取ったVCの配列からVPを発行します。
func GenerateVPHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			VCs []string `json:"vcs"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if len(req.VCs) == 0 {
			http.Error(w, "VCs are required", http.StatusBadRequest)
			return
		}

		var holderKey *ecdsa.PrivateKey
		if _, err := os.Stat(".tmp/holder_private.key"); os.IsNotExist(err) {
			holderKey, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
			if err != nil {
				http.Error(w, "Failed to generate holder key", http.StatusInternalServerError)
				return
			}
			keyBytes := holderKey.D.Bytes()
			if err := os.WriteFile(".tmp/holder_private.key", keyBytes, 0600); err != nil {
				http.Error(w, "Failed to save holder key", http.StatusInternalServerError)
				return
			}
		} else {
			keyBytes, err := os.ReadFile(".tmp/holder_private.key")
			if err != nil {
				http.Error(w, "Failed to read holder key", http.StatusInternalServerError)
				return
			}
			privKey := new(ecdsa.PrivateKey)
			privKey.D = new(big.Int)
			privKey.D.SetBytes(keyBytes)
			privKey.PublicKey.Curve = elliptic.P256()
			privKey.PublicKey.X, privKey.PublicKey.Y = privKey.PublicKey.Curve.ScalarBaseMult(keyBytes)
			holderKey = privKey
		}

		didKey, _ := NewDIDKeyFromPrivateKey(holderKey)
		holderDID := didKey.DID()

		vpPayload := VerifiablePresentation{
			Context:              []string{"https://www.w3.org/2018/credentials/v1"},
			Type:                 []string{"VerifiablePresentation"},
			Holder:               holderDID,
			VerifiableCredential: req.VCs,
		}

		header := JwtHeader{Kid: holderDID}
		jwt, err := GenerateJWT(header, vpPayload, holderKey)
		if err != nil {
			log.Printf("Failed to generate VP JWT: %v", err)
			http.Error(w, "Failed to generate VP", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"vp": jwt})
	}
}

// VerifyVPHandler は、受け取ったVPの電子署名を検証します。
func VerifyVPHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			VP string `json:"vp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		parts := strings.Split(req.VP, ".")
		if len(parts) != 3 {
			http.Error(w, "Invalid VP format", http.StatusBadRequest)
			return
		}
		header, payload, sig := parts[0], parts[1], parts[2]

		headerBytes, err := base64.RawURLEncoding.DecodeString(header)
		if err != nil {
			http.Error(w, "Failed to decode VP header", http.StatusBadRequest)
			return
		}
		var h JwtHeader
		if err := json.Unmarshal(headerBytes, &h); err != nil {
			http.Error(w, "Failed to parse VP header", http.StatusBadRequest)
			return
		}

		didKey, err := NewDIDKeyFromDID(h.Kid)
		if err != nil {
			http.Error(w, "Failed to create key from DID for VP", http.StatusInternalServerError)
			return
		}

		msg := fmt.Sprintf("%s.%s", header, payload)
		digest := sha256.Sum256([]byte(msg))
		sigBytes, err := base64.RawURLEncoding.DecodeString(sig)
		if err != nil {
			http.Error(w, "Failed to decode VP signature", http.StatusBadRequest)
			return
		}
		rBytes := sigBytes[:len(sigBytes)/2]
		sBytes := sigBytes[len(sigBytes)/2:]
		rVal, sVal := new(big.Int).SetBytes(rBytes), new(big.Int).SetBytes(sBytes)

		isValid := ecdsa.Verify(&didKey.PublicKey, digest[:], rVal, sVal)
		if !isValid {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "VPの署名が無効です (Invalid signature)"})
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "VPは有効です (VP is valid)"})
	}
}
