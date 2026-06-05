using Microsoft.AspNetCore.Mvc;
using webmvc.Models;
using webmvc.Services;

namespace webmvc.Controllers;

public class AccountController : Controller
{
    private const string SessionUsernameKey = "Username";
    private const string SessionTokenKey = "Token";

    private readonly IAuthService _authService;

    public AccountController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpGet]
    public IActionResult Login() => View(new LoginViewModel());

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginViewModel model, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var result = await _authService.LoginAsync(model.Username!, model.Password!, cancellationToken);

        if (!result.Success)
        {
            ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Invalid username or password");
            return View(model);
        }

        HttpContext.Session.SetString(SessionUsernameKey, model.Username!);
        HttpContext.Session.SetString(SessionTokenKey, result.Token ?? string.Empty);

        return RedirectToAction(nameof(Dashboard));
    }

    [HttpGet]
    public IActionResult Dashboard()
    {
        var username = HttpContext.Session.GetString(SessionUsernameKey);
        if (string.IsNullOrEmpty(username))
        {
            return RedirectToAction(nameof(Login));
        }

        ViewData["Username"] = username;
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction(nameof(Login));
    }
}
