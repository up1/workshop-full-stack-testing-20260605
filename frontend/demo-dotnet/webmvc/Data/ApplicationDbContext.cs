using Microsoft.EntityFrameworkCore;
using webmvc.Models;

namespace webmvc.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasColumnName("id");
            entity.Property(u => u.Username).HasColumnName("username").HasMaxLength(255).IsRequired();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
            entity.Property(u => u.FailedLoginAttempts).HasColumnName("failed_login_attempts").HasDefaultValue(0);
            entity.Property(u => u.AccountLockedUntil).HasColumnName("account_locked_until");
        });
    }
}
