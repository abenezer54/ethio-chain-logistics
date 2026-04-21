package controller

import (
	"errors"
	"net/http"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	ctxUserIDKey = "user_id"
	ctxRoleKey   = "user_role"
)

func RequireAuth(jwtSecret string) gin.HandlerFunc {
	secret := []byte(jwtSecret)
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if h == "" || !strings.HasPrefix(strings.ToLower(h), "bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			c.Abort()
			return
		}
		raw := strings.TrimSpace(h[len("Bearer "):])

		tok, err := jwt.Parse(raw, func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("unexpected signing method")
			}
			return secret, nil
		})
		if err != nil || tok == nil || !tok.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		claims, ok := tok.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			c.Abort()
			return
		}
		sub, _ := claims["sub"].(string)
		role, _ := claims["role"].(string)
		if sub == "" || role == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		c.Set(ctxUserIDKey, sub)
		c.Set(ctxRoleKey, role)
		c.Next()
	}
}

func RequireRole(required domain.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		r, ok := c.Get(ctxRoleKey)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing auth context"})
			c.Abort()
			return
		}
		rs, _ := r.(string)
		if domain.UserRole(rs) != required {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func currentUserID(c *gin.Context) string {
	v, _ := c.Get(ctxUserIDKey)
	s, _ := v.(string)
	return s
}

func currentUserRole(c *gin.Context) domain.UserRole {
	v, _ := c.Get(ctxRoleKey)
	s, _ := v.(string)
	return domain.UserRole(s)
}
