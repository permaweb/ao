# Defintion of Delivery

The Definition of Delivery or definition of done is provided to give developers
direction on what is required to deliver an issue. It also helps code
reviewers with what to review when reviewing an issue.

The three core concepts that all issues should contain for developers are:

1. Definition of the problem this issue solves
1. Acceptance criteria that demonstrates how to verify the submission addresses
   the issue
1. Technical documentation for the solution given

Some critical requirements for a definition of done:

1. Reliable automated tests on any logic delivered in the issue.

By using stratified design and clean architecture concepts we can cleanly
separate logic from side effects, this provides us the ability to write unit and
integration tests that delivery high effectiveness at a low implementation cost.

2. Technical Documentation explaining the usability of the feature.

Technical documentation is always difficult, but it is important to have clear
and concise documentation to help provide direction to others that may maintain
your code over time. Do not redundantly describe the what, but focus on
describing the why, or referencing the issue number that describes the why. If
it is an API change, create or update API information, leverage Typescript Types
or JSDocs to clearly define your inputs and outputs.

<!-- toc -->

- [Summary](#summary)

<!-- tocstop -->

## Summary

The definition of delivery is important but can be difficult to explicitly
define in a general purpose one size fits all description. Understanding the
issue type can help, but it still can vary. This abstract definition can help
and basically review towards the following spirit.

Does the code accomplish the issue?

Is there automated tests that reliably verify any logic added to the delivery?

Is there enough documentation to satisfy my future self (or someone else?) to
maintain this issue?
