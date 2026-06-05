namespace tests;

/// <summary>
/// Minimal controllable <see cref="TimeProvider"/> for tests so account-lockout
/// time windows are deterministic.
/// </summary>
public class FakeTimeProvider : TimeProvider
{
    private DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset start) => _now = start;

    public override DateTimeOffset GetUtcNow() => _now;

    public void Advance(TimeSpan delta) => _now = _now.Add(delta);
}
