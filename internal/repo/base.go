// Package repo provides shared repository infrastructure and ownership enforcement.
//
// Ownership enforcement convention
// ─────────────────────────────────
// Every query method that returns user-owned rows MUST accept an ownerSub
// string and include it in the WHERE clause:
//
//	WHERE owner_sub = $N
//
// This prevents a compromised or forged token from reading another user's
// data even if an application-layer bug omits an explicit ownership check.
// The ownerSub value is always sourced from auth.MustOwnerSub(c), which is
// populated exclusively by the validated JWT middleware.
package repo

import (
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Base is embedded by all repository structs to provide shared DB access.
type Base struct {
	Pool *pgxpool.Pool
}

// ErrNotFound signals that the requested row does not exist or is not accessible
// to the requesting owner.
var ErrNotFound = errors.New("not found")
