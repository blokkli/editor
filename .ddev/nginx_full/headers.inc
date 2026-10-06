# Response headers of the public servers (nginx-site.conf,
# plans/drupal-setup/10-access-and-guardrails.md). A location with its own
# add_header drops the server's, and must include this file again.
add_header Content-Security-Policy $blokkli_csp always;
add_header X-Robots-Tag "noindex, nofollow" always;
