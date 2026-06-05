using System.ComponentModel.DataAnnotations;

namespace webmvc.Models.Api;

/// <summary>Request body for POST /api/login.</summary>
public class LoginApiRequest
{
    [Required]
    public string? Username { get; set; }

    [Required]
    public string? Password { get; set; }
}

/// <summary>Successful login response (200 OK).</summary>
public class LoginApiResponse
{
    public string Token { get; set; } = string.Empty;
}

/// <summary>Error response (400/401/500).</summary>
public class ErrorApiResponse
{
    public string Error { get; set; } = string.Empty;
}
