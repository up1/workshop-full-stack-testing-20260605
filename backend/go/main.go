package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"demo/internal/handler"
	"demo/internal/repository"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	_ "github.com/lib/pq"
)

func main() {
	db, err := connectDB()
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	app := NewApp(db)

	port := getenv("PORT", "3000")
	log.Printf("server listening on :%s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// NewApp wires the Fiber app with its routes and dependencies.
func NewApp(db *sql.DB) *fiber.App {
	app := fiber.New()

	// Enable CORS for all origins in fiber v3. In production, you may want to restrict this to specific origins.
	app.Use(cors.New())

	repo := repository.NewPostgresUserRepository(db)
	loginHandler := handler.NewLoginHandler(repo, getenv("JWT_SECRET", "dev-secret-change-me"))

	api := app.Group("/api")
	api.Post("/login", loginHandler.Login)

	return app
}

func connectDB() (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getenv("DB_HOST", "localhost"),
		getenv("DB_PORT", "5432"),
		getenv("DB_USER", "myuser"),
		getenv("DB_PASSWORD", "mypassword"),
		getenv("DB_NAME", "mydatabase"),
		getenv("DB_SSLMODE", "disable"),
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
