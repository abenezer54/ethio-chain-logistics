package controller

import (
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"strconv"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/storage"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type AdminHandlers struct {
	auth  *usecase.AuthUsecase
	store storage.FileStore
}

func NewAdminHandlers(auth *usecase.AuthUsecase, store storage.FileStore) *AdminHandlers {
	return &AdminHandlers{auth: auth, store: store}
}

func (h *AdminHandlers) RegisterRoutes(v1 *gin.RouterGroup, jwtSecret string) {
	admin := v1.Group("/admin")
	admin.Use(RequireAuth(jwtSecret))
	admin.Use(RequireRole(domain.RoleAdmin))

	admin.GET("/pending-approvals", h.listPending)
	admin.GET("/users/:id/docs", h.listUserDocs)
	admin.GET("/docs/:docID/download", h.downloadDoc)
	admin.POST("/users/:id/approve", h.approveUser)
	admin.POST("/users/:id/deny", h.denyUser)
	admin.POST("/users/:id/request-info", h.requestInfo)
}

func (h *AdminHandlers) listPending(c *gin.Context) {
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	users, err := h.auth.ListPendingUsers(c.Request.Context(), limit)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": users})
}

func (h *AdminHandlers) listUserDocs(c *gin.Context) {
	userID := c.Param("id")
	docs, err := h.auth.ListUserDocs(c.Request.Context(), userID)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": docs})
}

func (h *AdminHandlers) downloadDoc(c *gin.Context) {
	docID := c.Param("docID")
	doc, err := h.auth.GetDoc(c.Request.Context(), docID)
	if err != nil {
		writeError(c, err)
		return
	}
	file, err := h.store.Open(c.Request.Context(), doc.StorageKey)
	if err != nil {
		msg := strings.ToLower(err.Error())
		if errors.Is(err, os.ErrNotExist) || strings.Contains(msg, "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	defer file.Close()
	c.Header("Content-Type", doc.ContentType)
	c.Header("Content-Disposition", `inline; filename="`+sanitizeFilename(doc.OriginalFileName)+`"`)
	_, _ = io.Copy(c.Writer, file)
}

func (h *AdminHandlers) approveUser(c *gin.Context) {
	userID := c.Param("id")
	adminID := currentUserID(c)
	if adminID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing auth context"})
		return
	}
	if err := h.auth.ApproveUser(c.Request.Context(), userID, adminID); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ACTIVE"})
}

func (h *AdminHandlers) denyUser(c *gin.Context) {
	userID := c.Param("id")
	adminID := currentUserID(c)
	if adminID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing auth context"})
		return
	}
	if err := h.auth.DenyUser(c.Request.Context(), userID, adminID); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "DENIED"})
}

func (h *AdminHandlers) requestInfo(c *gin.Context) {
	userID := c.Param("id")
	if err := h.auth.RequestInfo(c.Request.Context(), userID); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "INFO_REQUIRED"})
}

