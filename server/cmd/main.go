package main

import (
	"log"
	"net/http"
	"summer-camp-2025-didentity/server/handler"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// CORSミドルウェア
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000") // より具体的に指定
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// データベースに接続
	db, err := gorm.Open(sqlite.Open("credential.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database")
	}
	// データベースのマイグレーションを実行
	// 既存のテーブルとの差分を検知して、テーブル構造を更新します。
	if err := db.AutoMigrate(&handler.Credential{}); err != nil {
		log.Fatalf("failed to auto migrate database: %v", err)
	}

	mux := http.NewServeMux()

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

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}
