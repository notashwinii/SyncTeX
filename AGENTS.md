# Repository Working Conventions

## Package Manager

- Use Bun for all work in `apps/web`.
- Do not add npm, pnpm, or Yarn lockfiles.
- Use the Bun version declared in `apps/web/package.json`.

## Git And Pull Requests

- Do not use roadmap milestone codes in branch names, commit messages, pull
  request titles, or pull request descriptions.
- Use descriptive names that state the affected area and behavior.
- Make small, incremental commits. Each commit should contain one coherent
  concern and pass the relevant checks before starting the next concern.
- Do not combine infrastructure, application behavior, tests, and
  documentation into one catch-all commit when they can be reviewed
  independently.
