package main

import (
	"log"
	"net/http"
	"os"

	"summer-camp-2025-didentity/server/handler"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
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
	if _, err := os.Stat(".tmp"); os.IsNotExist(err) {
		if err := os.Mkdir(".tmp", 0755); err != nil {
			log.Fatalf("Failed to create .tmp directory: %v", err)
		}
	}

	db, err := gorm.Open(sqlite.Open("credential.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database")
	}

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

	mux.HandleFunc("/verify", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.VerifyVCHandler()(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/generate-vp", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.GenerateVPHandler()(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// --- ★★★ ここから新規追加 ★★★ ---
	// VP検証用の新しいエンドポイント
	mux.HandleFunc("/verify-vp", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handler.VerifyVPHandler()(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	// --- 追加ここまで ---

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}
