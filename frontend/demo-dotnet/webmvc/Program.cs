using Microsoft.EntityFrameworkCore;
using webmvc.Data;
using webmvc.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Swagger / OpenAPI for the JSON login API (see backend/req_api.md).
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Return the API's own { error } body for invalid models instead of the
// default ProblemDetails 400 produced by [ApiController].
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

builder.Services.AddSingleton(TimeProvider.System);

// EF Core: PostgreSQL by default; integration tests swap in the in-memory provider.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=appdb;Username=postgres;Password=postgres";
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Session is used to keep the authenticated user's token after login.
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Authentication service selection:
//   AuthApi:UseFake     -> deterministic in-memory fake (no DB / external API)
//   AuthApi:UseDatabase -> authenticate against the EF Core database
//   otherwise           -> call the real backend login API over HTTP
if (builder.Configuration.GetValue<bool>("AuthApi:UseFake"))
{
    builder.Services.AddSingleton<IAuthService, FakeAuthService>();
}
else if (builder.Configuration.GetValue<bool>("AuthApi:UseDatabase"))
{
    builder.Services.AddScoped<IAuthService, DbAuthService>();
}
else
{
    var baseUrl = builder.Configuration["AuthApi:BaseUrl"] ?? "http://localhost:3000";
    builder.Services.AddHttpClient<IAuthService, AuthService>(client =>
    {
        client.BaseAddress = new Uri(baseUrl);
    });
}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
else
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseSession();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.MapControllers();

app.Run();

// Exposed so integration tests can host the app via WebApplicationFactory<Program>.
public partial class Program;
