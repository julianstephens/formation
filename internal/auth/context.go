package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type contextKey string

const ownerSubKey contextKey = "owner_sub"

// setOwnerSub stores the Auth0 sub in the Gin context. Called by JWTMiddleware.
func setOwnerSub(c *gin.Context, sub string) {
	c.Set(string(ownerSubKey), sub)
}

// OwnerSubFromCtx retrieves the authenticated user's Auth0 sub from the Gin
// context. Returns ("", false) if the value is absent (e.g. called outside an
// authenticated route or in tests that bypass the middleware).
func OwnerSubFromCtx(c *gin.Context) (string, bool) {
	v, ok := c.Get(string(ownerSubKey))
	if !ok {
		return "", false
	}
	sub, ok := v.(string)
	return sub, ok && sub != ""
}

// MustOwnerSub retrieves the sub and aborts with 401 if it is missing.
// Use this in handlers that are always behind JWTMiddleware.
func MustOwnerSub(c *gin.Context) (string, error) {
	sub, ok := OwnerSubFromCtx(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return "", errors.New("owner sub missing from context")
	}
	return sub, nil
}
