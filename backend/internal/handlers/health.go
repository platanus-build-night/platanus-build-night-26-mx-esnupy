package handlers

import (
	"encoding/json"
	"net/http"
)

// HealthHandler handles GET /health.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "priora"})
}
