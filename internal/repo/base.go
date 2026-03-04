// Package repo provides data-access helpers shared across all repository types.
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
//
// Repository types embed Base to inherit the connection pool and share this
// convention. Example:
//
//	type SeminarRepo struct {
//	    repo.Base
//	}
//
//	func (r *SeminarRepo) GetByID(ctx context.Context, id, ownerSub string) (*domain.Seminar, error) {
//	    row := r.Pool.QueryRow(ctx,
//	        `SELECT ... FROM seminars WHERE id=$1 AND owner_sub=$2`, id, ownerSub)
//	    ...
//	}
package repo

import "github.com/jackc/pgx/v5/pgxpool"

// Base is embedded by all repository structs to provide shared DB access.
type Base struct {
	Pool *pgxpool.Pool
}
