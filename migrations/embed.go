// Package migrations embeds all SQL migration files so the compiled binary
// is fully self-contained. golang-migrate reads them via source/iofs.
package migrations

import "embed"

// FS holds every *.sql file in this directory.
//
//go:embed *.sql
var FS embed.FS
