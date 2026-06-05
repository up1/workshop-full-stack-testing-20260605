using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using webmvc.Models;

namespace webmvc.Services;

/// <summary>
/// Calls the backend login API (POST {BaseUrl}/api/login) described in req_api.md.
/// </summary>
public class AuthService : IAuthService
{
    public const string GenericError = "An unexpected error occurred. Please try again later.";

    private readonly HttpClient _httpClient;
    private readonly ILogger<AuthService> _logger;

    public AuthService(HttpClient httpClient, ILogger<AuthService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<AuthResult> LoginAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(
                "/api/login",
                new LoginApiRequest(username, password),
                cancellationToken);

            var body = await response.Content.ReadFromJsonAsync<LoginApiResponse>(cancellationToken);

            if (response.IsSuccessStatusCode && !string.IsNullOrEmpty(body?.Token))
            {
                return AuthResult.Ok(body!.Token!);
            }

            // The backend returns a user-friendly message in the "error" field.
            var message = body?.Error;
            if (string.IsNullOrWhiteSpace(message))
            {
                message = response.StatusCode == HttpStatusCode.Unauthorized
                    ? "Invalid username or password"
                    : GenericError;
            }

            return AuthResult.Fail(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login request to backend failed");
            return AuthResult.Fail(GenericError);
        }
    }

    private sealed record LoginApiRequest(
        [property: JsonPropertyName("username")] string Username,
        [property: JsonPropertyName("password")] string Password);

    private sealed record LoginApiResponse(
        [property: JsonPropertyName("token")] string? Token,
        [property: JsonPropertyName("error")] string? Error);
}
