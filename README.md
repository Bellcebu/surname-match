# surname-match

Tolerant surname matching against an official registry, extracted from a real production bug.

## Why this exists

A city marathon's registration form checked each person's ID number and surname against a ~111,000-person registry. Some people were rejected even though they typed their surname correctly. The cause: surname normalization split on apostrophes, spaces and hyphens and **discarded one-letter fragments**, so `D'ANGELO` became `ANGELO` and anyone typing `DANGELO` on a phone failed. The same happened with `SAN MARTIN` vs `SANMARTIN`.

This package is a standalone, rewritten version of the fixed matcher. It contains no registry data.

## Rules

A typed surname **matches** the registry when, after uppercasing and stripping accents:

| Rule | Example |
|---|---|
| Same words | `perez` ~ `PÉREZ` |
| Same letters, ignoring separators | `DANGELO` ~ `D'ANGELO`, `SANMARTIN` ~ `SAN MARTIN` |
| Only the first surname of a compound one | `GARCIA` ~ `GARCIA LOPEZ` |

It is **rejected** on typos (`PERES`), the second surname alone (`LOPEZ`), partial words (`GARCI`), or a particle alone (`SAN`, `DE LA`). A wrong surname is how a wrong ID number gets caught, so being tolerant must not mean accepting anything.

```ts
import { matchSurname } from "surname-match";

matchSurname("Dangelo", "D'ANGELO"); // { match: true, reason: "joined" }
matchSurname("PERES", "PEREZ");      // { match: false, reason: "mismatch" }
```

## Development

```bash
npm ci
npm run typecheck
npm test
```

CI runs typecheck and tests on every pull request, and branch protection on `main` requires that check to pass, so a change that breaks a test cannot be merged.

## What is deliberately not tested

- **Fuzzy matching (edit distance).** Not implemented, so not tested. Accepting `PERES` for `PEREZ` would also let a mistyped ID number through, which is the error the surname check exists to catch. Typos are rejected and logged for human review instead.
- **Every surname in the real registry.** That data is personal and stays out of the repo. The tests cover each *shape* that broke (apostrophe, space, hyphen, particles, accents, Ñ) instead of every instance of it.
- **The registration form and database.** This package is pure logic. The form, the rejection log and the review flow live in the application and are tested there.
