using Microsoft.EntityFrameworkCore;
using webmvc.Data;
using webmvc.Models;

namespace webmvc.Services;

/// <summary>
/// Database-backed authentication that mirrors the backend login contract
/// (req_api.md): bcrypt password check plus account lockout after 3 failed
/// attempts for 15 minutes.
/// </summary>
public class DbAuthService : IAuthService
{
    public const int MaxFailedAttempts = 3;
    public static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(15);

    private const string InvalidCredentials = "Invalid username or password";
    private const string AccountLocked =
        "Account locked due to multiple failed login attempts. Please try again later.";

    private readonly ApplicationDbContext _db;
    private readonly ILogger<DbAuthService> _logger;
    private readonly TimeProvider _timeProvider;

    public DbAuthService(ApplicationDbContext db, ILogger<DbAuthService> logger, TimeProvider timeProvider)
    {
        _db = db;
        _logger = logger;
        _timeProvider = timeProvider;
    }

    public async Task<AuthResult> LoginAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
            if (user is null)
            {
                return AuthResult.Fail(InvalidCredentials);
            }

            var now = _timeProvider.GetUtcNow().UtcDateTime;
            if (user.IsLocked(now))
            {
                return AuthResult.Fail(AccountLocked);
            }

            if (BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                if (user.FailedLoginAttempts != 0 || user.AccountLockedUntil is not null)
                {
                    user.FailedLoginAttempts = 0;
                    user.AccountLockedUntil = null;
                    await _db.SaveChangesAsync(cancellationToken);
                }

                return AuthResult.Ok($"token-for-{user.Username}");
            }

            // Failed login: increment counter and lock when the threshold is reached.
            user.FailedLoginAttempts += 1;
            var locked = user.FailedLoginAttempts >= MaxFailedAttempts;
            if (locked)
            {
                user.AccountLockedUntil = now.Add(LockDuration);
            }

            await _db.SaveChangesAsync(cancellationToken);

            return AuthResult.Fail(locked ? AccountLocked : InvalidCredentials);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database login failed for user {Username}", username);
            return AuthResult.Fail(AuthService.GenericError);
        }
    }
}
