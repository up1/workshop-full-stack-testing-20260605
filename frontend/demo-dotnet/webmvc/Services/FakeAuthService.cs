using webmvc.Models;

namespace webmvc.Services;

/// <summary>
/// Deterministic in-memory auth used for local development and Playwright e2e tests,
/// so the UI can be exercised without the real backend running.
/// Enabled when configuration value "AuthApi:UseFake" is true.
/// </summary>
public class FakeAuthService : IAuthService
{
    private const string ValidUsername = "user1";
    private const string ValidPassword = "validPassword";
    private const string LockedUsername = "lockedUser";

    public Task<AuthResult> LoginAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        if (string.Equals(username, LockedUsername, StringComparison.Ordinal))
        {
            return Task.FromResult(AuthResult.Fail(
                "Account locked due to multiple failed login attempts. Please try again later."));
        }

        if (string.Equals(username, ValidUsername, StringComparison.Ordinal) &&
            string.Equals(password, ValidPassword, StringComparison.Ordinal))
        {
            return Task.FromResult(AuthResult.Ok("fake-jwt-token"));
        }

        return Task.FromResult(AuthResult.Fail("Invalid username or password"));
    }
}
