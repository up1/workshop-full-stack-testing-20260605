using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using webmvc.Data;
using webmvc.Models;
using webmvc.Services;

namespace tests;

/// <summary>
/// Boots the real MVC app for integration tests but replaces the PostgreSQL
/// DbContext with the EF Core in-memory provider and forces database-backed
/// authentication. Each factory instance gets an isolated in-memory database.
/// </summary>
public class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"login-tests-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Use the database-backed IAuthService (not the HTTP backend or fake).
        builder.UseSetting("AuthApi:UseFake", "false");
        builder.UseSetting("AuthApi:UseDatabase", "true");
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Remove the application's DbContext/Npgsql registrations so the
            // in-memory provider is the only EF provider in the container.
            var toRemove = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                d.ServiceType == typeof(DbContextOptions) ||
                d.ServiceType == typeof(ApplicationDbContext) ||
                (d.ServiceType.FullName?.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal) ?? false) ||
                (d.ImplementationType?.FullName?.Contains("Npgsql", StringComparison.Ordinal) ?? false))
                .ToList();
            foreach (var descriptor in toRemove)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));

            // Deterministic clock so lockout windows are testable.
            services.AddSingleton<TimeProvider>(new FakeTimeProvider(
                new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero)));
        });
    }

    /// <summary>Resets the database and seeds the default user1 account.</summary>
    public void SeedDatabase()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();

        db.Users.Add(new User
        {
            Username = "user1",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("validPassword"),
            FailedLoginAttempts = 0,
            AccountLockedUntil = null,
        });
        db.SaveChanges();
    }

    public User? GetUser(string username)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return db.Users.AsNoTracking().FirstOrDefault(u => u.Username == username);
    }
}
