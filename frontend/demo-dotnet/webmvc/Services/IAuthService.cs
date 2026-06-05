using webmvc.Models;

namespace webmvc.Services;

public interface IAuthService
{
    /// <summary>
    /// Authenticates the supplied credentials against the backend login API.
    /// </summary>
    Task<AuthResult> LoginAsync(string username, string password, CancellationToken cancellationToken = default);
}
