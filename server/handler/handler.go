package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Credential struct {
	gorm.Model
	Credential_ID string `json:credential_id`
	Subject       string `json:subject`
	Claim         string `json:claim`
	Issuer        string `json:issuer`
	Holder        string `json:holder`
	Start_Time    string `json:start_time`
	End_Time      string `json:end_time`
	// Code string `json:code`
	// Price         uint   `json:price`
}

type RootHandlerResponse struct {
	Message string `json:"message"`
}

func respondWithJSON(w http.ResponseWriter, response interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	return json.NewEncoder(w).Encode(response)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func RootHandler(w http.ResponseWriter, r *http.Request) {
	db, err := gorm.Open(sqlite.Open("credential.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&Credential{})

	// Create
	db.Create(&Credential{Credential_ID: "1", Subject: "D42", Claim: "claim", Issuer: "issuer", Holder: "holder", Start_Time: "start_time", End_Time: "end_time"})

	// Read
	var credential Credential
	// db.First(&product, 1)                 // IDが1のレコードを取得
	db.First(&credential, "Subject = ?", "D42") // find product with code D42

	// Update - update product's price to 200
	// db.Model(&credential).Update("Price", 200)
	// Update - update multiple fields
	db.Model(&credential).Updates(Credential{Subject: "F42"}) // non-zero fields
	db.Model(&credential).Updates(map[string]interface{}{"Subject": "F42"})

	var credentials []Credential
	db.Find(&credentials)
	// db.Where("1=1").Delete(&Credential{})
	respondWithJSON(w, credentials)

	// IDが1のレコードを削除

	for i := 0; i < len(credentials); i++ {
		fmt.Println(credentials[i])
	}

	// response := RootHandlerResponse{
	// 	Message: "Hello, world!",
	// }
	// err := respondWithJSON(w, response)
	// if err != nil {
	// 	log.Printf("Failed to respond with JSON: %v", err)
	// 	respondWithError(w, http.StatusInternalServerError, "Failed to respond with JSON")
	// }
}
