using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using webmvc.Models.Api;

namespace tests;

/// <summary>
/// Integration tests for POST /api/login backed by the EF Core in-memory
/// database (see backend/req_api.md test cases TC001–TC005).
/// </summary>
public class ApiLoginIntegrationTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public ApiLoginIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
        _factory.SeedDatabase();
    }

    private HttpClient CreateClient() =>
        _factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });

    // TC001 — valid login returns 200 with a token.
    [Fact]
    public async Task Login_ValidCredentials_Returns200WithToken()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/login",
            new { username = "user1", password = "validPassword" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginApiResponse>();
        Assert.False(string.IsNullOrEmpty(body!.Token));
    }

    // TC002 — invalid credentials return 401 with the standard message.
    [Fact]
    public async Task Login_InvalidCredentials_Returns401()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/login",
            new { username = "user1", password = "wrongPassword" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorApiResponse>();
        Assert.Equal("Invalid username or password", body!.Error);
    }

    [Fact]
    public async Task Login_UnknownUser_Returns401()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/login",
            new { username = "ghost", password = "whatever" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorApiResponse>();
        Assert.Equal("Invalid username or password", body!.Error);
    }

    // TC003 — missing fields return 400 with the required-fields message.
    [Fact]
    public async Task Login_MissingPassword_Returns400()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/login",
            new { username = "user1" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorApiResponse>();
        Assert.Equal("Username and password are required", body!.Error);
    }

    [Fact]
    public async Task Login_EmptyBody_Returns400()
    {
        var client = CreateClient();

        var content = new StringContent("{}", Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/login", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorApiResponse>();
        Assert.Equal("Username and password are required", body!.Error);
    }

    // TC005 — three failed attempts lock the account and persist the lock to the DB.
    [Fact]
    public async Task Login_ThreeFailedAttempts_LocksAccount()
    {
        var client = CreateClient();

        // Attempts 1 and 2: still "invalid credentials".
        for (var i = 0; i < 2; i++)
        {
            var attempt = await client.PostAsJsonAsync("/api/login",
                new { username = "user1", password = "wrongPassword" });
            Assert.Equal(HttpStatusCode.Unauthorized, attempt.StatusCode);
            var attemptBody = await attempt.Content.ReadFromJsonAsync<ErrorApiResponse>();
            Assert.Equal("Invalid username or password", attemptBody!.Error);
        }

        // Attempt 3: account becomes locked.
        var locked = await client.PostAsJsonAsync("/api/login",
            new { username = "user1", password = "wrongPassword" });
        Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);
        var lockedBody = await locked.Content.ReadFromJsonAsync<ErrorApiResponse>();
        Assert.Equal(
            "Account locked due to multiple failed login attempts. Please try again later.",
            lockedBody!.Error);

        // The lock is persisted to the in-memory database.
        var user = _factory.GetUser("user1");
        Assert.NotNull(user);
        Assert.Equal(3, user!.FailedLoginAttempts);
        Assert.NotNull(user.AccountLockedUntil);

        // Even the correct password is rejected while locked.
        var afterLock = await client.PostAsJsonAsync("/api/login",
            new { username = "user1", password = "validPassword" });
        Assert.Equal(HttpStatusCode.Unauthorized, afterLock.StatusCode);
        var afterLockBody = await afterLock.Content.ReadFromJsonAsync<ErrorApiResponse>();
        Assert.Equal(
            "Account locked due to multiple failed login attempts. Please try again later.",
            afterLockBody!.Error);
    }
}
