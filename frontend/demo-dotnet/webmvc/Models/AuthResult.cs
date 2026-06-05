namespace webmvc.Models;

/// <summary>
/// Outcome of an authentication attempt returned by <see cref="webmvc.Services.IAuthService"/>.
/// </summary>
public class AuthResult
{
    public bool Success { get; init; }

    /// <summary>JWT token returned by the backend on a successful login.</summary>
    public string? Token { get; init; }

    /// <summary>User facing error message when <see cref="Success"/> is false.</summary>
    public string? ErrorMessage { get; init; }

    public static AuthResult Ok(string token) => new() { Success = true, Token = token };

    public static AuthResult Fail(string message) => new() { Success = false, ErrorMessage = message };
}
