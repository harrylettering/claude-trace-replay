# Contributing to Claude Log Analyzer

Thanks for helping improve Claude Log Analyzer.

## Good First Contributions

- Add anonymized sample logs
- Improve README screenshots or documentation
- Fix parser edge cases for Claude Code JSONL entries
- Improve Agent Flow layout and animation behavior
- Add tests or validation cases for log parsing

## Local Development

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run build
```

If your change touches linted code, also run:

```bash
npm run lint
```

## Pull Request Guidelines

- Keep PRs focused on one feature or fix.
- Include screenshots or short recordings for visual changes.
- Describe the Claude Code log shape or sample scenario that motivated parser changes.
- Avoid committing private session logs, API keys, or personally identifiable data.

## Reporting Issues

When reporting a bug, please include:

- What you expected to happen
- What happened instead
- Browser and operating system
- Whether the issue happens with all logs or one specific log shape
- A sanitized sample log snippet when possible
