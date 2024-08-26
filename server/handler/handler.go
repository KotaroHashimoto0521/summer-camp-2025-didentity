package handler

import (
	"encoding/json"
	"log"
	"net/http"
)

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
	response := RootHandlerResponse{
		Message: "Hello, world!",
	}
	err := respondWithJSON(w, response)
	if err != nil {
		log.Printf("Failed to respond with JSON: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to respond with JSON")
	}
}
