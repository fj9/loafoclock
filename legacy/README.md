# Legacy: the first app

This folder holds the first version's UI and the logic that the new plan model will replace.
It is **not built or shipped**. It stays here for two reasons:

- **Reference:** the step instructions, the About, welcome and FAQ copy, and the working behaviour
  to port (milestones 5 and 6 of `docs/build-plan.md`).
- **Tests:** its tests still run (`npm test`), which shows the carried-over logic in `src/domain`
  behaves as before.

Delete each file once its replacement exists (see the milestones). The whole folder goes before launch.

Note: it is not runnable as it stands, because it imports helpers that have since moved or changed (for example `rememberChoices`).
