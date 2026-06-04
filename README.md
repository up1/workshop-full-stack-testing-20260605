# Workshop :: Full stack testing
* Frontend
* Backend


## Types of tests
* External testing
* Internal testing


## Create database with docker
```
$cd database
$docker compose up -d
$docker compose ps
```

Check data in docker container
```
$docker compose exec db psql -U myuser -d mydatabase
```

* `\l`list databases
* `\c mydatabase` connect to database
* `\dt` list tables
* `SELECT * FROM users;` query data from users table

## API testing with Go

Start Server
```
$cd backend/go
$go mod tidy
$go run .
```

Access http://localhost:3000

Testing with `go test`
* Unit test
* Integration test (with test container)
```
$go test ./... -v
```

Testing with postman and [newman](https://www.npmjs.com/package/newman)
```
$cd api-testing
$newman run login-api.postman_collection.json
```

## API testing with NestJS

Start Server
```
$cd backend/nestjs/login-api
$npm install
$npm run start
``` 
Access http://localhost:3000


Testing with `npm test` (unit tests)
```
$npm test
```

Testing with `npm run test:e2e` (e2e tests)
* Use Inmemory database for testing, no need to start the database container
```
$npm run test:e2e
```

Testing with Test container (with database)
```
$npx jest --config ./test/jest-e2e.json auth.container.e2e-spec.ts
```

Testing with postman and [newman](https://www.npmjs.com/package/newman)
```
$cd api-testing
$newman run login-api.postman_collection.json
```