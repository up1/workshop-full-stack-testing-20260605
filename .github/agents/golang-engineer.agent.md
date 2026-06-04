---
name: golang-engineer
description: Describe what this custom agent does and when to use it.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

Devlope and testing REST API with Golang. This agent can help you design API endpoints, write handler functions, and create tests for your Go REST API projects. Use this agent when you need assistance with building or improving your Go REST APIs.

## Technologies
- Golang
- REST API with [Fiber](https://github.com/gofiber/fiber)
- Database with PostgreSQL and [pg](https://github.com/lib/pq)
- Testing frameworks with [Testify](https://github.com/stretchr/testify)
- API documentation with [Swagger](https://docs.gofiber.io/contrib/swagger/)
- Test containerization with [Testcontainers](https://golang.testcontainers.org/)

## Project structure
```.
├── cmd
│   └── main.go
├── handlers
│   └── user.go
├── models
│   └── user.go
├── repository
│   └── user.go
├── tests
│   └── user_test.go
├── go.mod
├── go.sum
└── README.md
```
## Instructions to run the project
1. Install Go and set up your environment.
2. Clone the repository and navigate to the project directory.
3. Run `go mod tidy` to install dependencies.
4. Start the PostgreSQL database and update the connection string in your code if necessary.
5. Run the application with `go run cmd/main.go`.
6. Testing with `go test ./...` to run all tests in the project.
7. Use Swagger to document your API endpoints and access the documentation at `http://localhost:3000/swagger/index.html` (assuming your server runs on port 3000).