# Security policy

## Supported versions

Until the first stable release, only the latest commit on `main` receives security fixes.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue
for an unpatched vulnerability or attach private audio files to a report.

Include the smallest synthetic reproducer possible, affected version, Node version, and observed
resource use. Never include credentials, access tokens, private media, or third-party provider URLs.

## Parser boundary

Audio input is untrusted. Consumers must set a file-size limit and should leave artwork disabled
unless needed. This package performs metadata inspection only; it does not provide malware scanning
or prove that another decoder can safely play the file.
