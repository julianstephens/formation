package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	// Server
	Port string
	Env  string // "development" | "production"

	// Postgres
	DatabaseURL string

	// Auth0
	Auth0Domain   string
	Auth0Audience string

	// OpenAI
	OpenAIAPIKey string
	OpenAIModel  string

	// SSE
	TimerTickSeconds int
}

// Load reads configuration from environment variables, returning an error
// if any required variable is missing.
func Load() (*Config, error) {
	cfg := &Config{
		Port:             getEnv("PORT", "8080"),
		Env:              getEnv("APP_ENV", "development"),
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		Auth0Domain:      os.Getenv("AUTH0_DOMAIN"),
		Auth0Audience:    os.Getenv("AUTH0_AUDIENCE"),
		OpenAIAPIKey:     os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:      getEnv("OPENAI_MODEL", "gpt-4o"),
		TimerTickSeconds: getEnv("TIMER_TICK_SECONDS", 2),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	required := map[string]string{
		"DATABASE_URL":   c.DatabaseURL,
		"AUTH0_DOMAIN":   c.Auth0Domain,
		"AUTH0_AUDIENCE": c.Auth0Audience,
		"OPENAI_API_KEY": c.OpenAIAPIKey,
	}

	var missing []string
	for k, v := range required {
		if v == "" {
			missing = append(missing, k)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	return nil
}

func getEnv[T any](key string, fallback T) T {
	if v := os.Getenv(key); v != "" {
		switch any(fallback).(type) {
		case string:
			return any(v).(T)
		case int:
			if i, err := strconv.Atoi(v); err == nil {
				return any(i).(T)
			}
		}
	}
	return fallback
}
