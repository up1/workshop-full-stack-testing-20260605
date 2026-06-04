# Login API
Login API allows users to authenticate themselves and receive a token for subsequent requests.

## API Endpoint
* POST /api/login
## Request Body
```json
{
  "username": "string",
  "password": "string"
}
```
## Response
### Success (200 OK)
```json
{
  "token": "jwt_token_string"
}
```
### Failure (401 Unauthorized)
```json 
{
  "error": "Invalid username or password"
}
``` 
### Failure (400 Bad Request)
```json
{
  "error": "Username and password are required"
}
```
### Error (500 Internal Server Error)
```json
{
  "error": "An unexpected error occurred. Please try again later."
}
```

## Workflow
1. The client sends a POST request to the /api/login endpoint with the username and password in the request body.
2. The server validates the credentials against the database.
3. If the credentials are valid, the server generates a JWT token and returns it in the response.
4. If the credentials are invalid, the server returns a 401 Unauthorized error with an appropriate error message.
5. If the request body is missing required fields, the server returns a 400 Bad Request error with an appropriate error message.
6. If an unexpected error occurs during the login process, the server returns a 500 Internal Server Error with an appropriate error message.

## Security Considerations
- Ensure that the password is securely hashed and stored in the database.
- Use HTTPS to encrypt the communication between the client and server.
- Implement rate limiting to prevent brute-force attacks on the login endpoint.
- Consider implementing multi-factor authentication for added security.

## Test cases in table format
| Test Case ID | Description | Input | Expected Output |
|--------------|-------------|-------|-----------------|
| TC001 | Valid login | {"username": "validUser", "password": "validPassword"} | 200 OK, {"token": "jwt_token_string"} |
| TC002 | Invalid login | {"username": "invalidUser", "password": "invalidPassword"} | 401 Unauthorized, {"error": "Invalid username or password"} |
| TC003 | Missing fields | {"username": "validUser"} | 400 Bad Request, {"error": "Username and password are required"} |
| TC004 | Unexpected error | (Simulate server error) | 500 Internal Server Error, {"error": "An unexpected error occurred. Please try again later."} |  
| TC005 | Locked account when try login failed 3 times | {"username": "lockedUser", "password": "wrongPassword"} (3 times) | 401 Unauthorized, {"error": "Account locked due to multiple failed login attempts. Please try again later."} |

## Database Schema
The users table in the database should have the following schema:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  failed_login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMP
);
``` 
This schema includes fields for storing the username, hashed password, number of failed login attempts, and a timestamp for when the account is locked until (if applicable)

