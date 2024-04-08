# Contributing

Thank you for checking out the contribution guide for the `ao` Project. We want
to make it as easy as possible to contribute to this project.

<!-- toc -->

- [What you need to know?](#what-you-need-to-know)
  - [Getting Started](#getting-started)
  - [Functional Thinking](#functional-thinking)
  - [Solve The Problem, Not The Solution](#solve-the-problem-not-the-solution)
  - [Dependencies](#dependencies)
  - [Commit Messages](#commit-messages)
- [Grab an Issue and Do the Work](#grab-an-issue-and-do-the-work)
- [What is The Definition of Delivery aka DoD?](#what-is-the-definition-of-delivery-aka-dod)
  - [Documentation](#documentation)
  - [Feature Flags](#feature-flags)
  - [Automated Tests](#automated-tests)
  - [Pull Requests](#pull-requests)
    - [A note on Code Reviews](#a-note-on-code-reviews)
    - [A note on Merging](#a-note-on-merging)
- [No Estimates, No SCRUM, No Meetings](#no-estimates-no-scrum-no-meetings)
- [Have fun](#have-fun)
- [Proposals](#proposals)

<!-- tocstop -->

## What you need to know?

The `ao` Project is a monorepo that contains multiple packages. Depending on the
package, you'll need to be the familiar with the tech therein. Generally
speaking, you'll need to be familiar with JavaScript, Node, and in specific
instances, tools like Deno, Lua, and Docker.

Here are some topics and resources you should consider reviewing before
contributing.

### Getting Started

The `ao` repo uses `npm` and `node` to install and execute top level, repo-wide, tooling. So first, you should run `npm i` at the root to install those dependencies. This will set up git hooks that will help ensure you're following some of the guidelines outlined in this document:

- All JavaScript projects in the repo follow [`standard` style](https://standardjs.com/)
- All Commit Messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- All Markdown files should contain a Table of Contents

Once you've install the top level tooling, each of these conventions are enforced, via git a commit hook, automatically.

### Functional Thinking

[Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).
Separate business logic from side-effects and services.

[Stratified design](https://ericnormand.me/podcast/more-about-stratified-design),
lifting business logic from imperative constructs for better management of code
base.

> A great post on
> [layers](https://medium.com/clean-code-development/stratified-design-over-layered-design-125727c7e15)
> W.R.T Stratified Design

### Solve The Problem, Not The Solution

Properly define the problem being solved, without lending itself to any one
particular solution.

Be willing to Spike, build, and throw away! Pursue proof-of-concepts (PoCs) on
multiple solutions to objectively determine the best solution for the problem.
Then constantly re-evaluate whether that solution continues to be the right one.

> If a solution is no longer wieldly for a given problem, take a step back and
> decide whether it's still the right solution. Are you solving the problem, or
> are you solving the solution?

### Dependencies

Dependencies are constraints. Therefore, external dependencies should be
scrutinized, vetted and have a specific purpose. A developer should consider
whether a dependency is strictly needed before adding it to the project.

> Across teams/projects/layers, each may use different tools, but each
> team/project/layer should be consistent _in and of itself_.

Lean towards dependencies that implement specifications ie.
[Web Standards](https://developer.mozilla.org/en-US/docs/Glossary/Web_standards)
or [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

Some examples of this:

- either `axios` or `fetch` in a single layer, never both. Then prefer `fetch`
  because it's a Web Standard :)
- either `ramda` or `lodash`, in a single project, never both
- either `Tailwind` or `Tachyons`, in a single project, never both
- In a PR, describe the added dependencies, what each of them do, and why they
  were chosen.

### Commit Messages

Well-written commit messages are essential for maintaining a clear project
history and making it easy for team members to understand the changes made in
each commit. Follow these guidelines to write effective commit messages:

1. **Follow the Conventional Commits specification** - See
   [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for
   more information.

> There is a git hook that will run to ensure your commit message follows Conventional Commits style

2. **Reference the related issue** - Commit messages should reference the issue
   they are addressing. For example, "feat(web): add ghost button #123".

3. **Address the changes made** - Commit messages should describe the changes
   made in the commit. For example, "refactor(web): remove unused imports #123"
   ✅ not "refactor(web): changes based on feedback #123" ❌

4. **Use the imperative mood** - in the subject line. This means using verbs
   like "Add", "Fix", "Update", etc., as if you are giving an order. This helps
   keep the subject line short and consistent while also making it easier to
   understand the changelog in the future.

## Grab an Issue and Do the Work

Ok, you reviewed a GitHub Issue and would like to work on it. Assign it to your
github handle and proceed to work on the issue.

Once you have completed the issue and are ready to deliver it, review the
[DoD](#what-is-the-definition-of-delivery-aka-dod) and make sure you check all
the boxes. Finally publish it to github as a pull request.

## What is The Definition of Delivery aka DoD?

The [DoD (Defintion of Delivery)](./DOD.md) defines what a developer needs to
deliver in order for the code to be shipped and considered "done".

As a developer on the project, you should use the DoD as checklist to determine
whether you've completed all of the work expected, when pushing out new code.

As a reviewer on the project, you should use the DoD as a checklist to determine
if the pull request contains all of the requirements for shipping.

Here are some things that should be considered as part of considering your issue
"done"

### Documentation

All APIs should be documented.

All systems should have up-to-date diagrams.

All data models should have descriptive constraints, and well-defined error
messages

Commit Messages should be well formed and consistent. Read more
[here](#commit-messages)

Pull Requests should describe the changes it contains. Read more
[here](#pull-requests)

Projects should have a README describing how to start working on project.

> Tools like Gitpod codify onboarding, making that lift event easier.

In code, use in-line comments to describe the WHY for a piece of code and then
potentially the WHAT, if it is not clear. Especially with external dependencies,
since we don't have control over them, this is a potential hot spot for esoteric
code. It is a good idea to leave comments describing 3rd party constraints,
integrations, and quirks.

### Feature Flags

Feature Flags should drive change management for continuous delivery, _NOT_
deployment. At first, this may be simple, cross-feature, per environment feature
flags stored in source control. Over time, this may become more granular,
perhaps at the user, or entity level. Therefore, build an API that supports that
use case for sourcing feature flags.

### Automated Tests

Leverage dependency injection and separating side-effects from business logic,
to enable unit and integration tests to focus on business logic, without
depending on services running. The result is fast tests that focus on the
application's business logic.

Write tests that efficient and effective. Write tests according to the
interface, not the implementation. Though you may mock or stub internal
dependencies to produce different outputs. A good test should not need to change
if API does not change or if the branching doesn't change.

> TBD: Training should be mandated for developers, so that they understand how
> to write good tests. training resource for writing good tests

Generally, for a given api, the number of tests exercising that api should grow
w.r.t:

- Number of different inputs
- Number of different outputs
- Branches

For example, consider two apis that have 10 lines and 1000 lines respectively.
Each has one input and one output and no branches. Then each should have roughly
the same amount of tests, regardless of line count, because their API surface
size is the same.

### Pull Requests

We use short lived Github Pull Requests to push changes into our trunk branch.
As the Developer that opened the PR, you are responsible for getting it merged.
This includes:

- Adding the appropriate reviewers (if you're unsure, get a review)
- Making any changes as a result of the review feedback
- Ensuring all PR checks pass:
  - Lint
  - Build
  - Test
  - Deploy
  - etc.
- Resolving any merge conflicts
- Merging the PR into trunk
- **Delete the feature branch if it no longer in use**

#### A note on Code Reviews

We use automation and shorted-lived branches to continuously ship code into our
main branch, and into production. As a developer, you should always make sure
your changes pass the automated checks. **Do not ignore these checks**.

> The `main` branch ought to always be in a realaseable state

> If you think there could another automated check that isn't currently there,
> consider submitting a PR that adds a Github Workflow or amending an existing
> one. Generally, there should one Github Workflow file per project in the
> monorepo.

However, there are cases where we may want to get a second pair of eyes on our
code. In this case, you should request a code review.

A code review allows another developer on the team to review your work to
ensure:

- That it satisfies the Acceptance Criteria
- That the code structure is in line with project conventions
- That the changes won't cause a regression, which means that it would break
  something that was previously working

Here are some Rules of Thumb for when you might want to request a review:

1. If you've made changes in an area of the code you're not as familiar with.
   This is a great opportunity to add documentation/comments for the next
   person.
2. If you're implementing part of a design that was agreed upon by a group of
   developers on the team. Having a second set of eyes helps ensure the
   implementation stays true to the intent of the design
3. If you've made changes to an integral part of the stack ie. an environment
   variable, a fundamental model (like `mu`)
4. If you've updated a dependency to a new MAJOR version (see
   [SemVer](https://semver.org/)). This could contain breaking changes, that a
   reviewer may be able to check for.
5. If you've made a change in a legacy part of the code base
6. If you're **removing** code or functionality, especially if it publicly
   exposed ie. an endpoint on a server

If you open a PR, **it is your responsibility to request reviews from the team,
if you need a review.**. Inversely, as the developer being requested to provide
a review, **it is your responsibility to review the code in a timely manner, or
to let the other developer know if you can't review it right away**. In the
latter case, the developer requesting the review should speak LOUDLY that they
are BLOCKED until they get a review on their code.

#### A note on Merging

When merging into trunk branch, prefer "Rebase and Merge" over "Merge with Merge
Commit". This creates a more linear history on trunk, which is much easier to
read, and to understand how the codebase has evolved over time.

> **Merge commits should be _rare_**, and should only be needed when two
> developers edit the same lines, in the same file, from the same common
> ancestor. If this is the case, then a merge commit is appropriate. Otherwise,
> **prefer rebasing your feature branch onto trunk** rather than a merge commit.
> This produces more useful, and less cluttered, Git history.

> **NEVER** rebase a public branch ie. `main`

You own your code, and are responsible for getting it merged. Once the checks
pass, and you've received any reviews you solicited, you should merge your code
into trunk.

> If you are nervous about merging your code, then there is a good chance that
> too many things are happening in your PR. Try to break your PR into smaller,
> more bite sized pieces, and get those merged into trunk. Remember, you can
> always ask for help from your team mates

## No Estimates, No SCRUM, No Meetings

The purpose of a frictionless process is to do everything in an Asynchronous
way.

It ought to be the exception to have to formally meet, but Ad-Hoc Huddles are
Pair-Programming are encouraged

We should never have to estimate issues (looking at you SCRUM folks...).
Instead, you can look at the issues to view the state of the Project.

Each issue should be focused and should not take more than three business days
to complete. The sweet spot for duration of an issue is 1 day.

## Have fun

This is a community driven product so most importantly lets have fun. Lets work
in a way where we ship high quality code, but have a lot of fun doing it!

## Proposals

Contributing should always be a discussion, we should be open to change and
embrace better options, but we also should debate recommendations and be
skeptical of change for changes sake.
