package main

import (
	"log"
	"net/http"
	"summer-camp-2024-didentity/server/handler"
)

type Server struct {
	s        *http.Server
	handlers map[string]http.HandlerFunc
}

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

func main() {
	server := NewServer()
	server.RegisterHandler("/", handler.RootHandler)
	server.Start()
}
