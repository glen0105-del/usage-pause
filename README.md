# usage-pause

A Claude Code mod that stops all model requests (main session and subagents) once a usage window (5-hour or 7-day) is full, so no extra credits are spent, and lets them through again when the window resets.

## Install

In a Claude Code terminal session:

```
/plugin install usage-pause --marketplace glen0105-del/usage-pause
```

From a shell:

```
claude plugin install usage-pause --marketplace glen0105-del/usage-pause
```

## Notes
- Blocked requests return errors, so agents stop rather than wait; re-prompt after the reset.
- The window that crosses the threshold lets one last request through.
- Threshold: `LIMIT` in `hooks/register.tsx` (default 99%).
