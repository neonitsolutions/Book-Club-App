# Sending account emails (sign-up verification) from the domain with AWS SES.
# DKIM signs every message with the domain's key; with DMARC, mail providers
# can tell it really comes from us, so it does not land in spam.
#
# New SES accounts are in the sandbox: they can only send to verified
# addresses. Request production access once (see README "Email").

data "aws_route53_zone" "email" {
  name = var.hosted_zone_name
}

resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.hosted_zone_name
}

# Easy DKIM always issues three tokens
resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.email.zone_id
  name    = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.hosted_zone_name}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

# p=none: report only, never reject. Tighten to quarantine once reports
# show all legitimate mail passes.
resource "aws_route53_record" "dmarc" {
  zone_id = data.aws_route53_zone.email.zone_id
  name    = "_dmarc.${var.hosted_zone_name}"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=none;"]
}
