using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using webmvc.Controllers;
using webmvc.Models;
using webmvc.Services;

namespace tests;

public class AccountControllerTests
{
    private static AccountController CreateController(IAuthService authService)
    {
        var controller = new AccountController(authService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { Session = new FakeSession() }
            }
        };
        return controller;
    }

    [Fact]
    public void Login_Get_ReturnsViewWithEmptyModel()
    {
        var controller = CreateController(Mock.Of<IAuthService>());

        var result = Assert.IsType<ViewResult>(controller.Login());

        var model = Assert.IsType<LoginViewModel>(result.Model);
        Assert.Null(model.Username);
        Assert.Null(model.Password);
    }

    // TC001 — valid login redirects to the dashboard and stores the session.
    [Fact]
    public async Task Login_Post_ValidCredentials_RedirectsToDashboard()
    {
        var authService = new Mock<IAuthService>();
        authService
            .Setup(s => s.LoginAsync("user1", "validPassword", It.IsAny<CancellationToken>()))
            .ReturnsAsync(AuthResult.Ok("jwt-token"));
        var controller = CreateController(authService.Object);
        var model = new LoginViewModel { Username = "user1", Password = "validPassword" };

        var result = await controller.Login(model, CancellationToken.None);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal(nameof(AccountController.Dashboard), redirect.ActionName);
        Assert.Equal("user1", controller.HttpContext.Session.GetString("Username"));
        Assert.Equal("jwt-token", controller.HttpContext.Session.GetString("Token"));
    }

    // TC002 — invalid credentials re-render the login view with the API error.
    [Fact]
    public async Task Login_Post_InvalidCredentials_ReturnsViewWithError()
    {
        var authService = new Mock<IAuthService>();
        authService
            .Setup(s => s.LoginAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AuthResult.Fail("Invalid username or password"));
        var controller = CreateController(authService.Object);
        var model = new LoginViewModel { Username = "bad", Password = "bad" };

        var result = await controller.Login(model, CancellationToken.None);

        Assert.IsType<ViewResult>(result);
        Assert.False(controller.ModelState.IsValid);
        Assert.Contains("Invalid username or password",
            controller.ModelState[string.Empty]!.Errors.Select(e => e.ErrorMessage));
    }

    // TC003/TC004/TC005 — missing fields short-circuit before calling the service.
    [Fact]
    public async Task Login_Post_InvalidModelState_ReturnsViewAndDoesNotCallService()
    {
        var authService = new Mock<IAuthService>();
        var controller = CreateController(authService.Object);
        controller.ModelState.AddModelError("Username", "Please enter your username");
        var model = new LoginViewModel { Username = null, Password = "x" };

        var result = await controller.Login(model, CancellationToken.None);

        var view = Assert.IsType<ViewResult>(result);
        Assert.Same(model, view.Model);
        authService.Verify(
            s => s.LoginAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // TC005 — account lockout message from the service is surfaced to the user.
    [Fact]
    public async Task Login_Post_LockedAccount_ReturnsViewWithLockoutMessage()
    {
        const string lockedMessage =
            "Account locked due to multiple failed login attempts. Please try again later.";
        var authService = new Mock<IAuthService>();
        authService
            .Setup(s => s.LoginAsync("lockedUser", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AuthResult.Fail(lockedMessage));
        var controller = CreateController(authService.Object);
        var model = new LoginViewModel { Username = "lockedUser", Password = "wrongPassword" };

        var result = await controller.Login(model, CancellationToken.None);

        Assert.IsType<ViewResult>(result);
        Assert.Contains(lockedMessage,
            controller.ModelState[string.Empty]!.Errors.Select(e => e.ErrorMessage));
    }

    [Fact]
    public void Dashboard_WithoutSession_RedirectsToLogin()
    {
        var controller = CreateController(Mock.Of<IAuthService>());

        var result = controller.Dashboard();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal(nameof(AccountController.Login), redirect.ActionName);
    }

    [Fact]
    public void Dashboard_WithSession_ReturnsView()
    {
        var controller = CreateController(Mock.Of<IAuthService>());
        controller.HttpContext.Session.SetString("Username", "user1");

        var result = controller.Dashboard();

        var view = Assert.IsType<ViewResult>(result);
        Assert.Equal("user1", view.ViewData["Username"]);
    }
}

