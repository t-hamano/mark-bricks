# Code signing policy

Release installers are currently unsigned on all platforms (Windows, macOS, Linux).

## Windows — SignPath Foundation (planned)

Status: Not yet applied. We plan to apply to the [SignPath Foundation](https://signpath.org) program.

Planned statement (required by the program, once approved):

> Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org)

Only artifacts built by this repository's CI ([`release-desktop.yml`](.github/workflows/release-desktop.yml)) will be submitted for signing.

## macOS

Planning to enroll in the Apple Developer Program (Developer ID + notarization).

## Linux

Unsigned, no committed timeline.

## Team roles (single-maintainer project)

-   Authors / Reviewers / Approvers: https://github.com/t-hamano
-   All external pull requests are reviewed, and each signing request is approved, by the maintainer.

## Distribution

-   https://github.com/t-hamano/mark-bricks/releases

## Privacy

This program will not transfer any information to other networked systems unless specifically requested by the user.
