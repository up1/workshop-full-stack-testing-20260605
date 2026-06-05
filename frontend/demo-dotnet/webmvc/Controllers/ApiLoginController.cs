using Microsoft.AspNetCore.Mvc;
using webmvc.Models.Api;
using webmvc.Services;

namespace webmvc.Controllers;

/// <summary>
/// JSON login API described in backend/req_api.md.
/// POST /api/login -> 200 { token } | 400/401 { error }.
/// </summary>
[ApiController]
[Route("api/login")]
[Produces("application/json")]
public class ApiLoginController : ControllerBase
{
    private const string MissingFields = "Username and password are required";
    private const string InvalidCredentials = "Invalid username or password";

    private readonly IAuthService _authService;

    public ApiLoginController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(LoginApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginApiRequest request, CancellationToken cancellationToken)
    {
        if (request is null ||
            string.IsNullOrWhiteSpace(request.Username) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorApiResponse { Error = MissingFields });
        }

        var result = await _authService.LoginAsync(request.Username, request.Password, cancellationToken);

        if (result.Success)
        {
            return Ok(new LoginApiResponse { Token = result.Token ?? string.Empty });
        }

        return Unauthorized(new ErrorApiResponse { Error = result.ErrorMessage ?? InvalidCredentials });
    }
}
