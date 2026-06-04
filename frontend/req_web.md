# Login feature


## User interface
The login page will be designed to be simple and user-friendly. It will include fields for theuser to enter their username and password, as well as a "Login" button to submit the credentials

## Components in User Interface in table format
| Component       | Description                                      | data-testid |
|-----------------|--------------------------------------------------|---------|
| Username Field  | Input field for the user to enter their username | username-field |
| Password Field  | Input field for the user to enter their password | password-field |
| Login Button    | Button to submit the login credentials           | login-button |

## Input Validation in table format
| Input Field | Validation Type | Error Message |
|-----------------|-----------------|---------------|
| Username Field  | Required        | Please enter your username |
| Password Field  | Required        | Please enter your password |

## Workflow
1. The user navigates to the login page.
2. The user enters their username and password in the respective fields.
3. The user clicks the "Login" button to submit the credentials.
4. The system validates the input fields to ensure they are not empty.
5. If any of the fields are empty, an error message is displayed prompting the user to fill in the required fields.
6. If both fields are filled, the system checks the credentials against the database.
7. If the credentials are valid, the user is logged in and redirected to the dashboard or home page.
8. If the credentials are invalid, an error message is displayed indicating that the username or password is incorrect, and the user is prompted to try again.


## Test cases in table format
| Test Case ID | Description | Input | Expected Output |
|--------------|-------------|-------|-----------------|
| TC001 | Valid login | Username: user1, Password: validPassword | User is logged in and redirected to the dashboard/home page |
| TC002 | Invalid login | Username: invalidUser, Password: invalidPassword | Error message: "Invalid username or password" is displayed |
| TC003 | Missing username | Username: (empty), Password: validPassword | Error message: "Please enter your username" is displayed |
| TC004 | Missing password | Username: validUser, Password: (empty) | Error message: "Please enter your password" is displayed |
| TC005 | Missing both fields | Username: (empty), Password: (empty) | Error messages: "Please enter your username" and "Please enter your password" are displayed |

## API Endpoint and read more about API testing in [req_api.md](./backend/req_api.md)
* POST http://localhost:3000/api/login
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