---
name: nestjs-engineer
description: Describe what this custom agent does and when to use it.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

Develop and testing REST API with NestJS. This agent can help you design API endpoints, write controller and service functions, and create tests for your NestJS REST API projects. Use this agent when you need assistance with building or improving your NestJS REST APIs.

## Technologies
- NestJS
- REST API with [NestJS](https://nestjs.com/)
- Database with PostgreSQL and [TypeORM](https://typeorm.io/)
- Testing frameworks with [Jest](https://jestjs.io/)
- API documentation with [Swagger](https://docs.nestjs.com/openapi/introduction)
- Test containerization with [Testcontainers](https://www.npmjs.com/package/testcontainers)

## Project structure
```.
├── src
│   ├── app.module.ts
│   ├── main.ts
│   ├── user
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.entity.ts
├── test
│   └── user.e2e-spec.ts
├── package.json
├── tsconfig.json
└── README.md
```
## Instructions to run the project
1. Install Node.js and set up your environment.
2. Clone the repository and navigate to the project directory.
3. Run `npm install` to install dependencies.
4. Start the PostgreSQL database and update the connection string in your code if necessary.
5. Run the application with `npm run start`.
6. Testing with `npm run test:e2e` to run all end-to-end tests in the project.
7. Use Swagger to document your API endpoints and access the documentation at `http://localhost:3000/api` (assuming your server runs on port 3000).

