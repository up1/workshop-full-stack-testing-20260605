using System.ComponentModel.DataAnnotations;

namespace webmvc.Models;

/// <summary>
/// User entity mapped to the "users" table (see database/schema.sql).
/// </summary>
public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    public int FailedLoginAttempts { get; set; }

    public DateTime? AccountLockedUntil { get; set; }

    /// <summary>Whether the account is currently locked at the given instant.</summary>
    public bool IsLocked(DateTime now) =>
        AccountLockedUntil.HasValue && AccountLockedUntil.Value > now;
}
