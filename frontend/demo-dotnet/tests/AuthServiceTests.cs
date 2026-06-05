using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using webmvc.Services;

namespace tests;

public class AuthServiceTests
{
    private static AuthService CreateService(HttpStatusCode statusCode, string json)
    {
        var handler = new StubHttpMessageHandler(statusCode, json);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:3000") };
        return new AuthService(httpClient, NullLogger<AuthService>.Instance);
    }

    // TC001 — backend returns a token.
    [Fact]
    public async Task LoginAsync_Success_ReturnsToken()
    {
        var service = CreateService(HttpStatusCode.OK, "{\"token\":\"jwt_token_string\"}");

        var result = await service.LoginAsync("user1", "validPassword");

        Assert.True(result.Success);
        Assert.Equal("jwt_token_string", result.Token);
    }

    // TC002 — 401 surfaces the backend error message.
    [Fact]
    public async Task LoginAsync_Unauthorized_ReturnsInvalidCredentialsMessage()
    {
        var service = CreateService(HttpStatusCode.Unauthorized,
            "{\"error\":\"Invalid username or password\"}");

        var result = await service.LoginAsync("bad", "bad");

        Assert.False(result.Success);
        Assert.Equal("Invalid username or password", result.ErrorMessage);
    }

    // TC003 — 400 surfaces the required-fields message.
    [Fact]
    public async Task LoginAsync_BadRequest_ReturnsRequiredFieldsMessage()
    {
        var service = CreateService(HttpStatusCode.BadRequest,
            "{\"error\":\"Username and password are required\"}");

        var result = await service.LoginAsync("user1", "");

        Assert.False(result.Success);
        Assert.Equal("Username and password are required", result.ErrorMessage);
    }

    // TC004 — 500 surfaces the generic error message.
    [Fact]
    public async Task LoginAsync_ServerError_ReturnsGenericMessage()
    {
        var service = CreateService(HttpStatusCode.InternalServerError,
            "{\"error\":\"An unexpected error occurred. Please try again later.\"}");

        var result = await service.LoginAsync("user1", "validPassword");

        Assert.False(result.Success);
        Assert.Equal("An unexpected error occurred. Please try again later.", result.ErrorMessage);
    }

    [Fact]
    public async Task LoginAsync_NetworkFailure_ReturnsGenericMessage()
    {
        var handler = new ThrowingHttpMessageHandler();
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:3000") };
        var service = new AuthService(httpClient, NullLogger<AuthService>.Instance);

        var result = await service.LoginAsync("user1", "validPassword");

        Assert.False(result.Success);
        Assert.Equal(AuthService.GenericError, result.ErrorMessage);
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _json;

        public StubHttpMessageHandler(HttpStatusCode statusCode, string json)
        {
            _statusCode = statusCode;
            _json = json;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_json, Encoding.UTF8, "application/json")
            });
        }
    }

    private sealed class ThrowingHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            throw new HttpRequestException("connection refused");
        }
    }
}
