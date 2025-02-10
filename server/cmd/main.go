package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"summer-camp-2024-didentity/server/handler"

	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Server struct {
	s        *http.Server
	handlers map[string]http.HandlerFunc
}

// type Credential struct {
// 	ID   string `json:"id"`
// 	Text string `json:"text"`
// }

var credentials = []handler.Credential{}

func NewServer() *Server {
	return &Server{
		s: &http.Server{
			Addr: ":8080",
		},
		handlers: make(map[string]http.HandlerFunc),
	}
}

func (s *Server) RegisterHandler(path string, h http.HandlerFunc) {
	s.handlers[path] = h
}

func (s *Server) Start() {
	for path, handler := range s.handlers {
		http.HandleFunc(path, handler)
		log.Printf("Registered handler for path %s", path)
	}
	log.Printf("Server starting on %s", s.s.Addr)
	err := s.s.ListenAndServe()
	if err == http.ErrServerClosed {
		log.Printf("Server closed")
	}
}

// GETリクエストに対応する関数
func getCredentials(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(credentials)
}

// POSTリクエストに対応する関数
func addCredential(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	var newCredential handler.Credential
	if err := json.NewDecoder(r.Body).Decode(&newCredential); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	newCredential.Credential_ID = uuid.New().String()
	credentials = append(credentials, newCredential)
	json.NewEncoder(w).Encode(newCredential)
}

// CORS対応のためのエントリポイント関数
func handleCredentials(w http.ResponseWriter, r *http.Request) {
	// CORS設定
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// OPTIONSメソッドの処理（プリフライトリクエストに対応）
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		// w.WriteHeader(http.StatusNoContent)
		return
	}

	// メソッドによって異なる処理を実行
	switch r.Method {
	case "GET":
		getCredentials(w, r)
	case "POST":
		addCredential(w, r)
	// case http.MethodGet:
	// 	getCredentials(w, r)
	// case http.MethodPost:
	// 	addCredential(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func main() {
	db, err := gorm.Open(sqlite.Open("credential.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	// Migrate the schema
	db.AutoMigrate(&handler.Credential{})

	server := NewServer()
	server.RegisterHandler("/credentials", handleCredentials)
	server.RegisterHandler("/", handler.RootHandler)
	server.Start()

	// http.HandleFunc("/credentials", handleCredentials)
	fmt.Println("Server is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))

}
