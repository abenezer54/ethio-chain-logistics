package controller

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS enables a minimal dev-friendly CORS policy.
// It allows localhost frontends (e.g. :3000) to call the API from the browser.
func CORS() gin.HandlerFunc {
	allowed := map[string]struct{}{
		"http://localhost:3000":   {},
		"http://127.0.0.1:3000":   {},
		"http://localhost:3001":   {},
		"http://127.0.0.1:3001":   {},
		"http://localhost:5173":   {}, // common Vite port
		"http://127.0.0.1:5173":   {},
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allowed[origin]; ok || strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Vary", "Origin")
				c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
				c.Header("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Request-ID")
				c.Header("Access-Control-Max-Age", "600")
			}
		}

		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}

		c.Next()
	}
}

