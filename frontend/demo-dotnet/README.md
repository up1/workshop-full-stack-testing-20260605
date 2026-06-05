# Instruction of .NET MVC project


## Initial setup .NET project
```
$dotnet new sln -n demo
$dotnet new mvc -n webmvc
$dotnet new xunit -n tests
$dotnet sln add webmvc/webmvc.csproj
$dotnet sln add tests/tests.csproj
$dotnet add tests reference webmvc/webmvc.csproj
```

Build and run the project to verify everything is set up correctly:

```
$dotnet run --project webmvc
```

Access to web application at `http://localhost:5217` (or the port specified in `launchSettings.json`).

Run tests to verify the test project is working:

```
$dotnet test
$dotnet test tests
```

## Initial setup Playwright
```
$cd playwright
$npm init playwright@latest
```

Run tests to verify Playwright is set up correctly:

```
$npx playwright test
```
