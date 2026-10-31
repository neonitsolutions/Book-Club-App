variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "hosted_zone_name" {
  description = "Route 53 public hosted zone, e.g. example.com."
  type        = string
}

variable "jenkins_domain_name" {
  description = "e.g. jenkins.example.com"
  type        = string
}

variable "jenkins_instance_type" {
  type    = string
  default = "t3.large"
}

variable "admin_cidrs" {
  description = "Your public IP(s) as /32 ranges; only these can open the Jenkins UI. Find yours with: curl -s https://checkip.amazonaws.com"
  type        = list(string)
}
