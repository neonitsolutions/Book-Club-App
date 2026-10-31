# Terraform: Readers Book Club on AWS

Everything the app runs on in AWS, as code. Three stacks share one set of modules:

| Stack | Creates | State key |
| --- | --- | --- |
| `bootstrap/` | S3 bucket for Terraform state (run once, local state) | local |
| `envs/shared/` | ECR repositories, Jenkins server and its VPC | `shared/terraform.tfstate` |
| `envs/staging/` | Full app environment, small and cheap (Fargate Spot, 1 NAT, 1 Redis node) | `staging/terraform.tfstate` |
| `envs/production/` | Full app environment, 2 of everything across 2 availability zones | `production/terraform.tfstate` |

`envs/staging/main.tf` and `envs/production/main.tf` are identical except for the
`settings` block at the top. Keep it that way: staging only proves something if it
matches production.

## Modules

| Module | What it creates |
| --- | --- |
| `network` | VPC, 2 public + 2 private subnets, NAT gateway(s), S3 gateway endpoint, security groups (internet → ALB → frontend/backend → Redis) |
| `ecr` | `readers-bookclub-frontend` and `readers-bookclub-backend`, scan on push, lifecycle policy (keep release versions, last 30 builds) |
| `alb` | Load balancer, ACM certificate, HTTP→HTTPS redirect, `/api/*` → backend, DNS record, WAF with a rate limit on `/api/auth/*` |
| `ecs` | Fargate cluster, task definitions, services `frontend` and `backend`, IAM roles, CPU autoscaling, ECS Service Connect (`http://backend:3001` inside the cluster) |
| `redis` | ElastiCache Redis with TLS and an auth token, failover when `node_count` ≥ 2 |
| `media` | Private S3 bucket (versioned, encrypted) + CloudFront with origin access control |
| `secrets` | `rbc/<env>/backend` (values you set by hand) and `rbc/<env>/redis` (generated) |
| `jenkins` | Ubuntu EC2 with Jenkins, Docker, Trivy, AWS CLI, Node 20, Caddy for HTTPS; IAM role for ECR/ECS; daily disk snapshots |
| `monitoring` | CloudWatch log groups, SNS topic + email, alarms for 5xx, unhealthy targets, CPU, memory, Redis memory |

## Before you start

- AWS CLI v2 logged in as an admin user (`aws sts get-caller-identity` works).
- Terraform 1.10 or newer.
- Your domain's DNS in a **Route 53 public hosted zone** (for example `example.com`).
- A MongoDB Atlas account. Atlas is not managed here; create the cluster in the Atlas console
  in the same AWS region.

## First-time setup

### 1. State bucket

```bash
cd infrastructure/terraform/bootstrap
terraform init
terraform apply
terraform output -raw backend_hcl > ../envs/backend.hcl
```

### 2. Shared: ECR and Jenkins

```bash
cd ../envs/shared
cp terraform.tfvars.example terraform.tfvars   # fill in domain and your IP
terraform init -backend-config=../backend.hcl
terraform apply
```

Then push a first image of each app, because the ECS services need something to start:

```bash
REGISTRY=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.eu-west-1.amazonaws.com
aws ecr get-login-password | docker login --username AWS --password-stdin $REGISTRY
docker build -t $REGISTRY/readers-bookclub-backend:latest  ../../../../apps/backend
docker build -t $REGISTRY/readers-bookclub-frontend:latest ../../../../apps/frontend
docker push $REGISTRY/readers-bookclub-backend:latest
docker push $REGISTRY/readers-bookclub-frontend:latest
```

Jenkins' first admin password (the server takes about 5 minutes to install everything):

```bash
aws ssm start-session --target $(terraform output -raw jenkins_instance_id)
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### 3. Staging (repeat the same steps for production)

```bash
cd ../staging
cp terraform.tfvars.example terraform.tfvars   # fill in domain and alarm email
terraform init -backend-config=../backend.hcl

# a) Network, Redis and the empty secrets first
terraform apply -target=module.network -target=module.secrets
terraform output nat_public_ips      # add these to Atlas -> Network Access
```

b) Put the database URL into the backend secret. Every key in `backend_secret_keys`
must be present, or the backend container will not start:

```bash
aws secretsmanager put-secret-value --secret-id rbc/staging/backend \
  --secret-string '{"MONGODB_URI":"mongodb+srv://user:password@cluster.mongodb.net/readers-bookclub"}'
```

c) Everything else:

```bash
terraform apply
terraform output app_url
```

Click the confirmation link AWS emails to `alarm_email`, or alarms will not arrive.

## Day-to-day

- **Code changes** never need Terraform: Jenkins builds images and runs
  `infrastructure/scripts/ecs-deploy.sh`.
- **Infrastructure changes**: edit, `terraform plan`, review, `terraform apply`. Do staging first.
- **Changed env vars, secrets list or CPU/memory?** `terraform apply` registers a new task
  definition revision, but the running service keeps the old one (Terraform ignores
  `task_definition` so it never undoes a Jenkins deploy). The next Jenkins deploy picks it up,
  because `ecs-deploy.sh` starts from the latest revision.
- **New secret** (e.g. `JWT_ACCESS_SECRET`): add it to the secret in Secrets Manager first,
  then to `backend_secret_keys`, then apply and deploy.
- **Rollback**: `aws ecs update-service --cluster rbc-production --service backend --task-definition rbc-production-backend:<older revision>`.

## Choices worth knowing

- **State locking** uses S3's native lock file (`use_lockfile`, Terraform 1.10+), so no DynamoDB table is needed.
- **Hand-set secrets never touch Terraform state**: Terraform creates the `rbc/<env>/backend`
  secret but never reads or writes its value.
- **MongoDB Atlas** connects over the internet with TLS from the NAT gateway IPs. VPC peering or
  PrivateLink can replace this later (Atlas M10+).
- **WAF** uses AWS's common rule set, which blocks request bodies over 8 KB. Media uploads go
  straight to S3 with pre-signed URLs, so they are not affected; a large JSON endpoint would be.
- **Region** defaults to `eu-west-1` (Ireland). Change `region` in every `terraform.tfvars`
  and in `backend.hcl` to use `af-south-1` (Cape Town) instead; Cape Town must be enabled in the
  AWS account first.

## Tearing down staging

```bash
cd envs/staging && terraform destroy
```

Production has deletion protection on the load balancer and a non-empty media bucket cannot be
deleted; both are on purpose.
