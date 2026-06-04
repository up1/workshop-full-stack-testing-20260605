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

