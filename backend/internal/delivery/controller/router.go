package controller

import (
	"net/http"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

// Router builds the Gin engine with API routes.
func Router(health *usecase.HealthUsecase, authHandlers *AuthHandlers, adminHandlers *AdminHandlers, jwtSecret string) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(RequestID())
	r.Use(CORS())

	r.GET("/health", func(c *gin.Context) {
		if !health.Live() {
			c.Status(http.StatusServiceUnavailable)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/ready", func(c *gin.Context) {
		if err := health.Ready(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready", "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	v1 := r.Group("/api/v1")
	{
		v1.GET("", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"service": "ethio-chain-logistics-api",
				"version": "0.1.0",
			})
		})

		if authHandlers != nil {
			authHandlers.RegisterRoutes(v1)
		}
		if adminHandlers != nil {
			adminHandlers.RegisterRoutes(v1, jwtSecret)
		}
	}

	return r
}
