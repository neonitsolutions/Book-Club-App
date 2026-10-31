# Jenkins server setup (Amazon Linux on EC2)

How to prepare a fresh Amazon Linux EC2 instance to run the Jenkins pipeline: Docker, Docker Compose, and Jenkins.

Replace `<SERVER_IP>` with the instance's public IP address.

## Before you start: connect to the server

```bash
chmod 400 book-club-jenkins-server-key-pair.pem   # SSH refuses keys other users can read
ssh -i book-club-jenkins-server-key-pair.pem ec2-user@<SERVER_IP>
```

- The username is `ec2-user`, not the instance name shown in the AWS console.
- Don't use `sudo ssh`. It doesn't help, and it saves the host key to root's `known_hosts` instead of yours.
- Amazon Linux has no `apt`. Use `dnf` on Amazon Linux 2023, or `yum` on Amazon Linux 2.

## Step 1: Check the OS version

```bash
cat /etc/os-release | grep PRETTY_NAME
```

| Result | Package manager |
| --- | --- |
| Amazon Linux 2023 | `dnf` (as written below) |
| Amazon Linux 2 | Replace `dnf` with `yum` in every command |

## Step 2: Install Docker

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

The `usermod` line lets `ec2-user` run Docker without `sudo`. Log out (`exit`) and SSH back in for it to take effect, then check:

```bash
docker ps
```

## Step 3: Install Docker Compose

Amazon Linux doesn't package the Compose plugin, so install it manually:

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

## Step 4: Install Jenkins

```bash
sudo dnf install -y java-21-amazon-corretto
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/rpm-stable/jenkins.io-2026.key
sudo dnf install -y jenkins
sudo usermod -aG docker jenkins
sudo systemctl enable --now jenkins
```

Adding `jenkins` to the `docker` group lets pipeline jobs run `docker build` and `docker push`.

Get the initial admin password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Open `http://<SERVER_IP>:8080` in a browser and finish the setup wizard with that password.

## Step 5: Fit builds into 4 GB of memory

Needed on a `t3.medium`; harmless on bigger instances.

Add 4 GB of swap, so a memory spike during `next build` slows the build down instead of the kernel killing Jenkins:

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096   # Amazon Linux's XFS does not support fallocate for swap
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system
free -h   # the Swap line should show 4.0Gi
```

Run one build at a time:

```bash
sudo mkdir -p /var/lib/jenkins/init.groovy.d
sudo tee /var/lib/jenkins/init.groovy.d/executors.groovy > /dev/null <<'EOF'
import jenkins.model.Jenkins
Jenkins.get().setNumExecutors(1)
Jenkins.get().save()
EOF
sudo chown -R jenkins:jenkins /var/lib/jenkins/init.groovy.d
sudo systemctl restart jenkins
```

Check under **Manage Jenkins → Nodes → Built-In Node**: it should show 1 executor.

## Step 6: Install the tools the Jenkinsfile uses

Node.js 20 (lint and tests run on the server) and Trivy (security scans). The AWS CLI v2 is preinstalled on Amazon Linux.

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

sudo tee /etc/yum.repos.d/trivy.repo > /dev/null <<'EOF'
[trivy]
name=Trivy repository
baseurl=https://aquasecurity.github.io/trivy-repo/rpm/releases/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://aquasecurity.github.io/trivy-repo/rpm/public.key
EOF
sudo dnf install -y trivy

node --version && trivy --version && aws --version
```

## Step 7: Create the pipeline

1. Install plugins (**Manage Jenkins → Plugins**): *Pipeline*, *Git*, *GitHub Branch Source*, *Workspace Cleanup*. Most come with the suggested plugins.
2. Give the instance an IAM role with ECR push and ECS deploy permissions (the `jenkins` Terraform module has the exact policy).
3. Set the global environment variables (**Manage Jenkins → System → Global properties**): `AWS_REGION`, `STAGING_URL`, `PRODUCTION_URL`.
4. **New Item → Multibranch Pipeline**, add the GitHub repository as the branch source, and leave *Script Path* as `Jenkinsfile`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Permission denied (publickey)` on SSH | Use `ec2-user`, `chmod 400` the key, and confirm the instance's **Key pair name** in the EC2 console matches the `.pem` file |
| SSH connection hangs | The security group must allow inbound TCP 22 from your IP |
| Jenkins page doesn't load | The security group must allow inbound TCP 8080 from your IP |
| `permission denied ... docker.sock` in a Jenkins job | Run `sudo systemctl restart jenkins` after adding `jenkins` to the `docker` group |
