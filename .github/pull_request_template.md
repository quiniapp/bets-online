## Description
<!-- Describe your changes in detail -->

## Type of Change
<!-- Mark with an 'x' all that apply -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes, code improvements)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Dependency update

## Related Issue(s)
<!-- Link to related issues: Fixes #123, Closes #456 -->

## Changes Made
<!-- List the main changes made in this PR -->

-
-
-

## Testing Checklist
<!-- Mark with an 'x' all tests performed -->

### Backend Testing
- [ ] Unit tests pass (`pnpm --filter api test`)
- [ ] Type checking passes (`pnpm --filter api type-check`)
- [ ] Linting passes (`pnpm --filter api lint`)
- [ ] API endpoints tested manually
- [ ] Database migrations tested (if applicable)
- [ ] New endpoints documented in Swagger

### Frontend Testing
- [ ] Unit tests pass (`pnpm --filter web test`)
- [ ] Type checking passes (`pnpm --filter web type-check`)
- [ ] Linting passes (`pnpm --filter web lint`)
- [ ] UI tested in Chrome/Edge
- [ ] UI tested in Firefox (if UI changes)
- [ ] Mobile responsive tested (if UI changes)

### Integration Testing
- [ ] Tested locally with full stack running
- [ ] Tested authentication flows (if applicable)
- [ ] Tested error scenarios
- [ ] No console errors or warnings
- [ ] Performance tested (no significant slowdowns)

### Database
- [ ] Database migrations are reversible
- [ ] Seed data works correctly (if applicable)
- [ ] No breaking schema changes without migration path

## Screenshots / Videos
<!-- If applicable, add screenshots or screen recordings -->

## Deployment Notes
<!-- Any special deployment considerations? -->

- [ ] No special deployment steps needed
- [ ] Requires database migration
- [ ] Requires new environment variables
- [ ] Requires configuration changes
- [ ] Other (describe below):

## Reviewer Notes
<!-- Any specific areas you want reviewers to focus on? -->

## Post-Merge Tasks
<!-- Tasks to complete after merging -->

- [ ] Update documentation (if needed)
- [ ] Notify team of changes
- [ ] Monitor logs for errors
- [ ] Other:

---

**Checklist before requesting review:**
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No commented-out code or debug logs
- [ ] Branch is up to date with target branch
- [ ] All tests pass locally
