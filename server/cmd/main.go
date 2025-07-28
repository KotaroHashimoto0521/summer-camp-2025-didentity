package main

import (
	"log"
	"net/http"
	"os"

	"summer-camp-2025-didentity/server/handler"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// corsMiddleware は、CORS (Cross-Origin Resource Sharing) のためのHTTPミドルウェアです。
// フロントエンド (localhost:3000) からのAPIリクエストを許可します。
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// プリフライトリクエスト (OPTIONS) に対応
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// main は、アプリケーションのエントリーポイントです。
func main() {
	// 鍵保存用の.tmpディレクトリがなければ作成します。
	if _, err := os.Stat(".tmp"); os.IsNotExist(err) {
		if err := os.Mkdir(".tmp", 0755); err != nil {
			log.Fatalf("Failed to create .tmp directory: %v", err)
		}
	}

	// SQLiteデータベースに接続します。ファイル名は "credential.db" です。
	db, err := gorm.Open(sqlite.Open("credential.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database")
	}

	// Credential構造体をもとに、データベースのテーブルを自動マイグレーション（作成・更新）します。
	if err := db.AutoMigrate(&handler.Credential{}); err != nil {
		log.Fatalf("failed to auto migrate database: %v", err)
	}

	// HTTPリクエストのルーティング（URLパスと処理の紐付け）を行うmuxを作成します。
	mux := http.NewServeMux()

	// "/credentials" エンドポイントのハンドラを登録します。
	// GETメソッドで全Credential取得、POSTメソッドで新規作成を行います。
	mux.HandleFunc("/credentials", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handler.GetCredentialsHandler(db)(w, r)
		case http.MethodPost:
			handler.AddCredentialHandler(db)(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// "/verify" エンドポイントのハンドラを登録します。
	// POSTメソッドでVCの検証を行います。
	mux.HandleFunc("/verify", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.VerifyVCHandler()(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// "/generate-vp" エンドポイントのハンドラを登録します。
	// POSTメソッドでVPの発行を行います。
	mux.HandleFunc("/generate-vp", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.GenerateVPHandler()(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// "/verify-vp" エンドポイントのハンドラを登録します。
	// POSTメソッドでVPの検証を行います。
	mux.HandleFunc("/verify-vp", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.VerifyVPHandler()(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// サーバーをポート8080で起動します。CORSミドルウェアを適用します。
	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}
